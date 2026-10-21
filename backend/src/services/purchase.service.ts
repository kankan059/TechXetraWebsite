import { AppError } from '../common/errors'
import { generateId } from '../common/utils'
import { executeBatch, guardUnless, guardWhen, guardVerifyRow } from '../db/batch'
import { createAuditStatement } from './audit.service'
import { getAllSettings } from './settings.service'
import { validateTeamForPurchase } from './team.service'
import type {
  Purchase,
  PurchaseItem,
  Registration,
  User,
  Event,
  ItemType,
  PriceTier,
} from '../types'
import type { CloudflareBindings } from '../types/env'

export const DEFAULT_PURCHASE_RESERVATION_TTL_MS = 15 * 60 * 1000 // 15 minutes

export interface PurchaseItemInput {
  item_type: ItemType
  event_id?: string
  team_id?: string
}

export interface CreatePurchaseInput {
  items: PurchaseItemInput[]
  acknowledge_student_id_policy?: boolean
  idempotency_key?: string
}

export interface DetailedPurchase extends Purchase {
  items: PurchaseItem[]
  registrations: Registration[]
}

function qualifiesForStudentTier(user: { is_student: number; institution_id?: string | null }): boolean {
  return user.is_student === 1 && Boolean(user.institution_id && user.institution_id.trim().length > 0)
}

export async function getPurchaseById(
  db: D1Database,
  purchaseId: string
): Promise<DetailedPurchase | null> {
  const purchase = await db
    .prepare('SELECT * FROM purchases WHERE id = ?')
    .bind(purchaseId)
    .first<Purchase>()

  if (!purchase) return null

  const items = await db
    .prepare('SELECT * FROM purchase_items WHERE purchase_id = ?')
    .bind(purchaseId)
    .all<PurchaseItem>()

  const registrations = await db
    .prepare(
      `SELECT r.* FROM registrations r
       JOIN purchase_items pi ON r.id = pi.registration_id
       WHERE pi.purchase_id = ?`
    )
    .bind(purchaseId)
    .all<Registration>()

  return {
    ...purchase,
    items: items.results || [],
    registrations: registrations.results || [],
  }
}

export async function getUserPurchases(
  db: D1Database,
  userId: string
): Promise<DetailedPurchase[]> {
  const purchases = await db
    .prepare('SELECT * FROM purchases WHERE buyer_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<Purchase>()

  const list: DetailedPurchase[] = []
  for (const p of purchases.results || []) {
    const detailed = await getPurchaseById(db, p.id)
    if (detailed) list.push(detailed)
  }
  return list
}

export async function createPurchase(
  db: D1Database,
  buyer: User,
  input: CreatePurchaseInput,
  env: CloudflareBindings,
  meta?: { ipAddress?: string; userAgent?: string; now?: number; requestHash?: string }
): Promise<DetailedPurchase> {
  const now = meta?.now || Date.now()
  const ttlMs = Number(env.PURCHASE_RESERVATION_TTL_MS) || DEFAULT_PURCHASE_RESERVATION_TTL_MS

  // 1. Check purchases_enabled setting
  const settings = await getAllSettings(db)
  if (!settings.purchases_enabled) {
    throw new AppError(400, 'BAD_REQUEST', 'Ticket purchases are currently disabled by administration')
  }

  // 2. Profile completion gate
  if (!buyer.profile_completed_at) {
    throw new AppError(403, 'PROFILE_INCOMPLETE', 'You must complete your profile before making purchases')
  }

  // 3. Item count limits
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'At least one item must be selected for purchase')
  }

  if (input.items.length > 10) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A single purchase cannot contain more than 10 items')
  }

  // Clean up any expired AWAITING_PAYMENT purchases for this buyer
  const priorPurchases = await getUserPurchases(db, buyer.id)
  for (const p of priorPurchases) {
    if (p.status === 'AWAITING_PAYMENT' && p.reservation_expires_at && p.reservation_expires_at <= now) {
      try {
        await releasePurchase(db, p.id, 'EXPIRED', 'Reservation window expired', buyer, meta)
      } catch {
        // ignore if already released or concurrent update
      }
    }
  }

  // 4. Open purchase limit (max 3 open purchases per buyer)
  const openCountRow = await db
    .prepare(
      "SELECT count(*) as count FROM purchases WHERE buyer_id = ? AND status IN ('AWAITING_PAYMENT', 'PENDING_VERIFICATION')"
    )
    .bind(buyer.id)
    .first<{ count: number }>()

  if (openCountRow && openCountRow.count >= 3) {
    throw new AppError(
      409,
      'CONFLICT',
      'You already have 3 open purchases. Please complete or cancel existing purchases before creating a new one.'
    )
  }

  // 5. Natural Idempotency check:
  // If the user already has an active AWAITING_PAYMENT purchase with the exact same items, return it!
  const openPurchases = await getUserPurchases(db, buyer.id)
  const existingAwaiting = openPurchases.find(
    (p) => p.status === 'AWAITING_PAYMENT' && (!p.reservation_expires_at || p.reservation_expires_at > now)
  )
  if (existingAwaiting) {
    const isSameGate =
      Boolean(input.items.find((i) => i.item_type === 'GATE_PASS')) ===
      Boolean(existingAwaiting.items.find((i) => i.item_type === 'GATE_PASS'))

    const requestedEventIds = input.items
      .filter((i) => i.item_type === 'EVENT_PASS')
      .map((i) => i.event_id)
      .sort()
    const existingEventIds = existingAwaiting.items
      .filter((i) => i.item_type === 'EVENT_PASS')
      .map((i) => i.event_id)
      .sort()

    if (isSameGate && JSON.stringify(requestedEventIds) === JSON.stringify(existingEventIds)) {
      return existingAwaiting
    }
  }

  // 6. Compute pricing and validate item rules
  interface PlannedItem {
    id: string
    item_type: ItemType
    event_id: string | null
    team_id: string | null
    beneficiary: User
    tier: PriceTier
    unit_price_paise: number
    registration_id: string | null
  }

  interface PlannedRegistration {
    id: string
    event_id: string
    team_id: string | null
    participant_id: string
    seat_count: number
  }

  interface EventSeatIncrement {
    event_id: string
    seats: number
  }

  const plannedItems: PlannedItem[] = []
  const plannedRegistrations: PlannedRegistration[] = []
  const seatIncrements: EventSeatIncrement[] = []
  const teamsToLock: string[] = []

  let totalAmountPaise = 0
  let requiresStudentPolicy = false
  const seenEventIds = new Set<string>()
  let hasGatePass = false

  for (const itemInput of input.items) {
    if (itemInput.item_type === 'GATE_PASS') {
      if (hasGatePass) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Only one gate pass may be purchased per order')
      }
      hasGatePass = true

      // Gate pass is for buyer only
      const isStudent = qualifiesForStudentTier(buyer)
      const tier: PriceTier = isStudent ? 'STUDENT' : 'GENERAL'
      const price = isStudent
        ? settings.gate_pass_student_price_paise
        : settings.gate_pass_price_paise

      if (isStudent) requiresStudentPolicy = true
      totalAmountPaise += price

      plannedItems.push({
        id: generateId(),
        item_type: 'GATE_PASS',
        event_id: null,
        team_id: null,
        beneficiary: buyer,
        tier,
        unit_price_paise: price,
        registration_id: null,
      })
    } else if (itemInput.item_type === 'EVENT_PASS') {
      let eventId = itemInput.event_id
      if (!eventId && itemInput.team_id) {
        const teamRow = await db
          .prepare('SELECT event_id FROM teams WHERE id = ?')
          .bind(itemInput.team_id)
          .first<{ event_id: string }>()
        if (teamRow?.event_id) {
          eventId = teamRow.event_id
        }
      }

      if (!eventId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'event_id is required for EVENT_PASS')
      }

      if (seenEventIds.has(eventId)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Cannot purchase duplicate passes for the same event in one order')
      }
      seenEventIds.add(eventId)

      // Fetch event
      const event = await db
        .prepare('SELECT * FROM events WHERE id = ?')
        .bind(eventId)
        .first<Event>()

      if (!event || event.status !== 'OPEN') {
        throw new AppError(400, 'BAD_REQUEST', 'Event is not currently open for registration')
      }

      if (event.registration_closes_at && event.registration_closes_at <= now) {
        throw new AppError(400, 'BAD_REQUEST', `Registration deadline for ${event.title} has passed`)
      }

      if (event.is_team_event === 1) {
        if (!itemInput.team_id) {
          throw new AppError(400, 'VALIDATION_ERROR', `team_id is required for team event ${event.title}`)
        }

        const { team, acceptedMembers } = await validateTeamForPurchase(db, itemInput.team_id, buyer.id)
        if (team.event_id !== event.id) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Team does not belong to this event')
        }

        teamsToLock.push(team.id)

        // Single shared registration for the team
        const regId = generateId()
        const seats = event.capacity_unit === 'TEAMS' ? 1 : acceptedMembers.length
        plannedRegistrations.push({
          id: regId,
          event_id: event.id,
          team_id: team.id,
          participant_id: buyer.id,
          seat_count: seats,
        })
        seatIncrements.push({ event_id: event.id, seats })

        if (event.price_model === 'PER_PARTICIPANT') {
          for (const member of acceptedMembers) {
            const isStudent = qualifiesForStudentTier(member.user)
            const tier: PriceTier = isStudent ? 'STUDENT' : 'GENERAL'
            const price = isStudent
              ? event.student_price_paise ?? event.price_paise
              : event.price_paise

            if (isStudent) requiresStudentPolicy = true
            totalAmountPaise += price

            plannedItems.push({
              id: generateId(),
              item_type: 'EVENT_PASS',
              event_id: event.id,
              team_id: team.id,
              beneficiary: member.user,
              tier,
              unit_price_paise: price,
              registration_id: regId,
            })
          }
        } else {
          // PER_TEAM: student tier ONLY if all members qualify as student
          const allStudents = acceptedMembers.every((m) => qualifiesForStudentTier(m.user))
          const teamTier: PriceTier = allStudents ? 'STUDENT' : 'GENERAL'
          const teamPrice = allStudents
            ? event.student_price_paise ?? event.price_paise
            : event.price_paise

          if (allStudents) requiresStudentPolicy = true
          totalAmountPaise += teamPrice

          for (const member of acceptedMembers) {
            const isLeader = member.user_id === buyer.id
            const itemPrice = isLeader ? teamPrice : 0

            plannedItems.push({
              id: generateId(),
              item_type: 'EVENT_PASS',
              event_id: event.id,
              team_id: team.id,
              beneficiary: member.user,
              tier: teamTier,
              unit_price_paise: itemPrice,
              registration_id: regId,
            })
          }
        }
      } else {
        // Solo event pass
        const isStudent = qualifiesForStudentTier(buyer)
        const tier: PriceTier = isStudent ? 'STUDENT' : 'GENERAL'
        const price = isStudent
          ? event.student_price_paise ?? event.price_paise
          : event.price_paise

        if (isStudent) requiresStudentPolicy = true
        totalAmountPaise += price

        const regId = generateId()
        plannedRegistrations.push({
          id: regId,
          event_id: event.id,
          team_id: null,
          participant_id: buyer.id,
          seat_count: 1,
        })
        seatIncrements.push({ event_id: event.id, seats: 1 })

        plannedItems.push({
          id: generateId(),
          item_type: 'EVENT_PASS',
          event_id: event.id,
          team_id: null,
          beneficiary: buyer,
          tier,
          unit_price_paise: price,
          registration_id: regId,
        })
      }
    }
  }

  // 7. Policy acknowledgement check
  if (requiresStudentPolicy && !input.acknowledge_student_id_policy) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'You must acknowledge the student institution ID verification policy for student-tier passes'
    )
  }

  // 8. Build Atomic Batch
  const purchaseId = generateId()
  const isFree = totalAmountPaise === 0
  const purchaseStatus = isFree ? 'PAID' : 'AWAITING_PAYMENT'
  const paymentMethod = isFree ? 'FREE' : null
  const reservationExpiresAt = isFree ? null : now + ttlMs

  const statements: D1PreparedStatement[] = []

  // Precondition guards: purchases still enabled, buyer still active
  statements.push(
    guardWhen(db, "(SELECT value FROM settings WHERE key = 'purchases_enabled') != '1'")
  )
  statements.push(guardWhen(db, '(SELECT is_active FROM users WHERE id = ?) != 1', [buyer.id]))

  // Precondition guards for events: still OPEN and not past registration_closes_at
  for (const eventId of seenEventIds) {
    statements.push(
      guardWhen(
        db,
        `(SELECT status FROM events WHERE id = ?) != 'OPEN' OR ((SELECT registration_closes_at FROM events WHERE id = ?) IS NOT NULL AND (SELECT registration_closes_at FROM events WHERE id = ?) <= ?)`,
        [eventId, eventId, eventId, now]
      )
    )
  }

  // Precondition guards for teams: still in DRAFT
  for (const teamId of teamsToLock) {
    statements.push(
      guardWhen(db, `(SELECT status FROM teams WHERE id = ?) != 'DRAFT'`, [teamId])
    )
  }

  // Insert purchase
  const insertPurchaseStmt = db
    .prepare(
      `INSERT INTO purchases (
        id, buyer_id, total_amount_paise, status, payment_method,
        reservation_expires_at, fulfillment_status, fulfillment_attempts,
        idempotency_key, idempotency_request_hash, student_policy_acknowledged_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      purchaseId,
      buyer.id,
      totalAmountPaise,
      purchaseStatus,
      paymentMethod,
      reservationExpiresAt,
      'NOT_STARTED',
      0,
      input.idempotency_key || null,
      meta?.requestHash || null,
      requiresStudentPolicy ? now : null,
      now,
      now
    )
  statements.push(insertPurchaseStmt)

  // Insert registrations (RESERVED or CONFIRMED)
  const regStatus = isFree ? 'CONFIRMED' : 'RESERVED'
  for (const reg of plannedRegistrations) {
    statements.push(
      db
        .prepare(
          `INSERT INTO registrations (id, event_id, team_id, participant_id, status, seat_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(reg.id, reg.event_id, reg.team_id, reg.participant_id, regStatus, reg.seat_count, now, now)
    )
  }

  // Increment event seats_taken (relying on ck_events_capacity CHECK to abort on race!)
  for (const inc of seatIncrements) {
    statements.push(
      db
        .prepare('UPDATE events SET seats_taken = seats_taken + ? WHERE id = ?')
        .bind(inc.seats, inc.event_id)
    )
  }

  // Insert purchase_items
  for (const pi of plannedItems) {
    statements.push(
      db
        .prepare(
          `INSERT INTO purchase_items (
            id, purchase_id, item_type, event_id, team_id, beneficiary_id,
            tier, unit_price_paise, registration_id, holds_slot, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
        )
        .bind(
          pi.id,
          purchaseId,
          pi.item_type,
          pi.event_id,
          pi.team_id,
          pi.beneficiary.id,
          pi.tier,
          pi.unit_price_paise,
          pi.registration_id,
          now
        )
    )
  }

  // Lock teams conditionally and verify-after-write
  for (const teamId of teamsToLock) {
    statements.push(
      db
        .prepare("UPDATE teams SET status = 'LOCKED', updated_at = ? WHERE id = ? AND status = 'DRAFT'")
        .bind(now, teamId)
    )
    statements.push(guardVerifyRow(db, 'teams', `id = ? AND status = 'LOCKED'`, [teamId]))
  }

  // Audit log
  const auditStmt = createAuditStatement(db, {
    actorId: buyer.id,
    action: isFree ? 'AUTO_APPROVED_FREE' : 'PURCHASE_CREATED',
    targetType: 'PURCHASE',
    targetId: purchaseId,
    afterJson: {
      total_amount_paise: totalAmountPaise,
      item_count: plannedItems.length,
      status: purchaseStatus,
    },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })
  statements.push(auditStmt)

  await executeBatch(db, statements, {
    customGuardMessage: 'Purchase failed: event capacity full or event condition changed',
  })

  const created = await getPurchaseById(db, purchaseId)
  if (!created) {
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Purchase created but could not be retrieved')
  }
  return created
}

export async function releasePurchase(
  db: D1Database,
  purchaseId: string,
  newStatus: 'CANCELLED' | 'EXPIRED',
  reason: string,
  actor?: User | null,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<void> {
  const now = meta?.now || Date.now()

  // 1. Fetch purchase and items
  const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(purchaseId).first<Purchase>()
  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  if (purchase.status !== 'AWAITING_PAYMENT' && purchase.status !== 'PENDING_VERIFICATION') {
    throw new AppError(
      409,
      'CONFLICT',
      `Cannot release purchase in ${purchase.status} status`
    )
  }

  // 2. Fetch all purchase items with holds_slot = 1 and their registrations
  const items = await db
    .prepare('SELECT * FROM purchase_items WHERE purchase_id = ? AND holds_slot = 1')
    .bind(purchaseId)
    .all<PurchaseItem>()

  const uniqueRegistrationIds = Array.from(
    new Set((items.results || []).map((i) => i.registration_id).filter(Boolean) as string[])
  )

  const registrationsToRelease: Registration[] = []
  for (const regId of uniqueRegistrationIds) {
    const reg = await db
      .prepare('SELECT * FROM registrations WHERE id = ? AND status = \'RESERVED\'')
      .bind(regId)
      .first<Registration>()
    if (reg) registrationsToRelease.push(reg)
  }

  const teamIdsToUnlock = Array.from(
    new Set((items.results || []).map((i) => i.team_id).filter(Boolean) as string[])
  )

  const statements: D1PreparedStatement[] = []

  // Guard: Purchase still in releasable status
  statements.push(
    guardUnless(
      db,
      `EXISTS (SELECT 1 FROM purchases WHERE id = ? AND status IN ('AWAITING_PAYMENT', 'PENDING_VERIFICATION'))`,
      [purchaseId]
    )
  )

  // Decrement seats for RESERVED registrations
  for (const reg of registrationsToRelease) {
    statements.push(
      db
        .prepare('UPDATE events SET seats_taken = max(0, seats_taken - ?) WHERE id = ?')
        .bind(reg.seat_count, reg.event_id)
    )
    statements.push(
      db
        .prepare('UPDATE registrations SET status = ?, updated_at = ? WHERE id = ? AND status = \'RESERVED\'')
        .bind(newStatus, now, reg.id)
    )
  }

  // Set holds_slot = 0 for items
  statements.push(
    db.prepare('UPDATE purchase_items SET holds_slot = 0 WHERE purchase_id = ?').bind(purchaseId)
  )

  // Unlock teams
  for (const tId of teamIdsToUnlock) {
    statements.push(
      db
        .prepare("UPDATE teams SET status = 'DRAFT', updated_at = ? WHERE id = ? AND status = 'LOCKED'")
        .bind(now, tId)
    )
  }

  // Transition purchase
  statements.push(
    db
      .prepare('UPDATE purchases SET status = ?, updated_at = ? WHERE id = ?')
      .bind(newStatus, now, purchaseId)
  )

  // Fail pending payments if any
  statements.push(
    db
      .prepare(
        "UPDATE payments SET status = 'FAILED', rejection_reason = ?, updated_at = ? WHERE purchase_id = ? AND status IN ('PENDING', 'ON_HOLD')"
      )
      .bind(reason, now, purchaseId)
  )

  // Audit statement
  const auditStmt = createAuditStatement(db, {
    actorId: actor?.id || null,
    action: newStatus === 'CANCELLED' ? 'PURCHASE_CANCELLED' : 'PURCHASE_EXPIRED',
    targetType: 'PURCHASE',
    targetId: purchaseId,
    beforeJson: purchase,
    afterJson: { status: newStatus, reason },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })
  statements.push(auditStmt)

  await executeBatch(db, statements, {
    customGuardMessage: 'Cannot release purchase: purchase status already changed or confirmed',
  })
}

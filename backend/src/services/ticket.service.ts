import { AppError } from '../common/errors'
import { generateId } from '../common/utils'
import { executeBatch, guardUnless, guardVerifyRow } from '../db/batch'
import { generateQrToken } from '../utils/qr'
import { getAllSettings, type SettingsMap } from './settings.service'
import type {
  Ticket,
  Purchase,
  PurchaseItem,
  Event,
  FestDay,
  User,
  TicketStatus,
  PurchaseStatus,
  ItemType,
  PriceTier,
} from '../types'
import type { CloudflareBindings } from '../types/env'

export interface DerivedTicketValidity {
  valid_from: number
  valid_to: number
  state: 'VALID' | 'UPCOMING' | 'EXPIRED' | 'REVOKED' | 'REPLACED'
  is_currently_valid: boolean
}

export interface OwnerTicketView {
  id: string
  purchase_item_id: string
  purchase_id: string
  ticket_type: ItemType
  tier: PriceTier
  status: TicketStatus
  validity: DerivedTicketValidity
  qr_token: string
  qr_version: number
  event_checked_in_at: number | null
  purchase: {
    id: string
    payment_status: PurchaseStatus
    total_amount_paise: number
  }
  event: {
    id: string
    title: string
    category: string
    venue: string | null
    day_of_event: number
    starts_at: number
    ends_at: number
  } | null
  student_id_warning: string | null
  created_at: number
  updated_at: number
}

export interface PreparingTicketView {
  purchase_id: string
  status: 'PREPARING' | 'FAILED'
  fulfillment_status: string
  message: string
  can_retry: boolean
  retry_endpoint: string
  attempts: number
  last_error: string | null
}

export function deriveTicketValidity(ticket: Ticket, now: number): DerivedTicketValidity {
  if (ticket.status === 'REVOKED' || ticket.status === 'REPLACED') {
    return {
      valid_from: ticket.valid_from,
      valid_to: ticket.valid_to,
      state: ticket.status,
      is_currently_valid: false,
    }
  }

  if (now < ticket.valid_from) {
    return {
      valid_from: ticket.valid_from,
      valid_to: ticket.valid_to,
      state: 'UPCOMING',
      is_currently_valid: false,
    }
  }

  if (now > ticket.valid_to) {
    return {
      valid_from: ticket.valid_from,
      valid_to: ticket.valid_to,
      state: 'EXPIRED',
      is_currently_valid: false,
    }
  }

  return {
    valid_from: ticket.valid_from,
    valid_to: ticket.valid_to,
    state: 'VALID',
    is_currently_valid: true,
  }
}

export async function formatTicketForOwner(
  db: D1Database,
  ticket: Ticket,
  settings: SettingsMap,
  env: CloudflareBindings,
  now: number
): Promise<OwnerTicketView> {
  const purchase = await db
    .prepare('SELECT id, status, total_amount_paise FROM purchases WHERE id = ?')
    .bind(ticket.purchase_id)
    .first<{ id: string; status: PurchaseStatus; total_amount_paise: number }>()

  let eventSummary: OwnerTicketView['event'] = null
  if (ticket.event_id) {
    const event = await db
      .prepare(
        'SELECT id, title, category, venue, day_of_event, starts_at, ends_at FROM events WHERE id = ?'
      )
      .bind(ticket.event_id)
      .first<Event>()

    if (event) {
      eventSummary = {
        id: event.id,
        title: event.title,
        category: event.category,
        venue: event.venue,
        day_of_event: event.day_of_event,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
      }
    }
  } else if (ticket.ticket_type === 'GATE_PASS') {
    eventSummary = {
      id: 'gate-pass',
      title: 'TechXetra 2026 Fest Gate Pass (All 3 Days)',
      category: 'FEST_PASS',
      venue: 'Main Campus Gate',
      day_of_event: 1,
      starts_at: ticket.valid_from,
      ends_at: ticket.valid_to,
    }
  }

  const qrToken = await generateQrToken(env.TICKET_HMAC_SECRET, ticket.id, ticket.qr_version)

  const studentWarning =
    ticket.tier === 'STUDENT'
      ? settings.student_id_warning_text ||
        'Physical student institution ID card must be presented at entry for verification.'
      : null

  return {
    id: ticket.id,
    purchase_item_id: ticket.purchase_item_id,
    purchase_id: ticket.purchase_id,
    ticket_type: ticket.ticket_type,
    tier: ticket.tier,
    status: ticket.status,
    validity: deriveTicketValidity(ticket, now),
    qr_token: qrToken,
    qr_version: ticket.qr_version,
    event_checked_in_at: ticket.event_checked_in_at,
    purchase: {
      id: ticket.purchase_id,
      payment_status: purchase?.status || 'PAID',
      total_amount_paise: purchase?.total_amount_paise ?? 0,
    },
    event: eventSummary,
    student_id_warning: studentWarning,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
  }
}

export async function getTicketById(
  db: D1Database,
  ticketId: string
): Promise<Ticket | null> {
  return db.prepare('SELECT * FROM tickets WHERE id = ?').bind(ticketId).first<Ticket>()
}

export async function getEnrichedTicketForOwner(
  db: D1Database,
  ticketId: string,
  user: User,
  env: CloudflareBindings,
  now = Date.now()
): Promise<OwnerTicketView> {
  const ticket = await getTicketById(db, ticketId)
  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  // Beneficiary is the ticket owner (or SUPER_ADMIN)
  if (ticket.beneficiary_id !== user.id && user.role !== 'SUPER_ADMIN') {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  const settings = await getAllSettings(db)
  return formatTicketForOwner(db, ticket, settings, env, now)
}

export async function getUserTickets(
  db: D1Database,
  user: User,
  env: CloudflareBindings,
  now = Date.now()
): Promise<{ tickets: OwnerTicketView[]; preparing_tickets: PreparingTicketView[] }> {
  const tickets = await db
    .prepare('SELECT * FROM tickets WHERE beneficiary_id = ? ORDER BY created_at DESC')
    .bind(user.id)
    .all<Ticket>()

  const settings = await getAllSettings(db)

  const enrichedTickets: OwnerTicketView[] = []
  for (const t of tickets.results || []) {
    enrichedTickets.push(await formatTicketForOwner(db, t, settings, env, now))
  }

  const pendingPurchases = await db
    .prepare(
      `SELECT id, total_amount_paise, status, fulfillment_status, fulfillment_attempts, fulfillment_last_error, updated_at
       FROM purchases
       WHERE (buyer_id = ? OR id IN (SELECT purchase_id FROM purchase_items WHERE beneficiary_id = ?))
         AND status = 'PAID'
         AND fulfillment_status != 'COMPLETED'
       ORDER BY created_at DESC`
    )
    .bind(user.id, user.id)
    .all<any>()

  const preparingTickets: PreparingTicketView[] = (pendingPurchases.results || []).map((p) => ({
    purchase_id: p.id,
    status: p.fulfillment_status === 'FAILED' ? 'FAILED' : 'PREPARING',
    fulfillment_status: p.fulfillment_status,
    message:
      p.fulfillment_status === 'FAILED'
        ? 'Ticket generation encountered an issue. You can retry preparing your tickets.'
        : 'Your tickets are currently being generated.',
    can_retry: true,
    retry_endpoint: `/api/purchases/${p.id}/retry-fulfillment`,
    attempts: p.fulfillment_attempts,
    last_error: p.fulfillment_last_error,
  }))

  return {
    tickets: enrichedTickets,
    preparing_tickets: preparingTickets,
  }
}

export async function rotateTicketQr(
  db: D1Database,
  ticketId: string,
  env: CloudflareBindings,
  options?: { now?: number }
): Promise<{ ticket: Ticket; qr_token: string }> {
  const now = options?.now || Date.now()

  const ticket = await db
    .prepare('SELECT * FROM tickets WHERE id = ?')
    .bind(ticketId)
    .first<Ticket>()

  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  if (ticket.status !== 'ACTIVE') {
    throw new AppError(409, 'CONFLICT', 'Cannot rotate QR token for an inactive ticket')
  }

  const nextVersion = ticket.qr_version + 1

  await db
    .prepare('UPDATE tickets SET qr_version = ?, updated_at = ? WHERE id = ?')
    .bind(nextVersion, now, ticket.id)
    .run()

  const updatedTicket: Ticket = {
    ...ticket,
    qr_version: nextVersion,
    updated_at: now,
  }

  const newToken = await generateQrToken(env.TICKET_HMAC_SECRET, updatedTicket.id, updatedTicket.qr_version)

  return {
    ticket: updatedTicket,
    qr_token: newToken,
  }
}

export async function fulfillPurchase(
  db: D1Database,
  purchaseId: string,
  env: CloudflareBindings,
  options?: { now?: number }
): Promise<{ purchase: Purchase; tickets: Ticket[] }> {
  const now = options?.now || Date.now()

  // 1. Fetch Purchase
  const purchase = await db
    .prepare('SELECT * FROM purchases WHERE id = ?')
    .bind(purchaseId)
    .first<Purchase>()

  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  // Enforce: ONLY issue tickets when purchase status is PAID!
  if (purchase.status !== 'PAID') {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `Cannot fulfill tickets for purchase in ${purchase.status} status. Purchase must be PAID.`
    )
  }

  // 2. Fetch Fest Days for validity calculation
  const festDaysResult = await db
    .prepare('SELECT day_number, date, starts_at, ends_at, description FROM fest_days ORDER BY day_number ASC')
    .all<FestDay>()
  const festDays = festDaysResult.results || []

  const festStart = festDays.length > 0 ? festDays[0].starts_at : now
  const festEnd = festDays.length > 0 ? festDays[festDays.length - 1].ends_at : now + 3 * 86400000

  // 3. Fetch purchase items
  const itemsResult = await db
    .prepare('SELECT * FROM purchase_items WHERE purchase_id = ?')
    .bind(purchaseId)
    .all<PurchaseItem>()
  const items = itemsResult.results || []

  if (items.length === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'No purchase items found to fulfill')
  }

  // 4. Load purchase items without an active ticket
  const existingActiveTicketsResult = await db
    .prepare("SELECT * FROM tickets WHERE purchase_id = ? AND status = 'ACTIVE'")
    .bind(purchaseId)
    .all<Ticket>()
  const existingActiveTickets = existingActiveTicketsResult.results || []

  const activeTicketByItemId = new Map<string, Ticket>()
  for (const t of existingActiveTickets) {
    activeTicketByItemId.set(t.purchase_item_id, t)
  }

  const itemsToFulfill = items.filter((item) => !activeTicketByItemId.has(item.id))

  // If all items already have active tickets, ensure status is COMPLETED and return
  if (itemsToFulfill.length === 0) {
    if (purchase.fulfillment_status !== 'COMPLETED') {
      await db
        .prepare(
          "UPDATE purchases SET fulfillment_status = 'COMPLETED', fulfillment_last_error = NULL, updated_at = ? WHERE id = ?"
        )
        .bind(now, purchase.id)
        .run()
    }
    return {
      purchase: {
        ...purchase,
        fulfillment_status: 'COMPLETED',
        fulfillment_last_error: null,
        updated_at: now,
      },
      tickets: existingActiveTickets,
    }
  }

  // 5. Derive validity windows and construct tickets to insert
  const statements: D1PreparedStatement[] = []
  const newTickets: Ticket[] = []

  for (const item of itemsToFulfill) {
    let validFrom = festStart
    let validTo = festEnd

    if (item.item_type === 'EVENT_PASS') {
      if (!item.event_id) {
        throw new AppError(500, 'INTERNAL_ERROR', `Missing event_id on purchase item ${item.id}`)
      }

      const event = await db
        .prepare('SELECT * FROM events WHERE id = ?')
        .bind(item.event_id)
        .first<Event>()

      if (!event) {
        throw new AppError(404, 'NOT_FOUND', `Referenced event ${item.event_id} not found`)
      }

      const eventDay = festDays.find((d) => d.day_number === event.day_of_event)
      if (eventDay) {
        validFrom = eventDay.starts_at
        validTo = eventDay.ends_at
      } else {
        validFrom = event.starts_at
        validTo = event.ends_at
      }
    }

    const ticketId = generateId()
    const ticket: Ticket = {
      id: ticketId,
      purchase_item_id: item.id,
      purchase_id: purchase.id,
      ticket_type: item.item_type,
      beneficiary_id: item.beneficiary_id,
      event_id: item.event_id || null,
      tier: item.tier,
      valid_from: validFrom,
      valid_to: validTo,
      qr_version: 1,
      status: 'ACTIVE',
      event_checked_in_at: null,
      replaces_ticket_id: null,
      created_at: now,
      updated_at: now,
    }

    newTickets.push(ticket)

    statements.push(
      db
        .prepare(
          `INSERT INTO tickets (
            id, purchase_item_id, purchase_id, ticket_type, beneficiary_id,
            event_id, tier, valid_from, valid_to, qr_version, status,
            event_checked_in_at, replaces_ticket_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', NULL, NULL, ?, ?)`
        )
        .bind(
          ticket.id,
          ticket.purchase_item_id,
          ticket.purchase_id,
          ticket.ticket_type,
          ticket.beneficiary_id,
          ticket.event_id,
          ticket.tier,
          ticket.valid_from,
          ticket.valid_to,
          now,
          now
        )
    )
  }

  // 6. Duplicate prevention & completeness backstop in the same batch
  statements.push(
    guardUnless(
      db,
      `NOT EXISTS (
        SELECT 1 FROM purchase_items pi
        WHERE pi.purchase_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM tickets t WHERE t.purchase_item_id = pi.id AND t.status = 'ACTIVE'
          )
      )`,
      [purchase.id]
    )
  )

  // 7. Transition fulfillment_status to COMPLETED
  statements.push(
    db
      .prepare(
        `UPDATE purchases SET
          fulfillment_status = 'COMPLETED',
          fulfillment_attempts = fulfillment_attempts + 1,
          fulfillment_last_error = NULL,
          updated_at = ?
        WHERE id = ? AND status = 'PAID'`
      )
      .bind(now, purchase.id)
  )

  statements.push(
    guardVerifyRow(db, 'purchases', "id = ? AND fulfillment_status = 'COMPLETED'", [purchase.id])
  )

  // 8. Execute batch with separate error catching
  try {
    await executeBatch(db, statements, {
      customGuardMessage:
        'Ticket fulfillment failed: not all purchase items could be ticketed or duplicate active ticket exists',
    })

    return {
      purchase: {
        ...purchase,
        fulfillment_status: 'COMPLETED',
        fulfillment_attempts: purchase.fulfillment_attempts + 1,
        fulfillment_last_error: null,
        updated_at: now,
      },
      tickets: [...existingActiveTickets, ...newTickets],
    }
  } catch (err: any) {
    // Check if another concurrent execution already fulfilled the tickets
    const checkActiveTickets = await db
      .prepare("SELECT * FROM tickets WHERE purchase_id = ? AND status = 'ACTIVE'")
      .bind(purchaseId)
      .all<Ticket>()

    const allActive = checkActiveTickets.results || []
    if (allActive.length === items.length && items.length > 0) {
      await db
        .prepare(
          "UPDATE purchases SET fulfillment_status = 'COMPLETED', fulfillment_last_error = NULL, updated_at = ? WHERE id = ?"
        )
        .bind(now, purchaseId)
        .run()

      return {
        purchase: {
          ...purchase,
          fulfillment_status: 'COMPLETED',
          fulfillment_last_error: null,
          updated_at: now,
        },
        tickets: allActive,
      }
    }

    // Genuine failure: Record FAILED state, short redacted error, and increment attempts
    // Never revert purchases.status='PAID'!
    const rawMsg = err instanceof Error ? err.message : String(err)
    const redactedError = rawMsg
      .slice(0, 250)
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, '[REDACTED]')

    await db
      .prepare(
        `UPDATE purchases SET
          fulfillment_status = 'FAILED',
          fulfillment_attempts = fulfillment_attempts + 1,
          fulfillment_last_error = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .bind(redactedError, now, purchaseId)
      .run()

    throw new AppError(500, 'FULFILLMENT_FAILED', `Ticket fulfillment failed: ${redactedError}`)
  }
}

export async function processPendingFulfillments(
  db: D1Database,
  env: CloudflareBindings,
  options?: { limit?: number; now?: number }
): Promise<{ processed: number; succeeded: number; failed: number; errors: any[] }> {
  const limit = options?.limit || 25
  const now = options?.now || Date.now()

  const pending = await db
    .prepare(
      `SELECT id FROM purchases
       WHERE status = 'PAID' AND fulfillment_status IN ('FAILED', 'NOT_STARTED', 'IN_PROGRESS')
       ORDER BY updated_at ASC
       LIMIT ?`
    )
    .bind(limit)
    .all<{ id: string }>()

  const purchases = pending.results || []
  let succeeded = 0
  let failed = 0
  const errors: any[] = []

  for (const p of purchases) {
    try {
      await fulfillPurchase(db, p.id, env, { now })
      succeeded++
    } catch (err: any) {
      failed++
      errors.push({
        purchase_id: p.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    processed: purchases.length,
    succeeded,
    failed,
    errors,
  }
}

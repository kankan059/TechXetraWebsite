import { AppError } from '../common/errors'
import { generateId } from '../common/utils'
import { executeBatch, guardUnless } from '../db/batch'
import { createAuditStatement } from './audit.service'
import type { Registration, Ticket, User } from '../types'
import type { CloudflareBindings } from '../types/env'

export async function cancelRegistrationByAdmin(
  db: D1Database,
  registrationId: string,
  reason: string,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ cancelled: boolean; registration_id: string; freed_seats: number }> {
  const now = meta?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can cancel registrations')
  }

  const trimmedReason = reason?.trim()
  if (!trimmedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to cancel a registration')
  }

  const registration = await db
    .prepare('SELECT * FROM registrations WHERE id = ?')
    .bind(registrationId)
    .first<Registration>()

  if (!registration) {
    throw new AppError(404, 'NOT_FOUND', 'Registration not found')
  }

  if (registration.status === 'CANCELLED') {
    throw new AppError(409, 'CONFLICT', 'Registration is already cancelled')
  }

  const statements: D1PreparedStatement[] = []

  // 1. Guard: status still matches
  statements.push(
    guardUnless(
      db,
      "EXISTS (SELECT 1 FROM registrations WHERE id = ? AND status != 'CANCELLED')",
      [registration.id]
    )
  )

  // 2. If CONFIRMED, decrement event seats_taken
  if (registration.status === 'CONFIRMED') {
    statements.push(
      db
        .prepare('UPDATE events SET seats_taken = max(0, seats_taken - ?) WHERE id = ?')
        .bind(registration.seat_count, registration.event_id)
    )
  }

  // 3. Update registration status to CANCELLED
  statements.push(
    db
      .prepare("UPDATE registrations SET status = 'CANCELLED', updated_at = ? WHERE id = ?")
      .bind(now, registration.id)
  )

  // 4. Revoke active tickets associated with this registration
  statements.push(
    db
      .prepare(
        `UPDATE tickets SET status = 'REVOKED', updated_at = ?
         WHERE purchase_item_id IN (
           SELECT id FROM purchase_items WHERE registration_id = ?
         ) AND status = 'ACTIVE'`
      )
      .bind(now, registration.id)
  )

  // 5. If this is a team registration, update team status to CANCELLED
  if (registration.team_id) {
    statements.push(
      db
        .prepare("UPDATE teams SET status = 'CANCELLED', updated_at = ? WHERE id = ? AND status != 'CANCELLED'")
        .bind(now, registration.team_id)
    )
  }

  // 6. Audit row
  statements.push(
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'REGISTRATION_CANCELLED',
      targetType: 'REGISTRATION',
      targetId: registration.id,
      beforeJson: registration,
      afterJson: { status: 'CANCELLED', freed_seats: registration.seat_count, reason: trimmedReason },
      reason: trimmedReason,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    })
  )

  await executeBatch(db, statements, {
    customGuardMessage: 'Failed to cancel registration: status was modified concurrently',
  })

  return {
    cancelled: true,
    registration_id: registration.id,
    freed_seats: registration.seat_count,
  }
}

export interface ReplaceMemberInput {
  old_user_id: string
  new_user_id: string
  reason: string
}

export async function replaceRegistrationMemberByAdmin(
  db: D1Database,
  registrationId: string,
  input: ReplaceMemberInput,
  _env: CloudflareBindings,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ replaced: boolean; old_user_id: string; new_user_id: string; new_ticket_id: string | null }> {
  const now = meta?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can replace registration members')
  }

  const trimmedReason = input.reason?.trim()
  if (!trimmedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to replace a registration member')
  }

  const registration = await db
    .prepare('SELECT * FROM registrations WHERE id = ?')
    .bind(registrationId)
    .first<Registration>()

  if (!registration) {
    throw new AppError(404, 'NOT_FOUND', 'Registration not found')
  }

  if (registration.status !== 'CONFIRMED') {
    throw new AppError(409, 'CONFLICT', 'Member replacement only permitted for confirmed registrations')
  }

  const oldUser = await db.prepare('SELECT * FROM users WHERE id = ?').bind(input.old_user_id).first<User>()
  if (!oldUser) {
    throw new AppError(404, 'NOT_FOUND', 'Current member user not found')
  }

  const newUser = await db.prepare('SELECT * FROM users WHERE id = ?').bind(input.new_user_id).first<User>()
  if (!newUser) {
    throw new AppError(404, 'NOT_FOUND', 'Replacement member user not found')
  }

  if (newUser.is_active === 0) {
    throw new AppError(400, 'ACCOUNT_DISABLED', 'Replacement user account is deactivated')
  }

  // Check if new user is already registered for this event
  const existingReg = await db
    .prepare("SELECT 1 FROM registrations WHERE event_id = ? AND participant_id = ? AND status IN ('RESERVED', 'CONFIRMED')")
    .bind(registration.event_id, newUser.id)
    .first()

  if (existingReg) {
    throw new AppError(409, 'ALREADY_REGISTERED', 'Replacement user is already registered for this event')
  }

  // Fetch ticket for old user under this registration
  const oldTicket = await db
    .prepare(
      `SELECT t.*, pi.tier as item_tier
       FROM tickets t
       JOIN purchase_items pi ON t.purchase_item_id = pi.id
       WHERE pi.registration_id = ? AND t.beneficiary_id = ? AND t.status = 'ACTIVE'`
    )
    .bind(registration.id, oldUser.id)
    .first<Ticket & { item_tier: string }>()

  if (oldTicket) {
    // Checked-in ticket cannot be silently transferred/reissued
    if (oldTicket.event_checked_in_at !== null) {
      throw new AppError(
        409,
        'TICKET_ALREADY_CHECKED_IN',
        'Cannot replace member because current member ticket has already been admitted / checked in'
      )
    }

    // Pricing / student tier rule
    if (oldTicket.tier === 'STUDENT') {
      const qualifies = newUser.is_student === 1 && Boolean(newUser.institution_id?.trim())
      if (!qualifies) {
        throw new AppError(
          400,
          'INELIGIBLE_FOR_STUDENT_TIER',
          'Replacement member does not qualify for student tier'
        )
      }
    }
  }

  const statements: D1PreparedStatement[] = []
  let newTicketId: string | null = null

  // If this registration was for individual participant
  if (registration.participant_id === oldUser.id) {
    statements.push(
      db
        .prepare('UPDATE registrations SET participant_id = ?, updated_at = ? WHERE id = ?')
        .bind(newUser.id, now, registration.id)
    )
  }

  // If team event, update team_members
  if (registration.team_id) {
    statements.push(
      db
        .prepare(
          `UPDATE team_members SET user_id = ?, invited_email = ?
           WHERE team_id = ? AND user_id = ?`
        )
        .bind(newUser.id, newUser.email, registration.team_id, oldUser.id)
    )
  }

  // Replace ticket if existed
  if (oldTicket) {
    newTicketId = generateId()
    const newTicket: Ticket = {
      id: newTicketId,
      purchase_item_id: oldTicket.purchase_item_id,
      purchase_id: oldTicket.purchase_id,
      ticket_type: oldTicket.ticket_type,
      beneficiary_id: newUser.id,
      event_id: oldTicket.event_id,
      tier: oldTicket.tier,
      valid_from: oldTicket.valid_from,
      valid_to: oldTicket.valid_to,
      qr_version: 1,
      status: 'ACTIVE',
      event_checked_in_at: null,
      replaces_ticket_id: oldTicket.id,
      created_at: now,
      updated_at: now,
    }

    statements.push(
      db
        .prepare("UPDATE tickets SET status = 'REPLACED', updated_at = ? WHERE id = ? AND status = 'ACTIVE'")
        .bind(now, oldTicket.id)
    )

    statements.push(
      db
        .prepare(
          `INSERT INTO tickets (
            id, purchase_item_id, purchase_id, ticket_type, beneficiary_id,
            event_id, tier, valid_from, valid_to, qr_version, status,
            event_checked_in_at, replaces_ticket_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          newTicket.id,
          newTicket.purchase_item_id,
          newTicket.purchase_id,
          newTicket.ticket_type,
          newTicket.beneficiary_id,
          newTicket.event_id,
          newTicket.tier,
          newTicket.valid_from,
          newTicket.valid_to,
          newTicket.qr_version,
          newTicket.status,
          newTicket.event_checked_in_at,
          newTicket.replaces_ticket_id,
          now,
          now
        )
    )

    statements.push(
      db
        .prepare('UPDATE purchase_items SET beneficiary_id = ? WHERE id = ?')
        .bind(newUser.id, oldTicket.purchase_item_id)
    )
  }

  // Audit row
  statements.push(
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'REGISTRATION_MEMBER_REPLACED',
      targetType: 'REGISTRATION',
      targetId: registration.id,
      beforeJson: { registration_id: registration.id, old_user_id: oldUser.id },
      afterJson: { registration_id: registration.id, new_user_id: newUser.id, new_ticket_id: newTicketId },
      reason: trimmedReason,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    })
  )

  await executeBatch(db, statements)

  return {
    replaced: true,
    old_user_id: oldUser.id,
    new_user_id: newUser.id,
    new_ticket_id: newTicketId,
  }
}

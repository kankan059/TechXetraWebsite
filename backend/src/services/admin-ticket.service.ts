import { AppError } from '../common/errors'
import { generateId } from '../common/utils'
import { executeBatch, guardUnless, guardVerifyRow } from '../db/batch'
import { createAuditStatement } from './audit.service'
import { generateQrToken } from '../utils/qr'
import type { Ticket, User, CheckInLog } from '../types'
import type { CloudflareBindings } from '../types/env'

export async function revokeTicketByAdmin(
  db: D1Database,
  ticketId: string,
  reason: string,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<Ticket> {
  const now = meta?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can revoke tickets')
  }

  const trimmedReason = reason?.trim()
  if (!trimmedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to revoke a ticket')
  }

  const ticket = await db
    .prepare('SELECT * FROM tickets WHERE id = ?')
    .bind(ticketId)
    .first<Ticket>()

  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  if (ticket.status !== 'ACTIVE') {
    throw new AppError(409, 'CONFLICT', `Cannot revoke ticket in ${ticket.status} status`)
  }

  const statements: D1PreparedStatement[] = [
    guardUnless(
      db,
      "EXISTS (SELECT 1 FROM tickets WHERE id = ? AND status = 'ACTIVE')",
      [ticket.id]
    ),
    db
      .prepare("UPDATE tickets SET status = 'REVOKED', updated_at = ? WHERE id = ? AND status = 'ACTIVE'")
      .bind(now, ticket.id),
    guardVerifyRow(db, 'tickets', "id = ? AND status = 'REVOKED'", [ticket.id]),
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'TICKET_REVOKED',
      targetType: 'TICKET',
      targetId: ticket.id,
      beforeJson: ticket,
      afterJson: { status: 'REVOKED', reason: trimmedReason },
      reason: trimmedReason,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    }),
  ]

  await executeBatch(db, statements, {
    customGuardMessage: 'Failed to revoke ticket: ticket status was modified concurrently',
  })

  return {
    ...ticket,
    status: 'REVOKED',
    updated_at: now,
  }
}

export async function reissueTicketByAdmin(
  db: D1Database,
  ticketId: string,
  reason: string,
  env: CloudflareBindings,
  actor: User,
  options?: { newBeneficiaryId?: string; ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ old_ticket: Ticket; new_ticket: Ticket; qr_token: string }> {
  const now = options?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can reissue tickets')
  }

  const trimmedReason = reason?.trim()
  if (!trimmedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to reissue a ticket')
  }

  const oldTicket = await db
    .prepare('SELECT * FROM tickets WHERE id = ?')
    .bind(ticketId)
    .first<Ticket>()

  if (!oldTicket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  if (oldTicket.status !== 'ACTIVE') {
    throw new AppError(409, 'CONFLICT', `Cannot reissue ticket in ${oldTicket.status} status`)
  }

  // Checked-in tickets cannot be silently transferred/reissued
  if (oldTicket.event_checked_in_at !== null) {
    throw new AppError(
      409,
      'TICKET_ALREADY_CHECKED_IN',
      'Cannot reissue or transfer a ticket that has already been admitted / checked in'
    )
  }

  let targetBeneficiaryId = oldTicket.beneficiary_id
  if (options?.newBeneficiaryId && options.newBeneficiaryId !== oldTicket.beneficiary_id) {
    const newBeneficiary = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(options.newBeneficiaryId)
      .first<User>()

    if (!newBeneficiary) {
      throw new AppError(404, 'NOT_FOUND', 'Replacement beneficiary user not found')
    }

    if (newBeneficiary.is_active === 0) {
      throw new AppError(400, 'ACCOUNT_DISABLED', 'Replacement beneficiary account is deactivated')
    }

    // Enforce pricing / student tier rules
    if (oldTicket.tier === 'STUDENT') {
      const qualifies = newBeneficiary.is_student === 1 && Boolean(newBeneficiary.institution_id?.trim())
      if (!qualifies) {
        throw new AppError(
          400,
          'INELIGIBLE_FOR_STUDENT_TIER',
          'Replacement beneficiary does not qualify for student tier'
        )
      }
    }

    targetBeneficiaryId = newBeneficiary.id
  }

  const newTicketId = generateId()
  const newTicket: Ticket = {
    id: newTicketId,
    purchase_item_id: oldTicket.purchase_item_id,
    purchase_id: oldTicket.purchase_id,
    ticket_type: oldTicket.ticket_type,
    beneficiary_id: targetBeneficiaryId,
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

  const statements: D1PreparedStatement[] = [
    guardUnless(
      db,
      "EXISTS (SELECT 1 FROM tickets WHERE id = ? AND status = 'ACTIVE' AND event_checked_in_at IS NULL)",
      [oldTicket.id]
    ),
    // 1. Mark old ticket REPLACED
    db
      .prepare("UPDATE tickets SET status = 'REPLACED', updated_at = ? WHERE id = ? AND status = 'ACTIVE'")
      .bind(now, oldTicket.id),
    // 2. Insert new replacement ticket
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
      ),
    // 3. If beneficiary changed, update purchase_item beneficiary
    ...(targetBeneficiaryId !== oldTicket.beneficiary_id
      ? [
          db
            .prepare('UPDATE purchase_items SET beneficiary_id = ? WHERE id = ?')
            .bind(targetBeneficiaryId, oldTicket.purchase_item_id),
        ]
      : []),
    // 4. Audit statement
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'TICKET_REISSUED',
      targetType: 'TICKET',
      targetId: newTicket.id,
      beforeJson: oldTicket,
      afterJson: newTicket,
      reason: trimmedReason,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      now,
    }),
  ]

  await executeBatch(db, statements, {
    customGuardMessage: 'Failed to reissue ticket: ticket status was modified concurrently',
  })

  const qrToken = await generateQrToken(env.TICKET_HMAC_SECRET, newTicket.id, newTicket.qr_version)

  return {
    old_ticket: { ...oldTicket, status: 'REPLACED', updated_at: now },
    new_ticket: newTicket,
    qr_token: qrToken,
  }
}

export async function rotateTicketQrByAdmin(
  db: D1Database,
  ticketId: string,
  reason: string,
  env: CloudflareBindings,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ ticket: Ticket; qr_token: string }> {
  const now = meta?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can rotate ticket QR codes')
  }

  const trimmedReason = reason?.trim()
  if (!trimmedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to rotate ticket QR')
  }

  const ticket = await db
    .prepare('SELECT * FROM tickets WHERE id = ?')
    .bind(ticketId)
    .first<Ticket>()

  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  if (ticket.status !== 'ACTIVE') {
    throw new AppError(409, 'CONFLICT', 'Cannot rotate QR for an inactive ticket')
  }

  const nextVersion = ticket.qr_version + 1

  const statements: D1PreparedStatement[] = [
    guardUnless(
      db,
      "EXISTS (SELECT 1 FROM tickets WHERE id = ? AND status = 'ACTIVE')",
      [ticket.id]
    ),
    db
      .prepare("UPDATE tickets SET qr_version = ?, updated_at = ? WHERE id = ? AND status = 'ACTIVE'")
      .bind(nextVersion, now, ticket.id),
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'TICKET_QR_ROTATED',
      targetType: 'TICKET',
      targetId: ticket.id,
      beforeJson: { qr_version: ticket.qr_version },
      afterJson: { qr_version: nextVersion, reason: trimmedReason },
      reason: trimmedReason,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    }),
  ]

  await executeBatch(db, statements)

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

export async function undoEventCheckInByAdmin(
  db: D1Database,
  ticketId: string,
  reason: string,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ undone: boolean; ticket_id: string; previous_checked_in_at: number }> {
  const now = meta?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can undo event check-in')
  }

  const trimmedReason = reason?.trim()
  if (!trimmedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to undo event check-in')
  }

  const ticket = await db
    .prepare('SELECT * FROM tickets WHERE id = ?')
    .bind(ticketId)
    .first<Ticket>()

  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  if (ticket.event_checked_in_at === null) {
    throw new AppError(409, 'NOT_CHECKED_IN', 'Ticket has not been checked in to an event')
  }

  const admittedLog = await db
    .prepare("SELECT * FROM check_in_logs WHERE ticket_id = ? AND context = 'EVENT' AND verdict = 'ADMITTED' LIMIT 1")
    .bind(ticket.id)
    .first<CheckInLog>()

  if (!admittedLog) {
    throw new AppError(404, 'NOT_FOUND', 'Admitted check-in log entry not found for this ticket')
  }

  const statements: D1PreparedStatement[] = [
    // 1. Clear tickets.event_checked_in_at
    db
      .prepare('UPDATE tickets SET event_checked_in_at = NULL, updated_at = ? WHERE id = ? AND event_checked_in_at IS NOT NULL')
      .bind(now, ticket.id),
    guardVerifyRow(db, 'tickets', 'id = ? AND event_checked_in_at IS NULL', [ticket.id]),
    // 2. Update check_in_logs verdict to OVERRIDDEN (clears ux_checkin_event_once partial unique index)
    db
      .prepare("UPDATE check_in_logs SET verdict = 'OVERRIDDEN', reason = ? WHERE id = ? AND verdict = 'ADMITTED'")
      .bind(trimmedReason, admittedLog.id),
    // 3. Audit row
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'EVENT_CHECKIN_UNDONE',
      targetType: 'TICKET',
      targetId: ticket.id,
      beforeJson: { event_checked_in_at: ticket.event_checked_in_at, check_in_log_id: admittedLog.id },
      afterJson: { event_checked_in_at: null, override_verdict: 'OVERRIDDEN', reason: trimmedReason },
      reason: trimmedReason,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    }),
  ]

  await executeBatch(db, statements, {
    customGuardMessage: 'Failed to undo check-in: ticket or check-in log state changed concurrently',
  })

  return {
    undone: true,
    ticket_id: ticket.id,
    previous_checked_in_at: ticket.event_checked_in_at,
  }
}

export async function getAdminTicketDetail(
  db: D1Database,
  ticketId: string
): Promise<any> {
  const ticket = await db
    .prepare(
      `SELECT t.*,
        u.name as beneficiary_name, u.email as beneficiary_email, u.phone as beneficiary_phone,
        u.is_student, u.institution_name, u.institution_id,
        p.status as purchase_status, p.payment_method,
        e.title as event_title, e.category as event_category, e.day_of_event
       FROM tickets t
       JOIN users u ON t.beneficiary_id = u.id
       JOIN purchases p ON t.purchase_id = p.id
       LEFT JOIN events e ON t.event_id = e.id
       WHERE t.id = ?`
    )
    .bind(ticketId)
    .first<any>()

  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found')
  }

  const logs = await db
    .prepare(
      `SELECT cl.*, u.name as scanner_name
       FROM check_in_logs cl
       JOIN users u ON cl.scanner_id = u.id
       WHERE cl.ticket_id = ?
       ORDER BY cl.created_at DESC`
    )
    .bind(ticketId)
    .all<any>()

  return {
    ...ticket,
    check_in_history: logs.results || [],
  }
}

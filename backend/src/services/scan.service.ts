import { AppError } from '../common/errors'
import { generateId } from '../common/utils'
import { executeBatch, guardUnless, guardVerifyRow } from '../db/batch'
import { verifyAndParseQrToken } from '../utils/qr'
import type {
  User,
  Ticket,
  PurchaseStatus,
  ItemType,
  PriceTier,
  CheckInLog,
  CheckInVerdict,
} from '../types'
import type { CloudflareBindings } from '../types/env'

export type ScanVerdict =
  | 'VALID'
  | 'ALREADY_USED'
  | 'EXPIRED'
  | 'NOT_YET_VALID'
  | 'REVOKED'
  | 'PAYMENT_NOT_APPROVED'
  | 'WRONG_EVENT'
  | 'WRONG_TICKET_TYPE'
  | 'INVALID'

export interface ScanLookupInput {
  token: string
  context: 'GATE' | 'EVENT'
  event_id?: string
}

export interface ScanLookupResult {
  verdict: ScanVerdict
  reason: string | null
  ticket: {
    id: string
    ticket_type: ItemType
    tier: PriceTier
    beneficiary_name: string
    requires_id_check: boolean
    institution_name: string | null
    institution_id: string | null
    event: {
      id: string
      title: string
      category: string
      day_of_event: number
    } | null
    validity: {
      valid_from: number
      valid_to: number
      is_currently_valid: boolean
    }
    event_checked_in_at: number | null
  } | null
  recent_gate_entry_at: number | null
  recent_gate_entry_warning: string | null
}

export interface ScanAdmitInput {
  token: string
  context: 'GATE' | 'EVENT'
  event_id?: string
  student_id_checked?: boolean
  client_scan_id?: string
}

export interface ScanAdmitResult {
  success: boolean
  verdict: 'ADMITTED'
  ticket_id: string
  log_id: string
  context: 'GATE' | 'EVENT'
  event_id: string | null
  student_id_checked: boolean
  admitted_at: number
  idempotent_replay?: boolean
}

export interface ScanDenyInput {
  token: string
  context: 'GATE' | 'EVENT'
  event_id?: string
  reason: string
  client_scan_id?: string
  student_id_checked?: boolean
}

export interface ScanDenyResult {
  success: boolean
  verdict: 'DENIED'
  ticket_id: string
  log_id: string
  context: 'GATE' | 'EVENT'
  reason: string
  denied_at: number
  idempotent_replay?: boolean
}

/**
 * Authorize scanner before looking up any token or ticket.
 * GATE requires gate_staff or SUPER_ADMIN.
 * EVENT requires assignment to the exact event or SUPER_ADMIN.
 */
export async function assertScannerAuthorized(
  db: D1Database,
  scanner: User,
  context: 'GATE' | 'EVENT',
  eventId?: string | null
): Promise<void> {
  if (scanner.role === 'SUPER_ADMIN') {
    return
  }

  if (context === 'GATE') {
    const isGateStaff = await db
      .prepare('SELECT 1 FROM gate_staff WHERE user_id = ?')
      .bind(scanner.id)
      .first()

    if (!isGateStaff) {
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized for gate scanning')
    }
    return
  }

  if (context === 'EVENT') {
    if (!eventId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'event_id is required for EVENT scanning')
    }

    const isEventStaff = await db
      .prepare('SELECT 1 FROM event_staff WHERE event_id = ? AND user_id = ?')
      .bind(eventId, scanner.id)
      .first()

    if (!isEventStaff) {
      throw new AppError(403, 'FORBIDDEN', 'You are not assigned as staff for this event')
    }
    return
  }

  throw new AppError(400, 'VALIDATION_ERROR', `Invalid scan context: ${context}`)
}

/**
 * Read-only lookup for ticket verification.
 * Does not mutate ticket state or write check-in logs.
 * Strictly excludes sensitive PII (no phone or email).
 */
export async function lookupScan(
  db: D1Database,
  scanner: User,
  input: ScanLookupInput,
  env: CloudflareBindings,
  now = Date.now()
): Promise<ScanLookupResult> {
  // 1. Authorize scanner before examining token/ticket
  await assertScannerAuthorized(db, scanner, input.context, input.event_id)

  // 2. Cryptographic signature and format verification
  const parsed = await verifyAndParseQrToken(input.token, env.TICKET_HMAC_SECRET)

  // 3. Database lookup for ticket, purchase, user, and event
  const row = await db
    .prepare(
      `SELECT
        t.id, t.purchase_item_id, t.purchase_id, t.ticket_type, t.beneficiary_id,
        t.event_id, t.tier, t.valid_from, t.valid_to, t.qr_version, t.status as ticket_status,
        t.event_checked_in_at,
        p.status as purchase_status,
        u.name as beneficiary_name, u.institution_name, u.institution_id,
        e.id as event_table_id, e.title as event_title, e.category as event_category, e.day_of_event as event_day
      FROM tickets t
      JOIN purchases p ON t.purchase_id = p.id
      JOIN users u ON t.beneficiary_id = u.id
      LEFT JOIN events e ON t.event_id = e.id
      WHERE t.id = ?`
    )
    .bind(parsed.ticketId)
    .first<any>()

  if (!row) {
    return {
      verdict: 'INVALID',
      reason: 'Ticket identifier not found in system',
      ticket: null,
      recent_gate_entry_at: null,
      recent_gate_entry_warning: null,
    }
  }

  // 4. Derive verdict
  let verdict: ScanVerdict = 'VALID'
  let reason: string | null = null

  const ticketStatus = (row.ticket_status || row.status || 'ACTIVE') as string

  if (row.qr_version !== parsed.qrVersion) {
    verdict = 'INVALID'
    reason = 'QR token version has been rotated or invalidated'
  } else if (ticketStatus !== 'ACTIVE') {
    verdict = 'REVOKED'
    reason = `Ticket is ${ticketStatus.toLowerCase()}`
  } else if (row.purchase_status !== 'PAID') {
    verdict = 'PAYMENT_NOT_APPROVED'
    reason = `Purchase status is ${row.purchase_status}`
  } else if (input.context === 'EVENT') {
    if (row.ticket_type !== 'EVENT_PASS') {
      verdict = 'WRONG_TICKET_TYPE'
      reason = 'Gate pass cannot be used for event admission'
    } else if (row.event_id !== input.event_id) {
      verdict = 'WRONG_EVENT'
      reason = `Ticket is issued for a different event (${row.event_title || row.event_id})`
    } else if (row.event_checked_in_at !== null) {
      verdict = 'ALREADY_USED'
      reason = 'Ticket has already been admitted to this event'
    } else if (now < row.valid_from) {
      verdict = 'NOT_YET_VALID'
      reason = 'Event validity window has not started'
    } else if (now > row.valid_to) {
      verdict = 'EXPIRED'
      reason = 'Event validity window has ended'
    }
  } else if (input.context === 'GATE') {
    if (now < row.valid_from) {
      verdict = 'NOT_YET_VALID'
      reason = 'Ticket validity window has not started'
    } else if (now > row.valid_to) {
      verdict = 'EXPIRED'
      reason = 'Ticket validity window has ended'
    }
  }

  // 5. Recent gate entry check (soft warning for re-entries)
  const recentGateLog = await db
    .prepare(
      `SELECT created_at FROM check_in_logs
       WHERE ticket_id = ? AND context = 'GATE' AND verdict = 'ADMITTED'
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(row.id)
    .first<{ created_at: number }>()

  const recentGateEntryAt = recentGateLog ? recentGateLog.created_at : null
  const recentGateEntryWarning =
    recentGateEntryAt && now - recentGateEntryAt < 15 * 60 * 1000
      ? 'Admitted at campus gate within the last 15 minutes'
      : null

  // 6. Build display payload (no phone or email)
  const isStudent = row.tier === 'STUDENT'
  const isCurrentlyValid =
    ticketStatus === 'ACTIVE' && now >= row.valid_from && now <= row.valid_to

  return {
    verdict,
    reason,
    ticket: {
      id: row.id,
      ticket_type: row.ticket_type,
      tier: row.tier,
      beneficiary_name: row.beneficiary_name,
      requires_id_check: isStudent,
      institution_name: isStudent ? row.institution_name : null,
      institution_id: isStudent ? row.institution_id : null,
      event: row.event_table_id
        ? {
            id: row.event_table_id,
            title: row.event_title,
            category: row.event_category,
            day_of_event: row.event_day,
          }
        : null,
      validity: {
        valid_from: row.valid_from,
        valid_to: row.valid_to,
        is_currently_valid: isCurrentlyValid,
      },
      event_checked_in_at: row.event_checked_in_at,
    },
    recent_gate_entry_at: recentGateEntryAt,
    recent_gate_entry_warning: recentGateEntryWarning,
  }
}

/**
 * Admits a ticket into GATE or EVENT.
 * Single-use race-safe check-in for EVENT with ux_checkin_event_once.
 * Repeatable, auditable admissions for GATE.
 */
export async function admitScan(
  db: D1Database,
  scanner: User,
  input: ScanAdmitInput,
  env: CloudflareBindings,
  now = Date.now()
): Promise<ScanAdmitResult> {
  // 1. Authorize scanner
  await assertScannerAuthorized(db, scanner, input.context, input.event_id)

  // 2. Validate token format and cryptographic signature
  const parsed = await verifyAndParseQrToken(input.token, env.TICKET_HMAC_SECRET)

  // 3. Client scan ID idempotent replay check
  if (input.client_scan_id) {
    const existingLog = await db
      .prepare('SELECT * FROM check_in_logs WHERE client_scan_id = ?')
      .bind(input.client_scan_id)
      .first<CheckInLog>()

    if (existingLog) {
      if (existingLog.ticket_id !== parsed.ticketId || existingLog.context !== input.context) {
        throw new AppError(
          409,
          'SCAN_ID_REUSED',
          'client_scan_id already used for a different scan request'
        )
      }
      return {
        success: true,
        verdict: 'ADMITTED',
        ticket_id: existingLog.ticket_id,
        log_id: existingLog.id,
        context: existingLog.context,
        event_id: existingLog.event_id,
        student_id_checked: existingLog.student_id_checked === 1,
        admitted_at: existingLog.created_at,
        idempotent_replay: true,
      }
    }
  }

  // 4. Retrieve ticket and verify trusted state
  const ticket = await db
    .prepare(
      `SELECT t.*, p.status as purchase_status
       FROM tickets t
       JOIN purchases p ON t.purchase_id = p.id
       WHERE t.id = ?`
    )
    .bind(parsed.ticketId)
    .first<Ticket & { purchase_status: PurchaseStatus }>()

  if (!ticket) {
    throw new AppError(400, 'INVALID_TICKET', 'Ticket identifier not found in system')
  }

  if (ticket.qr_version !== parsed.qrVersion) {
    throw new AppError(400, 'INVALID_QR_VERSION', 'QR token has been rotated or invalidated')
  }

  if (ticket.status !== 'ACTIVE') {
    throw new AppError(409, 'TICKET_REVOKED', `Ticket is ${ticket.status.toLowerCase()}`)
  }

  if (ticket.purchase_status !== 'PAID') {
    throw new AppError(409, 'PAYMENT_NOT_APPROVED', 'Ticket purchase has not been approved')
  }

  // Validity boundary check
  if (now < ticket.valid_from) {
    throw new AppError(400, 'NOT_YET_VALID', 'Ticket validity window has not started')
  }
  if (now > ticket.valid_to) {
    throw new AppError(400, 'EXPIRED', 'Ticket validity window has ended')
  }

  // Context-specific validations
  if (input.context === 'EVENT') {
    if (ticket.ticket_type !== 'EVENT_PASS') {
      throw new AppError(400, 'WRONG_TICKET_TYPE', 'Gate pass cannot be used for event admission')
    }
    if (ticket.event_id !== input.event_id) {
      throw new AppError(400, 'WRONG_EVENT', 'Ticket is not for this event')
    }
    if (ticket.event_checked_in_at !== null) {
      throw new AppError(409, 'ALREADY_CHECKED_IN', 'Ticket has already been admitted to this event')
    }
  }

  // Physical Student ID inspection verification
  if (ticket.tier === 'STUDENT' && !input.student_id_checked) {
    throw new AppError(
      400,
      'STUDENT_ID_CHECK_REQUIRED',
      'Physical student institution ID must be inspected and confirmed before admission'
    )
  }

  const logId = generateId()
  const studentIdCheckedNum = input.student_id_checked ? 1 : 0
  const statements: D1PreparedStatement[] = []

  if (input.context === 'EVENT') {
    // Guards for atomic single-use event check-in
    statements.push(
      guardUnless(
        db,
        `EXISTS (
          SELECT 1 FROM tickets
          WHERE id = ? AND status = 'ACTIVE' AND event_checked_in_at IS NULL
            AND valid_from <= ? AND valid_to >= ?
        )`,
        [ticket.id, now, now]
      )
    )

    statements.push(
      guardUnless(
        db,
        `EXISTS (SELECT 1 FROM purchases WHERE id = ? AND status = 'PAID')`,
        [ticket.purchase_id]
      )
    )

    statements.push(
      db
        .prepare(
          `UPDATE tickets SET event_checked_in_at = ?, updated_at = ?
           WHERE id = ? AND event_checked_in_at IS NULL AND status = 'ACTIVE'`
        )
        .bind(now, now, ticket.id)
    )

    statements.push(
      guardVerifyRow(
        db,
        'tickets',
        'id = ? AND event_checked_in_at = ?',
        [ticket.id, now]
      )
    )

    statements.push(
      db
        .prepare(
          `INSERT INTO check_in_logs (
            id, ticket_id, context, event_id, scanner_id, verdict,
            reason, student_id_checked, client_scan_id, created_at
          ) VALUES (?, ?, 'EVENT', ?, ?, 'ADMITTED', NULL, ?, ?, ?)`
        )
        .bind(
          logId,
          ticket.id,
          input.event_id,
          scanner.id,
          studentIdCheckedNum,
          input.client_scan_id || null,
          now
        )
    )
  } else {
    // GATE context: Repeatable admission, does not consume ticket
    statements.push(
      guardUnless(
        db,
        `EXISTS (
          SELECT 1 FROM tickets
          WHERE id = ? AND status = 'ACTIVE' AND valid_from <= ? AND valid_to >= ?
        )`,
        [ticket.id, now, now]
      )
    )

    statements.push(
      guardUnless(
        db,
        `EXISTS (SELECT 1 FROM purchases WHERE id = ? AND status = 'PAID')`,
        [ticket.purchase_id]
      )
    )

    statements.push(
      db
        .prepare(
          `INSERT INTO check_in_logs (
            id, ticket_id, context, event_id, scanner_id, verdict,
            reason, student_id_checked, client_scan_id, created_at
          ) VALUES (?, ?, 'GATE', NULL, ?, 'ADMITTED', NULL, ?, ?, ?)`
        )
        .bind(
          logId,
          ticket.id,
          scanner.id,
          studentIdCheckedNum,
          input.client_scan_id || null,
          now
        )
    )
  }

  try {
    await executeBatch(db, statements, {
      customGuardMessage:
        input.context === 'EVENT'
          ? 'Event check-in failed: ticket already admitted or condition changed'
          : 'Gate check-in failed: ticket condition changed or not active',
    })
  } catch (err) {
    // Reread ticket to confirm race condition on event double-scan
    if (input.context === 'EVENT') {
      const refreshed = await db
        .prepare('SELECT event_checked_in_at FROM tickets WHERE id = ?')
        .bind(ticket.id)
        .first<{ event_checked_in_at: number | null }>()

      if (refreshed?.event_checked_in_at) {
        throw new AppError(409, 'ALREADY_CHECKED_IN', 'Ticket has already been admitted to this event')
      }
    }
    throw err
  }

  return {
    success: true,
    verdict: 'ADMITTED',
    ticket_id: ticket.id,
    log_id: logId,
    context: input.context,
    event_id: input.context === 'EVENT' ? input.event_id || null : null,
    student_id_checked: Boolean(input.student_id_checked),
    admitted_at: now,
  }
}

/**
 * Records a denial with a bounded reason and audit trail.
 * Does not let deny bypass scanner authorization.
 */
export async function denyScan(
  db: D1Database,
  scanner: User,
  input: ScanDenyInput,
  env: CloudflareBindings,
  now = Date.now()
): Promise<ScanDenyResult> {
  // 1. Authorize scanner
  await assertScannerAuthorized(db, scanner, input.context, input.event_id)

  // 2. Cryptographic signature and format validation
  const parsed = await verifyAndParseQrToken(input.token, env.TICKET_HMAC_SECRET)

  // 3. Client scan ID replay check
  if (input.client_scan_id) {
    const existingLog = await db
      .prepare('SELECT * FROM check_in_logs WHERE client_scan_id = ?')
      .bind(input.client_scan_id)
      .first<CheckInLog>()

    if (existingLog) {
      if (existingLog.ticket_id !== parsed.ticketId || existingLog.context !== input.context) {
        throw new AppError(
          409,
          'SCAN_ID_REUSED',
          'client_scan_id already used for a different scan request'
        )
      }
      return {
        success: false,
        verdict: 'DENIED',
        ticket_id: existingLog.ticket_id,
        log_id: existingLog.id,
        context: existingLog.context,
        reason: existingLog.reason || input.reason,
        denied_at: existingLog.created_at,
        idempotent_replay: true,
      }
    }
  }

  const boundedReason = input.reason.trim().slice(0, 250)
  if (!boundedReason) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Denial reason must be provided')
  }

  const logId = generateId()
  const studentIdCheckedNum = input.student_id_checked ? 1 : 0

  await db
    .prepare(
      `INSERT INTO check_in_logs (
        id, ticket_id, context, event_id, scanner_id, verdict,
        reason, student_id_checked, client_scan_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      logId,
      parsed.ticketId,
      input.context,
      input.context === 'EVENT' ? input.event_id || null : null,
      scanner.id,
      'DENIED',
      boundedReason,
      studentIdCheckedNum,
      input.client_scan_id || null,
      now
    )
    .run()

  return {
    success: false,
    verdict: 'DENIED',
    ticket_id: parsed.ticketId,
    log_id: logId,
    context: input.context,
    reason: boundedReason,
    denied_at: now,
  }
}

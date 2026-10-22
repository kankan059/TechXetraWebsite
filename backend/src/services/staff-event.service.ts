import { AppError } from '../common/errors'
import { isSuperAdmin, isEventStaff } from './authz.service'
import { getEventByIdOrSlug, formatPublicEvent, updateEvent } from './event.service'
import { approvePayment, rejectPayment, holdPayment } from './payment.service'
import type { User, Event, EventStaffRole } from '../types'

export interface StaffEventSummary {
  id: string
  slug: string
  title: string
  category: string
  role: 'LEAD' | 'VOLUNTEER' | 'SUPER_ADMIN'
  day_of_event: number
  venue: string | null
  status: string
  capacity: number | null
  seats_taken: number
  seats_remaining: number | null
  confirmed_registrations_count: number
  reserved_registrations_count: number
  pending_payments_count: number
}

/**
 * Returns all events assigned to the authenticated user.
 * If user is SUPER_ADMIN, returns all events.
 */
export async function getMyStaffEvents(
  db: D1Database,
  user: User
): Promise<StaffEventSummary[]> {
  const isSuper = isSuperAdmin(user)

  const sql = isSuper
    ? `SELECT
         e.*,
         'SUPER_ADMIN' as staff_role,
         (SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED') as confirmed_count,
         (SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'RESERVED') as reserved_count,
         (SELECT count(DISTINCT p.id)
          FROM payments p
          JOIN purchases pur ON p.purchase_id = pur.id
          JOIN purchase_items pi ON pi.purchase_id = pur.id
          WHERE pi.event_id = e.id AND p.status IN ('PENDING', 'ON_HOLD')) as pending_payments_count
       FROM events e
       ORDER BY e.day_of_event ASC, e.starts_at ASC`
    : `SELECT
         e.*,
         es.role as staff_role,
         (SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED') as confirmed_count,
         (SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'RESERVED') as reserved_count,
         (SELECT count(DISTINCT p.id)
          FROM payments p
          JOIN purchases pur ON p.purchase_id = pur.id
          JOIN purchase_items pi ON pi.purchase_id = pur.id
          WHERE pi.event_id = e.id AND p.status IN ('PENDING', 'ON_HOLD')) as pending_payments_count
       FROM event_staff es
       JOIN events e ON es.event_id = e.id
       WHERE es.user_id = ?
       ORDER BY e.day_of_event ASC, e.starts_at ASC`

  const stmt = isSuper ? db.prepare(sql) : db.prepare(sql).bind(user.id)
  const rows = await stmt.all<any>()

  return (rows.results || []).map((row) => {
    const seatsRemaining =
      row.capacity === null ? null : Math.max(0, row.capacity - row.seats_taken)
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      role: row.staff_role as 'LEAD' | 'VOLUNTEER' | 'SUPER_ADMIN',
      day_of_event: row.day_of_event,
      venue: row.venue,
      status: row.status,
      capacity: row.capacity,
      seats_taken: row.seats_taken,
      seats_remaining: seatsRemaining,
      confirmed_registrations_count: row.confirmed_count || 0,
      reserved_registrations_count: row.reserved_count || 0,
      pending_payments_count: row.pending_payments_count || 0,
    }
  })
}

/**
 * Returns complete dashboard metrics, details and staff roster for a single event.
 */
export async function getStaffEventDashboard(
  db: D1Database,
  eventId: string,
  now = Date.now()
): Promise<any> {
  const event = await getEventByIdOrSlug(db, eventId)
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  // Aggregate metrics
  const counts = await db
    .prepare(
      `SELECT
         (SELECT count(*) FROM registrations WHERE event_id = ? AND status = 'CONFIRMED') as confirmed_count,
         (SELECT count(*) FROM registrations WHERE event_id = ? AND status = 'RESERVED') as reserved_count,
         (SELECT count(*) FROM check_in_logs WHERE event_id = ? AND context = 'EVENT' AND verdict = 'ADMITTED') as checked_in_count,
         (SELECT count(DISTINCT p.id)
          FROM payments p
          JOIN purchases pur ON p.purchase_id = pur.id
          JOIN purchase_items pi ON pi.purchase_id = pur.id
          WHERE pi.event_id = ? AND p.status IN ('PENDING', 'ON_HOLD')) as pending_payments_count`
    )
    .bind(event.id, event.id, event.id, event.id)
    .first<{
      confirmed_count: number
      reserved_count: number
      checked_in_count: number
      pending_payments_count: number
    }>()

  // Staff roster
  const staff = await db
    .prepare(
      `SELECT es.role, es.assigned_at, u.id as user_id, u.name, u.email, u.phone
       FROM event_staff es
       JOIN users u ON es.user_id = u.id
       WHERE es.event_id = ?
       ORDER BY es.role ASC, u.name ASC`
    )
    .bind(event.id)
    .all<any>()

  return {
    event: formatPublicEvent(event, now),
    metrics: {
      capacity: event.capacity,
      seats_taken: event.seats_taken,
      seats_remaining:
        event.capacity === null ? null : Math.max(0, event.capacity - event.seats_taken),
      confirmed_registrations: counts?.confirmed_count || 0,
      reserved_registrations: counts?.reserved_count || 0,
      checked_in_count: counts?.checked_in_count || 0,
      pending_payments_count: counts?.pending_payments_count || 0,
    },
    staff: staff.results || [],
  }
}

/**
 * Returns attendee roster with custom form responses and check-in status.
 */
export async function getStaffEventRegistrations(
  db: D1Database,
  eventId: string,
  search?: string
): Promise<any[]> {
  const conditions: string[] = ['r.event_id = ?']
  const bindings: any[] = [eventId]

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`
    conditions.push('(lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR lower(t.name) LIKE ?)')
    bindings.push(term, term, term)
  }

  const sql = `
    SELECT
      r.id as registration_id,
      r.status as registration_status,
      r.seat_count,
      r.form_responses,
      r.created_at as registered_at,
      u.id as participant_id,
      u.name as participant_name,
      u.email as participant_email,
      u.phone as participant_phone,
      u.institution_name,
      u.institution_id,
      t.id as team_id,
      t.name as team_name,
      tk.id as ticket_id,
      tk.status as ticket_status,
      tk.event_checked_in_at
    FROM registrations r
    JOIN users u ON r.participant_id = u.id
    LEFT JOIN teams t ON r.team_id = t.id
    LEFT JOIN tickets tk ON tk.event_id = r.event_id AND tk.beneficiary_id = r.participant_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.created_at DESC
  `

  const rows = await db.prepare(sql).bind(...bindings).all<any>()

  return (rows.results || []).map((row) => {
    let parsedResponses: Record<string, any> | null = null
    if (row.form_responses) {
      try {
        parsedResponses = JSON.parse(row.form_responses)
      } catch {
        parsedResponses = null
      }
    }

    return {
      registration_id: row.registration_id,
      status: row.registration_status,
      seat_count: row.seat_count,
      registered_at: row.registered_at,
      participant: {
        id: row.participant_id,
        name: row.participant_name,
        email: row.participant_email,
        phone: row.participant_phone,
        institution_name: row.institution_name,
        institution_id: row.institution_id,
      },
      team: row.team_id
        ? {
            id: row.team_id,
            name: row.team_name,
          }
        : null,
      ticket: row.ticket_id
        ? {
            id: row.ticket_id,
            status: row.ticket_status,
            checked_in: row.event_checked_in_at !== null,
            checked_in_at: row.event_checked_in_at,
          }
        : null,
      form_responses: parsedResponses,
    }
  })
}

/**
 * Returns payment verification queue for purchases that include this event.
 */
export async function getStaffEventPayments(
  db: D1Database,
  eventId: string,
  statusFilter?: string
): Promise<any[]> {
  const conditions: string[] = ['pi.event_id = ?']
  const bindings: any[] = [eventId]

  if (statusFilter) {
    conditions.push('p.status = ?')
    bindings.push(statusFilter)
  }

  const sql = `
    SELECT DISTINCT
      p.id as payment_id,
      p.purchase_id,
      p.transaction_id,
      p.expected_amount_paise,
      p.status as payment_status,
      p.rejection_reason,
      p.created_at as submitted_at,
      p.reviewed_at,
      u.id as buyer_id,
      u.name as buyer_name,
      u.email as buyer_email,
      u.phone as buyer_phone,
      pur.total_amount_paise,
      pur.status as purchase_status
    FROM payments p
    JOIN purchases pur ON p.purchase_id = pur.id
    JOIN purchase_items pi ON pi.purchase_id = pur.id
    JOIN users u ON pur.buyer_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.created_at DESC
  `

  const rows = await db.prepare(sql).bind(...bindings).all<any>()
  return rows.results || []
}

/**
 * Review a payment associated with this event.
 * Enforces no self-review invariant.
 */
export async function reviewStaffEventPayment(
  db: D1Database,
  eventId: string,
  paymentId: string,
  actor: User,
  action: 'APPROVE' | 'REJECT' | 'HOLD',
  reason?: string,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<any> {
  // Verify payment belongs to a purchase containing this event
  const exists = await db
    .prepare(
      `SELECT 1
       FROM payments p
       JOIN purchase_items pi ON pi.purchase_id = p.purchase_id
       WHERE p.id = ? AND pi.event_id = ?
       LIMIT 1`
    )
    .bind(paymentId, eventId)
    .first()

  if (!exists) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found for this event')
  }

  if (action === 'APPROVE') {
    return await approvePayment(db, paymentId, actor, meta)
  }

  if (action === 'REJECT') {
    return await rejectPayment(
      db,
      paymentId,
      actor,
      reason || 'Payment rejected by event committee',
      meta
    )
  }

  if (action === 'HOLD') {
    return await holdPayment(db, paymentId, actor, reason, meta)
  }

  throw new AppError(400, 'VALIDATION_ERROR', `Invalid review action: ${action}`)
}

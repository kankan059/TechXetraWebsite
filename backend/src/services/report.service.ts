import { AppError } from '../common/errors'
import { executeBatch } from '../db/batch'
import { createAuditStatement } from './audit.service'
import type { User, Event } from '../types'

export async function getSalesReport(db: D1Database): Promise<any> {
  const byStatus = await db
    .prepare(
      `SELECT status, count(*) as count, coalesce(sum(total_amount_paise), 0) as total_amount_paise
       FROM purchases
       GROUP BY status`
    )
    .all<any>()

  const byItemType = await db
    .prepare(
      `SELECT pi.item_type, pi.tier, count(*) as count, coalesce(sum(pi.unit_price_paise), 0) as total_amount_paise
       FROM purchase_items pi
       JOIN purchases p ON pi.purchase_id = p.id
       WHERE p.status = 'PAID'
       GROUP BY pi.item_type, pi.tier`
    )
    .all<any>()

  const paidRow = (byStatus.results || []).find((s) => s.status === 'PAID')

  return {
    totals_by_status: byStatus.results || [],
    paid_total_amount_paise: paidRow ? paidRow.total_amount_paise : 0,
    paid_count: paidRow ? paidRow.count : 0,
    items_breakdown: byItemType.results || [],
  }
}

export async function getPendingVerificationReport(
  db: D1Database,
  now = Date.now()
): Promise<any> {
  const pendingPayments = await db
    .prepare(
      `SELECT p.id as payment_id, p.purchase_id, p.expected_amount_paise, p.transaction_id,
              p.status, p.created_at, pur.buyer_id, u.name as buyer_name, u.email as buyer_email
       FROM payments p
       JOIN purchases pur ON p.purchase_id = pur.id
       JOIN users u ON pur.buyer_id = u.id
       WHERE p.status IN ('PENDING', 'ON_HOLD')
       ORDER BY p.created_at ASC`
    )
    .all<any>()

  const items = pendingPayments.results || []
  const count = items.length
  let oldestTimestamp: number | null = null
  let oldestAgeMs: number | null = null
  let overdueCount = 0

  if (count > 0 && items[0]) {
    const oldest = Number(items[0].created_at)
    oldestTimestamp = oldest
    oldestAgeMs = now - oldest
    overdueCount = items.filter((p) => now - p.created_at > 24 * 60 * 60 * 1000).length
  }

  return {
    pending_count: count,
    oldest_timestamp: oldestTimestamp,
    oldest_age_ms: oldestAgeMs,
    overdue_count: overdueCount,
    items: items.map((i) => ({
      ...i,
      age_ms: now - i.created_at,
      is_overdue: now - i.created_at > 24 * 60 * 60 * 1000,
    })),
  }
}

export async function getEventRegistrationsReport(db: D1Database): Promise<any> {
  const rows = await db
    .prepare(
      `SELECT e.id as event_id, e.slug, e.title, e.category, e.day_of_event, e.capacity, e.seats_taken,
        coalesce((SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED'), 0) as confirmed_registrations_count,
        coalesce((SELECT sum(seat_count) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED'), 0) as confirmed_seats_count,
        coalesce((SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'RESERVED'), 0) as reserved_registrations_count,
        coalesce((SELECT sum(seat_count) FROM registrations r WHERE r.event_id = e.id AND r.status = 'RESERVED'), 0) as reserved_seats_count
       FROM events e
       ORDER BY e.day_of_event ASC, e.title ASC`
    )
    .all<any>()

  return rows.results || []
}

export async function getSeatReconciliationReport(db: D1Database): Promise<any> {
  const events = await db
    .prepare(
      `SELECT e.id as event_id, e.title, e.slug, e.capacity, e.seats_taken,
        coalesce((SELECT sum(seat_count) FROM registrations r WHERE r.event_id = e.id AND r.status IN ('CONFIRMED', 'RESERVED')), 0) as recount_seats,
        coalesce((SELECT sum(seat_count) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED'), 0) as confirmed_seats,
        coalesce((SELECT sum(seat_count) FROM registrations r WHERE r.event_id = e.id AND r.status = 'RESERVED'), 0) as reserved_seats
       FROM events e`
    )
    .all<any>()

  const results = (events.results || []).map((e) => ({
    ...e,
    has_discrepancy: e.seats_taken !== e.recount_seats,
    discrepancy_amount: e.seats_taken - e.recount_seats,
  }))

  const hasAnyDiscrepancy = results.some((r) => r.has_discrepancy)

  return {
    has_any_discrepancy: hasAnyDiscrepancy,
    events: results,
  }
}

export async function fixEventSeatsReconciliation(
  db: D1Database,
  eventId: string,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ fixed: boolean; event_id: string; previous_seats: number; new_seats: number }> {
  const now = meta?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can reconcile event seats')
  }

  const event = await db.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first<Event>()
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  const recountRow = await db
    .prepare(
      `SELECT coalesce(sum(seat_count), 0) as recount_seats
       FROM registrations
       WHERE event_id = ? AND status IN ('CONFIRMED', 'RESERVED')`
    )
    .bind(eventId)
    .first<{ recount_seats: number }>()

  const recountSeats = recountRow?.recount_seats || 0

  const statements: D1PreparedStatement[] = [
    db
      .prepare('UPDATE events SET seats_taken = ?, updated_at = ? WHERE id = ?')
      .bind(recountSeats, now, event.id),
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'SEATS_RECONCILED',
      targetType: 'EVENT',
      targetId: event.id,
      beforeJson: { seats_taken: event.seats_taken },
      afterJson: { seats_taken: recountSeats },
      reason: 'Admin seat reconciliation recount fix',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    }),
  ]

  await executeBatch(db, statements)

  return {
    fixed: true,
    event_id: event.id,
    previous_seats: event.seats_taken,
    new_seats: recountSeats,
  }
}

export async function getAttendanceReport(db: D1Database): Promise<any> {
  const gateByDay = await db
    .prepare(
      `SELECT fd.day_number, fd.date, count(cl.id) as admissions_count
       FROM fest_days fd
       LEFT JOIN check_in_logs cl ON cl.context = 'GATE' AND cl.verdict = 'ADMITTED'
         AND cl.created_at >= fd.starts_at AND cl.created_at <= fd.ends_at
       GROUP BY fd.day_number, fd.date
       ORDER BY fd.day_number ASC`
    )
    .all<any>()

  const eventAdmissions = await db
    .prepare(
      `SELECT e.id as event_id, e.title as event_title, e.day_of_event, count(cl.id) as admissions_count
       FROM events e
       LEFT JOIN check_in_logs cl ON cl.event_id = e.id AND cl.context = 'EVENT' AND cl.verdict = 'ADMITTED'
       GROUP BY e.id, e.title, e.day_of_event
       ORDER BY e.day_of_event ASC, e.title ASC`
    )
    .all<any>()

  const uniqueGateAttendees = await db
    .prepare(
      `SELECT count(DISTINCT t.beneficiary_id) as count
       FROM check_in_logs cl
       JOIN tickets t ON cl.ticket_id = t.id
       WHERE cl.context = 'GATE' AND cl.verdict = 'ADMITTED'`
    )
    .first<{ count: number }>()

  return {
    gate_admissions_by_day: gateByDay.results || [],
    event_admissions: eventAdmissions.results || [],
    unique_gate_attendees_count: uniqueGateAttendees?.count || 0,
  }
}

export async function getFailedFulfillmentReport(db: D1Database): Promise<any> {
  const rows = await db
    .prepare(
      `SELECT p.id as purchase_id, p.buyer_id, u.name as buyer_name, u.email as buyer_email,
              p.total_amount_paise, p.fulfillment_attempts, p.fulfillment_last_error, p.updated_at
       FROM purchases p
       JOIN users u ON p.buyer_id = u.id
       WHERE p.status = 'PAID' AND p.fulfillment_status = 'FAILED'
       ORDER BY p.updated_at DESC`
    )
    .all<any>()

  return {
    failed_count: (rows.results || []).length,
    purchases: rows.results || [],
  }
}

export async function getStudentTierReport(db: D1Database): Promise<any> {
  const userCounts = await db
    .prepare(
      `SELECT is_student, count(*) as count
       FROM users
       GROUP BY is_student`
    )
    .all<any>()

  const ticketCounts = await db
    .prepare(
      `SELECT tier, count(*) as count
       FROM tickets
       GROUP BY tier`
    )
    .all<any>()

  const purchaseItemCounts = await db
    .prepare(
      `SELECT tier, count(*) as count
       FROM purchase_items
       GROUP BY tier`
    )
    .all<any>()

  return {
    users: userCounts.results || [],
    tickets: ticketCounts.results || [],
    purchase_items: purchaseItemCounts.results || [],
  }
}

export async function getDuplicateInstitutionsReport(db: D1Database): Promise<any> {
  const rows = await db
    .prepare(
      `SELECT institution_id, count(id) as user_count, group_concat(email) as emails, group_concat(name) as names
       FROM users
       WHERE institution_id IS NOT NULL AND length(trim(institution_id)) > 0
       GROUP BY lower(trim(institution_id))
       HAVING count(id) > 1
       ORDER BY user_count DESC`
    )
    .all<any>()

  return {
    duplicate_count: (rows.results || []).length,
    institutions: (rows.results || []).map((r) => ({
      institution_id: r.institution_id,
      user_count: r.user_count,
      emails: r.emails ? r.emails.split(',') : [],
      names: r.names ? r.names.split(',') : [],
    })),
  }
}

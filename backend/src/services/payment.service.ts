import { AppError } from '../common/errors'
import { generateId, normalizeTransactionId, paiseToRupees } from '../common/utils'
import { executeBatch, guardUnless, guardWhen, guardVerifyRow } from '../db/batch'
import { createAuditStatement } from './audit.service'
import { getPurchaseById, releasePurchase, DEFAULT_PURCHASE_RESERVATION_TTL_MS } from './purchase.service'
import type { Payment, Purchase, User } from '../types'
import type { CloudflareBindings } from '../types/env'

export interface PaymentInstructionsResponse {
  purchase_id: string
  amount_paise: number
  amount_rupees: string
  payee_vpa: string
  payee_name: string
  upi_uri: string
  reservation_expires_at: number | null
}

export async function getPaymentInstructions(
  db: D1Database,
  purchaseId: string,
  user: User,
  env: CloudflareBindings,
  now = Date.now()
): Promise<PaymentInstructionsResponse> {
  const purchase = await getPurchaseById(db, purchaseId)
  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  // Owner check (existence hiding)
  if (purchase.buyer_id !== user.id && user.role !== 'SUPER_ADMIN') {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  if (purchase.status !== 'AWAITING_PAYMENT') {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `Payment instructions are only available for purchases awaiting payment (current: ${purchase.status})`
    )
  }

  if (purchase.reservation_expires_at && purchase.reservation_expires_at <= now) {
    throw new AppError(
      400,
      'BAD_REQUEST',
      'The reservation window for this purchase has expired. Please create a new purchase.'
    )
  }

  const amountRupees = paiseToRupees(purchase.total_amount_paise)
  const payeeVpa = env.UPI_VPA || 'techxetra@upi'
  const payeeName = env.UPI_PAYEE_NAME || 'TechXetra 2026'
  const note = `TechXetra ${purchase.id.slice(0, 8)}`

  const upiUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${encodeURIComponent(amountRupees)}&cu=INR&tn=${encodeURIComponent(note)}`

  return {
    purchase_id: purchase.id,
    amount_paise: purchase.total_amount_paise,
    amount_rupees: amountRupees,
    payee_vpa: payeeVpa,
    payee_name: payeeName,
    upi_uri: upiUri,
    reservation_expires_at: purchase.reservation_expires_at,
  }
}

export async function submitUpiPayment(
  db: D1Database,
  purchaseId: string,
  rawUtr: string,
  buyer: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<Payment> {
  const now = meta?.now || Date.now()
  const utr = normalizeTransactionId(rawUtr)

  // 1. Fetch purchase
  const purchase = await db
    .prepare('SELECT * FROM purchases WHERE id = ?')
    .bind(purchaseId)
    .first<Purchase>()

  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  if (purchase.buyer_id !== buyer.id) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  // 2. Check if this purchase already has a pending payment
  const activeAttempt = await db
    .prepare(
      "SELECT * FROM payments WHERE purchase_id = ? AND status IN ('PENDING', 'ON_HOLD') LIMIT 1"
    )
    .bind(purchase.id)
    .first<Payment>()

  if (activeAttempt) {
    // If same UTR submitted again: idempotent retry, return existing attempt!
    if (activeAttempt.transaction_id === utr) {
      return activeAttempt
    }
    // Different UTR while another attempt is pending
    throw new AppError(
      409,
      'PAYMENT_ALREADY_SUBMITTED',
      'A payment attempt is already pending verification for this purchase'
    )
  }

  // 3. Check if UTR is already used by another active payment
  const duplicateUtr = await db
    .prepare(
      "SELECT id, purchase_id FROM payments WHERE transaction_id = ? AND status IN ('PENDING', 'ON_HOLD', 'SUCCESS') LIMIT 1"
    )
    .bind(utr)
    .first<{ id: string; purchase_id: string }>()

  if (duplicateUtr) {
    throw new AppError(
      409,
      'UTR_ALREADY_USED',
      'This transaction ID / UTR has already been submitted for another payment'
    )
  }

  // 4. Verify purchase status
  if (purchase.status !== 'AWAITING_PAYMENT') {
    throw new AppError(
      409,
      'CONFLICT',
      `Cannot submit payment for purchase in ${purchase.status} status`
    )
  }

  // Handle expired reservation revival: if expired, verify seats can still be re-reserved
  if (purchase.reservation_expires_at && purchase.reservation_expires_at <= now) {
    throw new AppError(
      409,
      'RESERVATION_EXPIRED_CONTACT_SUPPORT',
      'Reservation has expired and could not be automatically renewed. Please contact support.'
    )
  }

  const paymentId = generateId()
  const paymentAuditId = generateId()

  const newPayment: Payment = {
    id: paymentId,
    purchase_id: purchase.id,
    expected_amount_paise: purchase.total_amount_paise,
    transaction_id: utr,
    status: 'PENDING',
    reviewer_id: null,
    reviewed_at: null,
    rejection_reason: null,
    internal_note: null,
    resubmitted_from_payment_id: null,
    created_at: now,
    updated_at: now,
  }

  const statements: D1PreparedStatement[] = []

  // Guard: purchase still in AWAITING_PAYMENT
  statements.push(
    guardUnless(
      db,
      "EXISTS (SELECT 1 FROM purchases WHERE id = ? AND status = 'AWAITING_PAYMENT')",
      [purchase.id]
    )
  )

  // Insert payment attempt
  statements.push(
    db
      .prepare(
        `INSERT INTO payments (
          id, purchase_id, expected_amount_paise, transaction_id, status,
          reviewer_id, reviewed_at, rejection_reason, internal_note,
          resubmitted_from_payment_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        newPayment.id,
        newPayment.purchase_id,
        newPayment.expected_amount_paise,
        newPayment.transaction_id,
        newPayment.status,
        newPayment.reviewer_id,
        newPayment.reviewed_at,
        newPayment.rejection_reason,
        newPayment.internal_note,
        newPayment.resubmitted_from_payment_id,
        now,
        now
      )
  )

  // Transition purchase to PENDING_VERIFICATION
  statements.push(
    db
      .prepare(
        `UPDATE purchases SET
          status = 'PENDING_VERIFICATION',
          payment_method = 'UPI',
          updated_at = ?
        WHERE id = ? AND status = 'AWAITING_PAYMENT'`
      )
      .bind(now, purchase.id)
  )

  statements.push(
    guardVerifyRow(
      db,
      'purchases',
      "id = ? AND status = 'PENDING_VERIFICATION'",
      [purchase.id]
    )
  )

  // Payment audit log
  statements.push(
    db
      .prepare(
        `INSERT INTO payment_audit_logs (
          id, payment_id, purchase_id, actor_id, action, before_status, after_status,
          reason, internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentAuditId,
        paymentId,
        purchase.id,
        buyer.id,
        'PAYMENT_SUBMITTED',
        null,
        'PENDING',
        'Buyer submitted UPI transaction reference',
        null,
        now
      )
  )

  await executeBatch(db, statements, {
    customGuardMessage: 'Failed to submit payment: purchase status changed or transaction ID already in use',
  })

  return newPayment
}

export interface ReviewerQueueFilters {
  status?: string
  search?: string
  limit?: number
  cursor?: string
}

export async function getReviewerPaymentsQueue(
  db: D1Database,
  filters: ReviewerQueueFilters,
  now = Date.now()
): Promise<{ payments: any[]; next_cursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit || 20, 1), 50)
  const conditions: string[] = []
  const bindings: any[] = []

  if (filters.status) {
    conditions.push('p.status = ?')
    bindings.push(filters.status)
  }

  if (filters.search) {
    const rawTerm = filters.search.trim()
    const termUpper = `%${rawTerm.toUpperCase()}%`
    const termLower = `%${rawTerm.toLowerCase()}%`
    conditions.push('(p.transaction_id LIKE ? OR u.email LIKE ? OR pur.id LIKE ?)')
    bindings.push(termUpper, termLower, `%${rawTerm}%`)
  }

  if (filters.cursor) {
    conditions.push('(p.created_at > ? OR (p.created_at = ? AND p.id > ?))')
    const [cursorTime, cursorId] = filters.cursor.split(':')
    bindings.push(parseInt(cursorTime, 10), parseInt(cursorTime, 10), cursorId)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `
    SELECT p.*,
      pur.buyer_id, pur.total_amount_paise,
      u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone,
      (SELECT count(*) FROM payments p2 WHERE p2.transaction_id = p.transaction_id AND p2.id != p.id) as duplicate_utr_matches
    FROM payments p
    JOIN purchases pur ON p.purchase_id = pur.id
    JOIN users u ON pur.buyer_id = u.id
    ${whereClause}
    ORDER BY p.created_at ASC, p.id ASC
    LIMIT ?
  `
  bindings.push(limit + 1)

  const rows = await db.prepare(sql).bind(...bindings).all<any>()
  const items = rows.results || []

  const hasNextPage = items.length > limit
  const pagedItems = hasNextPage ? items.slice(0, limit) : items

  let nextCursor: string | null = null
  if (hasNextPage && pagedItems.length > 0) {
    const last = pagedItems[pagedItems.length - 1]
    nextCursor = `${last.created_at}:${last.id}`
  }

  const enriched = pagedItems.map((p) => ({
    ...p,
    is_overdue: p.status === 'PENDING' && now - p.created_at > 24 * 60 * 60 * 1000,
  }))

  return { payments: enriched, next_cursor: nextCursor }
}

export async function getPaymentDetail(
  db: D1Database,
  paymentId: string
): Promise<any> {
  const payment = await db
    .prepare(
      `SELECT p.*,
        pur.total_amount_paise, pur.status as purchase_status,
        u.id as buyer_id, u.name as buyer_name, u.email as buyer_email,
        u.phone as buyer_phone, u.institution_name, u.institution_id
       FROM payments p
       JOIN purchases pur ON p.purchase_id = pur.id
       JOIN users u ON pur.buyer_id = u.id
       WHERE p.id = ?`
    )
    .bind(paymentId)
    .first<any>()

  if (!payment) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found')
  }

  // Fetch all attempts for this purchase
  const attempts = await db
    .prepare('SELECT * FROM payments WHERE purchase_id = ? ORDER BY created_at ASC')
    .bind(payment.purchase_id)
    .all<Payment>()

  // Fetch all duplicate UTR occurrences across the system
  const matchingUtrs = await db
    .prepare(
      `SELECT p.id, p.purchase_id, p.status, p.created_at, pur.buyer_id, u.email as buyer_email
       FROM payments p
       JOIN purchases pur ON p.purchase_id = pur.id
       JOIN users u ON pur.buyer_id = u.id
       WHERE p.transaction_id = ? AND p.id != ?`
    )
    .bind(payment.transaction_id, payment.id)
    .all<any>()

  // Fetch items in the purchase
  const items = await db
    .prepare('SELECT * FROM purchase_items WHERE purchase_id = ?')
    .bind(payment.purchase_id)
    .all<any>()

  return {
    ...payment,
    attempts: attempts.results || [],
    matching_utr_attempts: matchingUtrs.results || [],
    purchase_items: items.results || [],
  }
}

export async function approvePayment(
  db: D1Database,
  paymentId: string,
  reviewer: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<Payment> {
  const now = meta?.now || Date.now()

  // 1. Fetch payment and purchase
  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>()
  if (!payment) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found')
  }

  const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(payment.purchase_id).first<Purchase>()
  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  // 2. Self-review prohibition: Reviewer cannot approve own purchase!
  if (purchase.buyer_id === reviewer.id) {
    throw new AppError(403, 'FORBIDDEN', 'Payment reviewers cannot approve their own purchases')
  }

  // Repeating approval returns existing success
  if (payment.status === 'SUCCESS' && purchase.status === 'PAID') {
    return payment
  }

  if (payment.status !== 'PENDING' && payment.status !== 'ON_HOLD') {
    throw new AppError(
      409,
      'CONFLICT',
      `Payment is in ${payment.status} status and cannot be approved`
    )
  }

  if (purchase.status !== 'PENDING_VERIFICATION') {
    throw new AppError(
      409,
      'CONFLICT',
      `Purchase is in ${purchase.status} status and cannot be approved`
    )
  }

  const paymentAuditId = generateId()
  const statements: D1PreparedStatement[] = []

  // Guard: payment still pending or on-hold
  statements.push(
    guardUnless(
      db,
      `EXISTS (SELECT 1 FROM payments WHERE id = ? AND status IN ('PENDING', 'ON_HOLD'))`,
      [payment.id]
    )
  )

  // Guard: purchase still in PENDING_VERIFICATION
  statements.push(
    guardUnless(
      db,
      `EXISTS (SELECT 1 FROM purchases WHERE id = ? AND status = 'PENDING_VERIFICATION')`,
      [purchase.id]
    )
  )

  // Transition payment to SUCCESS
  statements.push(
    db
      .prepare(
        `UPDATE payments SET
          status = 'SUCCESS',
          reviewer_id = ?,
          reviewed_at = ?,
          updated_at = ?
        WHERE id = ? AND status IN ('PENDING', 'ON_HOLD')`
      )
      .bind(reviewer.id, now, now, payment.id)
  )

  statements.push(guardVerifyRow(db, 'payments', `id = ? AND status = 'SUCCESS'`, [payment.id]))

  // Transition purchase to PAID
  statements.push(
    db
      .prepare(
        `UPDATE purchases SET
          status = ?,
          updated_at = ?
        WHERE id = ? AND status = 'PENDING_VERIFICATION'`
      )
      .bind('PAID', now, purchase.id)
  )

  statements.push(guardVerifyRow(db, 'purchases', `id = ? AND status = 'PAID'`, [purchase.id]))

  // Lock student fields for buyer and beneficiaries
  statements.push(
    db
      .prepare(
        `UPDATE users SET student_fields_locked = 1, updated_at = ?
         WHERE id IN (
           SELECT beneficiary_id FROM purchase_items WHERE purchase_id = ?
         )`
      )
      .bind(now, purchase.id)
  )

  // Confirm registrations
  statements.push(
    db
      .prepare(
        `UPDATE registrations SET
          status = ?,
          updated_at = ?
        WHERE id IN (
          SELECT registration_id FROM purchase_items WHERE purchase_id = ? AND registration_id IS NOT NULL
        ) AND status = 'RESERVED'`
      )
      .bind('CONFIRMED', now, purchase.id)
  )

  // Confirm teams
  statements.push(
    db
      .prepare(
        `UPDATE teams SET
          status = ?,
          updated_at = ?
        WHERE id IN (
          SELECT team_id FROM purchase_items WHERE purchase_id = ? AND team_id IS NOT NULL
        ) AND status = 'LOCKED'`
      )
      .bind('CONFIRMED', now, purchase.id)
  )

  // Payment audit log
  statements.push(
    db
      .prepare(
        `INSERT INTO payment_audit_logs (
          id, payment_id, purchase_id, actor_id, action, before_status, after_status,
          reason, internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentAuditId,
        payment.id,
        purchase.id,
        reviewer.id,
        'APPROVED',
        payment.status,
        'SUCCESS',
        'Payment verified and approved by staff',
        null,
        now
      )
  )

  // Admin audit log
  statements.push(
    createAuditStatement(db, {
      actorId: reviewer.id,
      action: 'PAYMENT_APPROVED',
      targetType: 'PAYMENT',
      targetId: payment.id,
      beforeJson: { payment_status: payment.status, purchase_status: purchase.status },
      afterJson: { payment_status: 'SUCCESS', purchase_status: 'PAID' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    })
  )

  await executeBatch(db, statements, {
    customGuardMessage: 'Payment approval failed: payment or purchase status was modified concurrently',
  })

  return {
    ...payment,
    status: 'SUCCESS',
    reviewer_id: reviewer.id,
    reviewed_at: now,
    updated_at: now,
  }
}

export interface RejectPaymentInput {
  reason: string
  internal_note?: string
  cancel_purchase?: boolean
}

export async function rejectPayment(
  db: D1Database,
  paymentId: string,
  input: RejectPaymentInput,
  reviewer: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number; env?: CloudflareBindings }
): Promise<Payment> {
  const now = meta?.now || Date.now()

  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>()
  if (!payment) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found')
  }

  const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(payment.purchase_id).first<Purchase>()
  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  // Self-review prohibition
  if (purchase.buyer_id === reviewer.id) {
    throw new AppError(403, 'FORBIDDEN', 'Payment reviewers cannot reject their own purchases')
  }

  if (payment.status !== 'PENDING' && payment.status !== 'ON_HOLD') {
    throw new AppError(409, 'CONFLICT', `Payment in ${payment.status} status cannot be rejected`)
  }

  if (input.cancel_purchase) {
    // Release seats and cancel purchase
    await releasePurchase(
      db,
      purchase.id,
      'CANCELLED',
      `Payment rejected: ${input.reason}`,
      reviewer,
      { ipAddress: meta?.ipAddress, userAgent: meta?.userAgent, now }
    )
    return {
      ...payment,
      status: 'FAILED',
      rejection_reason: input.reason,
      internal_note: input.internal_note || null,
      reviewer_id: reviewer.id,
      reviewed_at: now,
      updated_at: now,
    }
  }

  // Normal retry rejection: mark payment FAILED and return purchase to AWAITING_PAYMENT with fresh TTL
  const ttlMs = Number(meta?.env?.PURCHASE_RESERVATION_TTL_MS) || DEFAULT_PURCHASE_RESERVATION_TTL_MS
  const newExpiry = now + ttlMs
  const paymentAuditId = generateId()

  const statements: D1PreparedStatement[] = []

  statements.push(
    db
      .prepare(
        `UPDATE payments SET
          status = 'FAILED',
          rejection_reason = ?,
          internal_note = ?,
          reviewer_id = ?,
          reviewed_at = ?,
          updated_at = ?
        WHERE id = ? AND status IN ('PENDING', 'ON_HOLD')`
      )
      .bind(input.reason, input.internal_note || null, reviewer.id, now, now, payment.id)
  )

  statements.push(guardVerifyRow(db, 'payments', `id = ? AND status = 'FAILED'`, [payment.id]))

  statements.push(
    db
      .prepare(
        `UPDATE purchases SET
          status = ?,
          reservation_expires_at = ?,
          updated_at = ?
        WHERE id = ? AND status = 'PENDING_VERIFICATION'`
      )
      .bind('AWAITING_PAYMENT', newExpiry, now, purchase.id)
  )

  statements.push(
    db
      .prepare(
        `INSERT INTO payment_audit_logs (
          id, payment_id, purchase_id, actor_id, action, before_status, after_status,
          reason, internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentAuditId,
        payment.id,
        purchase.id,
        reviewer.id,
        'REJECTED',
        payment.status,
        'FAILED',
        input.reason,
        input.internal_note || null,
        now
      )
  )

  await executeBatch(db, statements)

  return {
    ...payment,
    status: 'FAILED',
    rejection_reason: input.reason,
    internal_note: input.internal_note || null,
    reviewer_id: reviewer.id,
    reviewed_at: now,
    updated_at: now,
  }
}

export async function holdPayment(
  db: D1Database,
  paymentId: string,
  reviewer: User,
  input?: { internal_note?: string; reason?: string },
  now = Date.now()
): Promise<Payment> {
  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>()
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found')

  if (payment.status !== 'PENDING') {
    throw new AppError(409, 'CONFLICT', `Only PENDING payments can be put on hold (current: ${payment.status})`)
  }

  const paymentAuditId = generateId()
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE payments SET
          status = 'ON_HOLD',
          internal_note = COALESCE(?, internal_note),
          updated_at = ?
        WHERE id = ? AND status = 'PENDING'`
      )
      .bind(input?.internal_note || null, now, payment.id),
    guardVerifyRow(db, 'payments', `id = ? AND status = 'ON_HOLD'`, [payment.id]),
    db
      .prepare(
        `INSERT INTO payment_audit_logs (
          id, payment_id, purchase_id, actor_id, action, before_status, after_status,
          reason, internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentAuditId,
        payment.id,
        payment.purchase_id,
        reviewer.id,
        'ON_HOLD',
        'PENDING',
        'ON_HOLD',
        input?.reason || 'Put on hold by reviewer for manual verification',
        input?.internal_note || null,
        now
      ),
  ]

  await executeBatch(db, statements)
  return { ...payment, status: 'ON_HOLD', updated_at: now }
}

export async function unholdPayment(
  db: D1Database,
  paymentId: string,
  reviewer: User,
  now = Date.now()
): Promise<Payment> {
  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>()
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found')

  if (payment.status !== 'ON_HOLD') {
    throw new AppError(409, 'CONFLICT', `Only ON_HOLD payments can be unheld (current: ${payment.status})`)
  }

  const paymentAuditId = generateId()
  const statements: D1PreparedStatement[] = [
    db
      .prepare("UPDATE payments SET status = 'PENDING', updated_at = ? WHERE id = ? AND status = 'ON_HOLD'")
      .bind(now, payment.id),
    guardVerifyRow(db, 'payments', `id = ? AND status = 'PENDING'`, [payment.id]),
    db
      .prepare(
        `INSERT INTO payment_audit_logs (
          id, payment_id, purchase_id, actor_id, action, before_status, after_status,
          reason, internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentAuditId,
        payment.id,
        payment.purchase_id,
        reviewer.id,
        'UNHELD',
        'ON_HOLD',
        'PENDING',
        'Payment released from hold by reviewer',
        null,
        now
      ),
  ]

  await executeBatch(db, statements)
  return { ...payment, status: 'PENDING', updated_at: now }
}

export async function withdrawPayment(
  db: D1Database,
  paymentId: string,
  buyer: User,
  meta?: { now?: number; env?: CloudflareBindings }
): Promise<Payment> {
  const now = meta?.now || Date.now()

  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>()
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found')

  const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(payment.purchase_id).first<Purchase>()
  if (!purchase || purchase.buyer_id !== buyer.id) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found')
  }

  // Held payment cannot be withdrawn
  if (payment.status === 'ON_HOLD') {
    throw new AppError(409, 'CONFLICT', 'Payment is currently under review by staff and cannot be withdrawn')
  }

  if (payment.status !== 'PENDING') {
    throw new AppError(409, 'CONFLICT', `Cannot withdraw payment in ${payment.status} status`)
  }

  const ttlMs = Number(meta?.env?.PURCHASE_RESERVATION_TTL_MS) || DEFAULT_PURCHASE_RESERVATION_TTL_MS
  const newExpiry = now + ttlMs
  const paymentAuditId = generateId()

  const statements: D1PreparedStatement[] = [
    db
      .prepare("UPDATE payments SET status = 'WITHDRAWN', updated_at = ? WHERE id = ? AND status = 'PENDING'")
      .bind(now, payment.id),
    guardVerifyRow(db, 'payments', `id = ? AND status = 'WITHDRAWN'`, [payment.id]),
    db
      .prepare(
        `UPDATE purchases SET
          status = 'AWAITING_PAYMENT',
          reservation_expires_at = ?,
          updated_at = ?
        WHERE id = ? AND status = 'PENDING_VERIFICATION'`
      )
      .bind(newExpiry, now, purchase.id),
    db
      .prepare(
        `INSERT INTO payment_audit_logs (
          id, payment_id, purchase_id, actor_id, action, before_status, after_status,
          reason, internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentAuditId,
        payment.id,
        purchase.id,
        buyer.id,
        'WITHDRAWN',
        'PENDING',
        'WITHDRAWN',
        'Buyer withdrew payment attempt',
        null,
        now
      ),
  ]

  await executeBatch(db, statements, {
    customGuardMessage: 'Cannot withdraw payment: payment was already reviewed or approved',
  })

  return { ...payment, status: 'WITHDRAWN', updated_at: now }
}

export async function resubmitPayment(
  db: D1Database,
  failedPaymentId: string,
  newUtr: string,
  reviewer: User,
  meta?: { now?: number }
): Promise<Payment> {
  const now = meta?.now || Date.now()
  const utr = normalizeTransactionId(newUtr)

  const prev = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(failedPaymentId).first<Payment>()
  if (!prev) throw new AppError(404, 'NOT_FOUND', 'Payment not found')

  if (prev.status !== 'FAILED') {
    throw new AppError(409, 'CONFLICT', 'Only failed payment attempts can be resubmitted')
  }

  const purchase = await db.prepare('SELECT * FROM purchases WHERE id = ?').bind(prev.purchase_id).first<Purchase>()
  if (!purchase || purchase.status === 'PAID' || purchase.status === 'CANCELLED') {
    throw new AppError(409, 'CONFLICT', 'Purchase is already completed or cancelled')
  }

  const newId = generateId()
  const paymentAuditId = generateId()

  const newPayment: Payment = {
    id: newId,
    purchase_id: purchase.id,
    expected_amount_paise: prev.expected_amount_paise,
    transaction_id: utr,
    status: 'PENDING',
    reviewer_id: null,
    reviewed_at: null,
    rejection_reason: null,
    internal_note: `Resubmitted from attempt ${prev.id}`,
    resubmitted_from_payment_id: prev.id,
    created_at: now,
    updated_at: now,
  }

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO payments (
          id, purchase_id, expected_amount_paise, transaction_id, status,
          reviewer_id, reviewed_at, rejection_reason, internal_note,
          resubmitted_from_payment_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        newPayment.id,
        newPayment.purchase_id,
        newPayment.expected_amount_paise,
        newPayment.transaction_id,
        newPayment.status,
        null,
        null,
        null,
        newPayment.internal_note,
        newPayment.resubmitted_from_payment_id,
        now,
        now
      ),
    db
      .prepare("UPDATE purchases SET status = 'PENDING_VERIFICATION', updated_at = ? WHERE id = ?")
      .bind(now, purchase.id),
    db
      .prepare(
        `INSERT INTO payment_audit_logs (
          id, payment_id, purchase_id, actor_id, action, before_status, after_status,
          reason, internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentAuditId,
        newPayment.id,
        purchase.id,
        reviewer.id,
        'RESUBMITTED',
        null,
        'PENDING',
        'Staff resubmitted corrected transaction reference',
        newPayment.internal_note,
        now
      ),
  ]

  await executeBatch(db, statements)
  return newPayment
}

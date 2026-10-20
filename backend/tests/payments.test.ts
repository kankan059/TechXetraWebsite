import { describe, it, expect, vi } from 'vitest'
import {
  getPaymentInstructions,
  submitUpiPayment,
  approvePayment,
  rejectPayment,
  holdPayment,
  withdrawPayment,
  resubmitPayment,
} from '../src/services/payment.service'
import { AppError } from '../src/common/errors'
import type { Payment, Purchase, User } from '../src/types'

function createMockD1(options: {
  firstHandler?: (sql: string, args: any[]) => any
  allHandler?: (sql: string, args: any[]) => any
  batchHandler?: (stmts: any[]) => any
}) {
  const makeStmt = (sql: string, boundArgs: any[] = []): any => ({
    bind: (...args: any[]) => makeStmt(sql, args),
    first: vi.fn(async () => (options.firstHandler ? options.firstHandler(sql, boundArgs) : null)),
    all: vi.fn(async () =>
      options.allHandler ? options.allHandler(sql, boundArgs) : { results: [] }
    ),
    run: vi.fn(async () => ({ meta: { changes: 1 } })),
    sql,
    args: boundArgs,
  })

  return {
    prepare: vi.fn((sql: string) => makeStmt(sql, [])),
    batch: vi.fn(async (stmts: any[]) => (options.batchHandler ? options.batchHandler(stmts) : [])),
  } as unknown as D1Database
}

describe('Manual UPI Payments & State Machine', () => {
  const buyer: User = {
    id: 'user-buyer-1',
    google_sub: 'sub-b',
    email: 'buyer@example.com',
    name: 'Buyer',
    avatar_url: null,
    phone: '9876543210',
    is_student: 1,
    institution_name: 'Tech Univ',
    institution_id: 'TU-001',
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const reviewer: User = {
    ...buyer,
    id: 'user-reviewer-1',
    email: 'reviewer@example.com',
    role: 'VOLUNTEER',
    can_review_payments: 1,
  }

  const awaitingPurchase: Purchase = {
    id: 'pur-1',
    buyer_id: buyer.id,
    total_amount_paise: 30000,
    status: 'AWAITING_PAYMENT',
    payment_method: null,
    reservation_expires_at: Date.now() + 900000,
    fulfillment_status: 'NOT_STARTED',
    fulfillment_attempts: 0,
    fulfillment_last_error: null,
    idempotency_key: null,
    idempotency_request_hash: null,
    student_policy_acknowledged_at: null,
    created_at: 1000,
    updated_at: 1000,
  }

  const pendingVerificationPurchase: Purchase = {
    ...awaitingPurchase,
    status: 'PENDING_VERIFICATION',
    payment_method: 'UPI',
  }

  const pendingPayment: Payment = {
    id: 'pay-1',
    purchase_id: awaitingPurchase.id,
    expected_amount_paise: 30000,
    transaction_id: 'UTR1234567890',
    status: 'PENDING',
    reviewer_id: null,
    reviewed_at: null,
    rejection_reason: null,
    internal_note: null,
    resubmitted_from_payment_id: null,
    created_at: 1000,
    updated_at: 1000,
  }

  it('generates properly formatted upi://pay payment instructions for non-expired purchase', async () => {
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return awaitingPurchase
        return null
      },
    })

    const instructions = await getPaymentInstructions(
      mockDb,
      awaitingPurchase.id,
      buyer,
      { UPI_VPA: 'fest@upi', UPI_PAYEE_NAME: 'TechXetra Fest' } as any
    )

    expect(instructions.amount_rupees).toBe('300.00')
    expect(instructions.payee_vpa).toBe('fest@upi')
    expect(instructions.upi_uri).toContain('upi://pay?')
    expect(instructions.upi_uri).toContain('pa=fest%40upi')
    expect(instructions.upi_uri).toContain('am=300.00')
    expect(instructions.upi_uri).toContain('cu=INR')
  })

  it('rejects duplicate UTR across different purchases with UTR_ALREADY_USED (409)', async () => {
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return awaitingPurchase
        if (sql.includes("status IN ('PENDING', 'ON_HOLD') LIMIT 1")) return null
        if (sql.includes('transaction_id = ?')) return { id: 'other-payment-id', purchase_id: 'other-pur' } // duplicate UTR!
        return null
      },
    })

    await expect(
      submitUpiPayment(mockDb, awaitingPurchase.id, 'UTR1234567890', buyer)
    ).rejects.toMatchObject({
      status: 409,
      code: 'UTR_ALREADY_USED',
    })
  })

  it('returns existing payment attempt idempotently when same UTR is resubmitted on same purchase', async () => {
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return awaitingPurchase
        if (sql.includes("status IN ('PENDING', 'ON_HOLD') LIMIT 1")) return pendingPayment
        return null
      },
    })

    const result = await submitUpiPayment(mockDb, awaitingPurchase.id, 'UTR1234567890', buyer)
    expect(result.id).toBe(pendingPayment.id)
    expect(result.transaction_id).toBe('UTR1234567890')
  })

  it('rejects different UTR while an attempt is already pending with PAYMENT_ALREADY_SUBMITTED (409)', async () => {
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return awaitingPurchase
        if (sql.includes("status IN ('PENDING', 'ON_HOLD') LIMIT 1")) return pendingPayment
        return null
      },
    })

    await expect(
      submitUpiPayment(mockDb, awaitingPurchase.id, 'DIFFERENTUTR999', buyer)
    ).rejects.toMatchObject({
      status: 409,
      code: 'PAYMENT_ALREADY_SUBMITTED',
    })
  })

  it('prohibits self-review: reviewer cannot approve their own purchase', async () => {
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM payments WHERE id = ?')) return pendingPayment
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) {
          return { ...pendingVerificationPurchase, buyer_id: reviewer.id } // reviewer is the buyer!
        }
        return null
      },
    })

    await expect(approvePayment(mockDb, pendingPayment.id, reviewer)).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: expect.stringContaining('cannot approve their own purchases'),
    })
  })

  it('successfully approves payment, transitions purchase to PAID, confirms registrations, and writes audit atomically', async () => {
    const batchStatements: any[] = []
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM payments WHERE id = ?')) return pendingPayment
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return pendingVerificationPurchase
        return null
      },
      batchHandler: (stmts) => {
        batchStatements.push(...stmts)
        return []
      },
    })

    const approved = await approvePayment(mockDb, pendingPayment.id, reviewer)
    expect(approved.status).toBe('SUCCESS')
    expect(approved.reviewer_id).toBe(reviewer.id)

    // Verify payment transition in batch
    const paymentUpdate = batchStatements.find((s) => s.sql.includes('UPDATE payments SET'))
    expect(paymentUpdate.args).toContain(reviewer.id)

    // Verify purchase transition to PAID in batch
    const purchaseUpdate = batchStatements.find((s) => s.sql.includes('UPDATE purchases SET'))
    expect(purchaseUpdate.args).toContain('PAID')

    // Verify registrations confirmed in batch
    const regConfirm = batchStatements.find((s) => s.sql.includes('UPDATE registrations SET'))
    expect(regConfirm.args).toContain('CONFIRMED')

    // Verify payment audit log inserted
    const paymentAudit = batchStatements.find((s) => s.sql.includes('INSERT INTO payment_audit_logs'))
    expect(paymentAudit.args).toContain('APPROVED')
    expect(paymentAudit.args).toContain('SUCCESS')
  })

  it('rejectPayment marks attempt FAILED, restores purchase to AWAITING_PAYMENT with fresh expiry', async () => {
    const batchStatements: any[] = []
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM payments WHERE id = ?')) return pendingPayment
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return pendingVerificationPurchase
        return null
      },
      batchHandler: (stmts) => {
        batchStatements.push(...stmts)
        return []
      },
    })

    const rejected = await rejectPayment(
      mockDb,
      pendingPayment.id,
      { reason: 'Amount mismatch', internal_note: 'Received 100 instead of 300' },
      reviewer
    )

    expect(rejected.status).toBe('FAILED')
    expect(rejected.rejection_reason).toBe('Amount mismatch')

    // Verify purchase restored to AWAITING_PAYMENT in batch
    const purchaseUpdate = batchStatements.find((s) => s.sql.includes('UPDATE purchases SET'))
    expect(purchaseUpdate.args).toContain('AWAITING_PAYMENT')
  })

  it('withdrawPayment allows participant to withdraw pending payment, restoring purchase to AWAITING_PAYMENT', async () => {
    const batchStatements: any[] = []
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM payments WHERE id = ?')) return pendingPayment
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return pendingVerificationPurchase
        return null
      },
      batchHandler: (stmts) => {
        batchStatements.push(...stmts)
        return []
      },
    })

    const withdrawn = await withdrawPayment(mockDb, pendingPayment.id, buyer)
    expect(withdrawn.status).toBe('WITHDRAWN')

    const paymentUpdate = batchStatements.find((s) => s.sql.includes("status = 'WITHDRAWN'"))
    expect(paymentUpdate).toBeDefined()

    const purchaseUpdate = batchStatements.find((s) => s.sql.includes("status = 'AWAITING_PAYMENT'"))
    expect(purchaseUpdate).toBeDefined()
  })

  it('prevents withdrawal when payment is ON_HOLD by staff', async () => {
    const heldPayment: Payment = { ...pendingPayment, status: 'ON_HOLD' }
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM payments WHERE id = ?')) return heldPayment
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return pendingVerificationPurchase
        return null
      },
    })

    await expect(withdrawPayment(mockDb, heldPayment.id, buyer)).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('under review by staff'),
    })
  })

  it('resubmitPayment creates a new attempt linked to the previous attempt and preserves history', async () => {
    const failedPayment: Payment = { ...pendingPayment, status: 'FAILED' }
    const batchStatements: any[] = []

    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM payments WHERE id = ?')) return failedPayment
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) return awaitingPurchase
        return null
      },
      batchHandler: (stmts) => {
        batchStatements.push(...stmts)
        return []
      },
    })

    const resubmitted = await resubmitPayment(
      mockDb,
      failedPayment.id,
      'CORRECTEDUTR123',
      reviewer
    )

    expect(resubmitted.status).toBe('PENDING')
    expect(resubmitted.transaction_id).toBe('CORRECTEDUTR123')
    expect(resubmitted.resubmitted_from_payment_id).toBe(failedPayment.id)

    // Verify insertion of new attempt and payment audit
    const insertPayment = batchStatements.find((s) => s.sql.includes('INSERT INTO payments'))
    expect(insertPayment.args).toContain(failedPayment.id)
  })
})

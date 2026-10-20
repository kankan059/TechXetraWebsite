import { describe, it, expect, vi } from 'vitest'
import { createPurchase, releasePurchase } from '../src/services/purchase.service'
import type { User, Event } from '../src/types'

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

describe('Purchases & Capacity Atomicity', () => {
  const buyer: User = {
    id: 'user-buyer-1',
    google_sub: 'sub-b',
    email: 'buyer@example.com',
    name: 'Buyer User',
    avatar_url: null,
    phone: '9876543210',
    is_student: 1,
    institution_name: 'Tech University',
    institution_id: 'TU-100',
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const mockEnv = {
    DB: {} as D1Database,
    PURCHASE_RESERVATION_TTL_MS: 900000,
  } as any

  const soloEvent: Event = {
    id: 'evt-solo',
    slug: 'solo-quiz',
    title: 'Solo Quiz',
    category: 'TECHNICAL',
    description: null,
    venue: null,
    day_of_event: 1,
    starts_at: 1000,
    ends_at: 2000,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 0,
    min_team_size: 1,
    max_team_size: 1,
    price_model: 'FREE',
    price_paise: 0,
    student_price_paise: null,
    capacity: 1,
    seats_taken: 0,
    capacity_unit: 'SEATS',
    scoring_enabled: 0,
    scoring_status: 'NOT_APPLICABLE',
    max_rounds: 1,
    volunteers_can_score: 0,
    leaderboard_public: 0,
    created_at: 1000,
    updated_at: 1000,
  }

  it('requires student ID policy acknowledgement when any item uses student tier', async () => {
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes("status IN ('AWAITING_PAYMENT'")) return { count: 0 }
        if (sql.includes('SELECT * FROM events')) {
          return { ...soloEvent, price_paise: 20000, student_price_paise: 10000 }
        }
        return null
      },
      allHandler: (sql) => {
        if (sql.includes('SELECT key, value FROM settings')) {
          return {
            results: [
              { key: 'purchases_enabled', value: '1' },
              { key: 'gate_pass_price_paise', value: '30000' },
              { key: 'gate_pass_student_price_paise', value: '20000' },
            ],
          }
        }
        if (sql.includes('SELECT * FROM purchases WHERE buyer_id = ?')) {
          return { results: [] }
        }
        return { results: [] }
      },
    })

    // Acknowledge policy missing
    await expect(
      createPurchase(
        mockDb,
        buyer,
        {
          items: [{ item_type: 'EVENT_PASS', event_id: soloEvent.id }],
          acknowledge_student_id_policy: false,
        },
        mockEnv
      )
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('student institution ID verification policy'),
    })
  })

  it('rejects purchase when purchases_enabled = 0 in settings', async () => {
    const mockDb = createMockD1({
      allHandler: (sql) => {
        if (sql.includes('SELECT key, value FROM settings')) {
          return {
            results: [{ key: 'purchases_enabled', value: '0' }], // Disabled!
          }
        }
        return { results: [] }
      },
    })

    await expect(
      createPurchase(
        mockDb,
        buyer,
        {
          items: [{ item_type: 'GATE_PASS' }],
        },
        mockEnv
      )
    ).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: expect.stringContaining('disabled'),
    })
  })

  it('zero-price purchase automatically sets PAID and CONFIRMED without payment attempt', async () => {
    const batchStatements: any[] = []
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes("status IN ('AWAITING_PAYMENT'")) return { count: 0 }
        if (sql.includes('SELECT * FROM events')) return soloEvent // Free event
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) {
          return {
            id: 'pur-free-1',
            buyer_id: buyer.id,
            total_amount_paise: 0,
            status: 'PAID',
            payment_method: 'FREE',
          }
        }
        return null
      },
      allHandler: (sql) => {
        if (sql.includes('SELECT key, value FROM settings')) {
          return { results: [{ key: 'purchases_enabled', value: '1' }] }
        }
        if (sql.includes('SELECT * FROM purchases WHERE buyer_id = ?')) {
          return { results: [] }
        }
        if (sql.includes('SELECT * FROM purchase_items')) {
          return {
            results: [
              {
                id: 'pi-1',
                purchase_id: 'pur-free-1',
                unit_price_paise: 0,
                tier: 'GENERAL',
                item_type: 'EVENT_PASS',
              },
            ],
          }
        }
        if (sql.includes('SELECT r.* FROM registrations')) {
          return {
            results: [
              {
                id: 'reg-1',
                event_id: soloEvent.id,
                status: 'CONFIRMED',
              },
            ],
          }
        }
        return { results: [] }
      },
      batchHandler: (stmts) => {
        batchStatements.push(...stmts)
        return []
      },
    })

    const nonStudentBuyer = { ...buyer, is_student: 0 }
    const purchase = await createPurchase(
      mockDb,
      nonStudentBuyer,
      {
        items: [{ item_type: 'EVENT_PASS', event_id: soloEvent.id }],
      },
      mockEnv
    )

    expect(purchase.status).toBe('PAID')
    expect(purchase.total_amount_paise).toBe(0)

    // Check that registrations were inserted with status CONFIRMED in batch
    const regInsert = batchStatements.find((s) => s.sql.includes('INSERT INTO registrations'))
    expect(regInsert.args).toContain('CONFIRMED')

    // Check that audit row recorded AUTO_APPROVED_FREE
    const auditInsert = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))
    expect(auditInsert.args).toContain('AUTO_APPROVED_FREE')
  })

  it('rejects duplicate item slots (e.g. duplicate GATE_PASS in single purchase)', async () => {
    const mockDb = createMockD1({
      firstHandler: () => ({ count: 0 }),
      allHandler: (sql) => {
        if (sql.includes('SELECT key, value FROM settings')) {
          return { results: [{ key: 'purchases_enabled', value: '1' }] }
        }
        return { results: [] }
      },
    })

    await expect(
      createPurchase(
        mockDb,
        buyer,
        {
          items: [
            { item_type: 'GATE_PASS' },
            { item_type: 'GATE_PASS' }, // Duplicate gate pass!
          ],
          acknowledge_student_id_policy: true,
        },
        mockEnv
      )
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('Only one gate pass'),
    })
  })

  it('releasePurchase decrements seats only for RESERVED registrations and marks CANCELLED', async () => {
    const batchStatements: any[] = []
    const mockDb = createMockD1({
      firstHandler: (sql) => {
        if (sql.includes('SELECT * FROM purchases WHERE id = ?')) {
          return { id: 'pur-1', status: 'AWAITING_PAYMENT', buyer_id: buyer.id }
        }
        if (sql.includes("status = 'RESERVED'")) {
          return { id: 'reg-1', event_id: 'evt-solo', seat_count: 1, status: 'RESERVED' }
        }
        return null
      },
      allHandler: (sql) => {
        if (sql.includes('SELECT * FROM purchase_items WHERE purchase_id = ?')) {
          return {
            results: [
              { id: 'pi-1', purchase_id: 'pur-1', registration_id: 'reg-1', holds_slot: 1 },
            ],
          }
        }
        return { results: [] }
      },
      batchHandler: (stmts) => {
        batchStatements.push(...stmts)
        return []
      },
    })

    await releasePurchase(mockDb, 'pur-1', 'CANCELLED', 'User cancelled', buyer)

    // Ensure seat decrement statement was included
    const seatDecrement = batchStatements.find((s) => s.sql.includes('UPDATE events SET seats_taken'))
    expect(seatDecrement).toBeDefined()
    expect(seatDecrement.sql).toContain('max(0, seats_taken - ?)')

    // Ensure holds_slot was reset to 0
    const slotReset = batchStatements.find((s) => s.sql.includes('holds_slot = 0'))
    expect(slotReset).toBeDefined()

    // Ensure purchase status updated to CANCELLED
    const purchaseUpdate = batchStatements.find((s) => s.sql.includes('UPDATE purchases SET status = ?'))
    expect(purchaseUpdate.args).toContain('CANCELLED')
  })

  it('releasePurchase throws conflict if purchase is already PAID', async () => {
    const mockDb = createMockD1({
      firstHandler: () => ({
        id: 'pur-paid',
        status: 'PAID', // Already paid! Cannot be released
        buyer_id: buyer.id,
      }),
    })

    await expect(
      releasePurchase(mockDb, 'pur-paid', 'CANCELLED', 'Attempt release paid', buyer)
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('Cannot release purchase in PAID status'),
    })
  })
})

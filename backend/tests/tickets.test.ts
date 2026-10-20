import { describe, it, expect, vi } from 'vitest'
import {
  fulfillPurchase,
  getUserTickets,
  getEnrichedTicketForOwner,
  rotateTicketQr,
  deriveTicketValidity,
  processPendingFulfillments,
} from '../src/services/ticket.service'
import {
  generateQrToken,
  generateQrSignature,
  verifyAndParseQrToken,
  constantTimeEqual,
} from '../src/utils/qr'
import { AppError } from '../src/common/errors'
import type { Ticket, Purchase, PurchaseItem, Event, FestDay, User } from '../src/types'
import type { CloudflareBindings } from '../src/types/env'

function createMockD1(options: {
  firstHandler?: (sql: string, args: any[]) => any
  allHandler?: (sql: string, args: any[]) => any
  batchHandler?: (stmts: any[]) => any
  runHandler?: (sql: string, args: any[]) => any
}) {
  const makeStmt = (sql: string, boundArgs: any[] = []): any => ({
    bind: (...args: any[]) => makeStmt(sql, args),
    first: vi.fn(async () => (options.firstHandler ? options.firstHandler(sql, boundArgs) : null)),
    all: vi.fn(async () =>
      options.allHandler ? options.allHandler(sql, boundArgs) : { results: [] }
    ),
    run: vi.fn(async () => (options.runHandler ? options.runHandler(sql, boundArgs) : { meta: { changes: 1 } })),
    sql,
    args: boundArgs,
  })

  return {
    prepare: vi.fn((sql: string) => makeStmt(sql, [])),
    batch: vi.fn(async (stmts: any[]) => (options.batchHandler ? options.batchHandler(stmts) : [])),
  } as unknown as D1Database
}

describe('TASK-07: Idempotent Ticket Fulfillment & Signed QR Tokens', () => {
  const mockEnv: CloudflareBindings = {
    DB: {} as D1Database,
    TICKET_HMAC_SECRET: 'test-secret-32-bytes-long-for-hmac-key-verification!',
    GOOGLE_CLIENT_ID: 'google-client-id',
    FRONTEND_ORIGIN: 'http://localhost:3000',
    UPI_VPA: 'techxetra@upi',
    UPI_PAYEE_NAME: 'TechXetra 2026',
  }

  const buyer: User = {
    id: 'user-buyer-1',
    google_sub: 'sub-buyer',
    email: 'buyer@example.com',
    name: 'Buyer User',
    avatar_url: null,
    phone: '9876543210',
    is_student: 1,
    institution_name: 'Tech University',
    institution_id: 'TU-100',
    student_fields_locked: 1,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const teamMember: User = {
    ...buyer,
    id: 'user-member-2',
    email: 'member@example.com',
    name: 'Member User',
    institution_id: null,
    is_student: 0,
  }

  const festDays: FestDay[] = [
    { day_number: 1, date: '2026-11-06', starts_at: 1793923200000, ends_at: 1794009599999, description: 'Day 1' },
    { day_number: 2, date: '2026-11-07', starts_at: 1794009600000, ends_at: 1794095999999, description: 'Day 2' },
    { day_number: 3, date: '2026-11-08', starts_at: 1794096000000, ends_at: 1794182399999, description: 'Day 3' },
  ]

  const day2Event: Event = {
    id: 'evt-coding',
    slug: 'hackathon',
    title: 'Hackathon',
    category: 'TECHNICAL',
    description: null,
    venue: 'Lab 1',
    day_of_event: 2,
    starts_at: 1794015000000,
    ends_at: 1794070000000,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 0,
    min_team_size: 1,
    max_team_size: 1,
    price_model: 'FREE',
    price_paise: 0,
    student_price_paise: null,
    capacity: 100,
    seats_taken: 10,
    capacity_unit: 'SEATS',
    scoring_enabled: 0,
    scoring_status: 'NOT_APPLICABLE',
    max_rounds: 1,
    volunteers_can_score: 0,
    leaderboard_public: 0,
    created_at: 1000,
    updated_at: 1000,
  }

  const purchaseItems: PurchaseItem[] = [
    {
      id: 'pi-gate',
      purchase_id: 'pur-1',
      item_type: 'GATE_PASS',
      event_id: null,
      team_id: null,
      beneficiary_id: buyer.id,
      tier: 'STUDENT',
      unit_price_paise: 20000,
      registration_id: null,
      holds_slot: 1,
      created_at: 1000,
    },
    {
      id: 'pi-event',
      purchase_id: 'pur-1',
      item_type: 'EVENT_PASS',
      event_id: day2Event.id,
      team_id: null,
      beneficiary_id: buyer.id,
      tier: 'GENERAL',
      unit_price_paise: 10000,
      registration_id: 'reg-1',
      holds_slot: 1,
      created_at: 1000,
    },
  ]

  // ==========================================
  // 1. UNPAID PURCHASE REJECTION
  // ==========================================
  describe('Fulfillment Preconditions', () => {
    it('rejects fulfillment for unpaid purchase without creating any tickets', async () => {
      const statuses: Purchase['status'][] = [
        'AWAITING_PAYMENT',
        'PENDING_VERIFICATION',
        'CANCELLED',
        'EXPIRED',
      ]

      for (const st of statuses) {
        const db = createMockD1({
          firstHandler: (sql) => {
            if (sql.includes('FROM purchases')) {
              return { id: 'pur-unpaid', status: st, fulfillment_status: 'NOT_STARTED' }
            }
            return null
          },
        })

        await expect(fulfillPurchase(db, 'pur-unpaid', mockEnv)).rejects.toMatchObject({
          name: 'AppError',
          status: 400,
          code: 'BAD_REQUEST',
        })

        // Verify batch was NEVER called
        expect(db.batch).not.toHaveBeenCalled()
      }
    })
  })

  // ==========================================
  // 2. HAPPY PATH & VALIDITY WINDOW DERIVATION
  // ==========================================
  describe('Fulfillment Execution & Validity Windows', () => {
    it('fulfills paid purchase in a single D1 batch with exact fest day validity windows', async () => {
      let batchStatements: any[] = []
      const db = createMockD1({
        firstHandler: (sql, args) => {
          if (sql.includes('FROM purchases WHERE id = ?')) {
            return {
              id: 'pur-1',
              buyer_id: buyer.id,
              total_amount_paise: 30000,
              status: 'PAID',
              fulfillment_status: 'NOT_STARTED',
              fulfillment_attempts: 0,
            }
          }
          if (sql.includes('FROM events WHERE id = ?')) {
            return day2Event
          }
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('FROM fest_days')) {
            return { results: festDays }
          }
          if (sql.includes('FROM purchase_items')) {
            return { results: purchaseItems }
          }
          if (sql.includes('FROM tickets WHERE purchase_id = ?')) {
            return { results: [] } // No tickets initially
          }
          return { results: [] }
        },
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      const now = 1793000000000
      const result = await fulfillPurchase(db, 'pur-1', mockEnv, { now })

      // Verify batch was executed exactly once
      expect(db.batch).toHaveBeenCalledTimes(1)
      expect(result.tickets.length).toBe(2)

      // Find tickets in batch
      const insertTicketStmts = batchStatements.filter((s) => s.sql.includes('INSERT INTO tickets'))
      expect(insertTicketStmts.length).toBe(2)

      // 1. Gate Pass validity check: Day 1 start through Day 3 end
      const gatePass = result.tickets.find((t) => t.ticket_type === 'GATE_PASS')!
      expect(gatePass).toBeDefined()
      expect(gatePass.tier).toBe('STUDENT')
      expect(gatePass.valid_from).toBe(festDays[0].starts_at)
      expect(gatePass.valid_to).toBe(festDays[2].ends_at)

      // 2. Event Pass validity check: Event Day 2 window (fest Day 2 starts_at to ends_at)
      const eventPass = result.tickets.find((t) => t.ticket_type === 'EVENT_PASS')!
      expect(eventPass).toBeDefined()
      expect(eventPass.event_id).toBe(day2Event.id)
      expect(eventPass.valid_from).toBe(festDays[1].starts_at)
      expect(eventPass.valid_to).toBe(festDays[1].ends_at)

      // 3. Batch guards verification
      const guardStmt = batchStatements.find((s) => s.sql.includes('NOT EXISTS ('))
      expect(guardStmt).toBeDefined()
      expect(guardStmt.args).toContain('pur-1')

      // 4. Fulfillment status completion update in the same batch
      const updateStmt = batchStatements.find((s) => s.sql.includes('fulfillment_status = \'COMPLETED\''))
      expect(updateStmt).toBeDefined()

      expect(result.purchase.fulfillment_status).toBe('COMPLETED')
    })
  })

  // ==========================================
  // 3. FAILURE HANDLING & SAFE RETRIES
  // ==========================================
  describe('Injected Failure Handling & Safe Retries', () => {
    it('leaves purchase PAID on injected batch failure and records FAILED status with incremented attempts', async () => {
      let runCalls: { sql: string; args: any[] }[] = []
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM purchases WHERE id = ?')) {
            return {
              id: 'pur-fail',
              status: 'PAID',
              fulfillment_status: 'NOT_STARTED',
              fulfillment_attempts: 0,
            }
          }
          if (sql.includes('FROM events WHERE id = ?')) return day2Event
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('FROM fest_days')) return { results: festDays }
          if (sql.includes('FROM purchase_items')) return { results: purchaseItems }
          if (sql.includes('FROM tickets WHERE purchase_id = ?')) return { results: [] }
          return { results: [] }
        },
        batchHandler: async () => {
          throw new Error('D1 storage engine timeout during ticket insert')
        },
        runHandler: (sql, args) => {
          runCalls.push({ sql, args })
          return { meta: { changes: 1 } }
        },
      })

      // Attempt fulfillment -> should throw AppError
      await expect(fulfillPurchase(db, 'pur-fail', mockEnv)).rejects.toMatchObject({
        name: 'AppError',
        status: 500,
        code: 'FULFILLMENT_FAILED',
      })

      // Verify that purchases table was updated to FAILED and attempts incremented
      const failUpdate = runCalls.find((c) => c.sql.includes("fulfillment_status = 'FAILED'"))
      expect(failUpdate).toBeDefined()
      expect(failUpdate?.sql).toContain('fulfillment_attempts = fulfillment_attempts + 1')
      expect(failUpdate?.args[0]).toBe('A database operation failed')

      // CRITICAL: Verify purchase status was NEVER updated away from PAID!
      const statusRevert = runCalls.find((c) => c.sql.includes("status = 'AWAITING_PAYMENT'") || c.sql.includes("status = 'CANCELLED'"))
      expect(statusRevert).toBeUndefined()
    })

    it('subsequent retry succeeds after earlier failure and clears error', async () => {
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM purchases WHERE id = ?')) {
            return {
              id: 'pur-retry',
              status: 'PAID',
              fulfillment_status: 'FAILED',
              fulfillment_attempts: 1,
              fulfillment_last_error: 'Previous timeout',
            }
          }
          if (sql.includes('FROM events WHERE id = ?')) return day2Event
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('FROM fest_days')) return { results: festDays }
          if (sql.includes('FROM purchase_items')) return { results: purchaseItems }
          if (sql.includes('FROM tickets WHERE purchase_id = ?')) return { results: [] }
          return { results: [] }
        },
        batchHandler: async () => [],
      })

      const res = await fulfillPurchase(db, 'pur-retry', mockEnv)
      expect(res.purchase.fulfillment_status).toBe('COMPLETED')
      expect(res.purchase.fulfillment_last_error).toBeNull()
      expect(res.tickets.length).toBe(2)
    })

    it('multiple concurrent fulfillment retries create exactly one active ticket per item', async () => {
      const existingTicket: Ticket = {
        id: 't-gate-1',
        purchase_item_id: 'pi-gate',
        purchase_id: 'pur-conc',
        ticket_type: 'GATE_PASS',
        beneficiary_id: buyer.id,
        event_id: null,
        tier: 'STUDENT',
        valid_from: festDays[0].starts_at,
        valid_to: festDays[2].ends_at,
        qr_version: 1,
        status: 'ACTIVE',
        event_checked_in_at: null,
        replaces_ticket_id: null,
        created_at: 1000,
        updated_at: 1000,
      }

      const existingEventTicket: Ticket = {
        ...existingTicket,
        id: 't-event-1',
        purchase_item_id: 'pi-event',
        ticket_type: 'EVENT_PASS',
        event_id: day2Event.id,
      }

      // Simulate case where concurrent call already inserted active tickets
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM purchases WHERE id = ?')) {
            return {
              id: 'pur-conc',
              status: 'PAID',
              fulfillment_status: 'IN_PROGRESS',
              fulfillment_attempts: 1,
            }
          }
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('FROM fest_days')) return { results: festDays }
          if (sql.includes('FROM purchase_items')) return { results: purchaseItems }
          if (sql.includes('FROM tickets WHERE purchase_id = ?')) {
            return { results: [existingTicket, existingEventTicket] }
          }
          return { results: [] }
        },
      })

      const result = await fulfillPurchase(db, 'pur-conc', mockEnv)
      // Exactly 2 active tickets returned, NO new inserts attempted in batch
      expect(result.tickets.length).toBe(2)
      expect(db.batch).not.toHaveBeenCalled()
      expect(result.purchase.fulfillment_status).toBe('COMPLETED')
    })
  })

  // ==========================================
  // 4. SIGNED QR TOKEN INTEGRITY & CRYPTO
  // ==========================================
  describe('Signed QR Tokens & Web Crypto', () => {
    const secret = 'super-secure-production-ticket-hmac-secret-12345678'
    const ticketId = 't-abc-123'
    const qrVersion = 1

    it('generates deterministic truncated base64url HMAC QR token without PII', async () => {
      const token = await generateQrToken(secret, ticketId, qrVersion)
      expect(token).toMatch(/^tx1\.t-abc-123\.1\.[A-Za-z0-9_-]{22}$/)

      // Ensure no PII (like buyer email, name, phone, payment) exists in token string
      expect(token).not.toContain(buyer.email)
      expect(token).not.toContain(buyer.phone!)
      expect(token).not.toContain('30000')
    })

    it('verifies valid QR token successfully', async () => {
      const token = await generateQrToken(secret, ticketId, qrVersion)
      const parsed = await verifyAndParseQrToken(token, secret)

      expect(parsed).toEqual({
        ticketId: 't-abc-123',
        qrVersion: 1,
        signature: expect.any(String),
      })
      expect(parsed.signature.length).toBe(22)
    })

    it('rejects modified ticket ID before querying database', async () => {
      const validToken = await generateQrToken(secret, ticketId, qrVersion)
      const parts = validToken.split('.')
      const tampered = `${parts[0]}.different-ticket-id.${parts[2]}.${parts[3]}`

      await expect(verifyAndParseQrToken(tampered, secret)).rejects.toMatchObject({
        name: 'AppError',
        status: 401,
        code: 'INVALID_QR_SIGNATURE',
      })
    })

    it('rejects modified QR version before querying database', async () => {
      const validToken = await generateQrToken(secret, ticketId, qrVersion)
      const parts = validToken.split('.')
      const tampered = `${parts[0]}.${parts[1]}.2.${parts[3]}`

      await expect(verifyAndParseQrToken(tampered, secret)).rejects.toMatchObject({
        name: 'AppError',
        status: 401,
        code: 'INVALID_QR_SIGNATURE',
      })
    })

    it('rejects tampered signature in constant time', async () => {
      const validToken = await generateQrToken(secret, ticketId, qrVersion)
      const parts = validToken.split('.')
      const tamperedSig = parts[3].slice(0, 21) + (parts[3][21] === 'a' ? 'b' : 'a')
      const tampered = `${parts[0]}.${parts[1]}.${parts[2]}.${tamperedSig}`

      await expect(verifyAndParseQrToken(tampered, secret)).rejects.toMatchObject({
        name: 'AppError',
        status: 401,
        code: 'INVALID_QR_SIGNATURE',
      })
    })

    it('rejects malformed token formats', async () => {
      const malformedCases = [
        '',
        'random-string',
        'tx1.t1.1',
        'tx2.t1.1.AAAAAAAAAAAAAAAAAAAAAA', // Wrong prefix
        'tx1.t1.0.AAAAAAAAAAAAAAAAAAAAAA', // Version < 1
        'tx1.t1.v1.AAAAAAAAAAAAAAAAAAAAAA', // Version NaN
        'tx1.t1.1.short_sig', // Wrong length
        'tx1.t1.1.AAAAAAAAAAAAAAAAAAAAA$', // Invalid chars
      ]

      for (const token of malformedCases) {
        await expect(verifyAndParseQrToken(token, secret)).rejects.toMatchObject({
          name: 'AppError',
          status: 400,
          code: 'INVALID_QR_TOKEN',
        })
      }
    })

    it('rejects when HMAC secret is missing', async () => {
      const validToken = await generateQrToken(secret, ticketId, qrVersion)
      await expect(verifyAndParseQrToken(validToken, '')).rejects.toMatchObject({
        name: 'AppError',
        status: 500,
        code: 'INTERNAL_ERROR',
      })
    })

    it('constantTimeEqual correctly compares strings without length leaks', () => {
      expect(constantTimeEqual('abcdef', 'abcdef')).toBe(true)
      expect(constantTimeEqual('abcdef', 'abcdeg')).toBe(false)
      expect(constantTimeEqual('abcdef', 'abcde')).toBe(false)
      expect(constantTimeEqual('', '')).toBe(true)
    })
  })

  // ==========================================
  // 5. QR ROTATION
  // ==========================================
  describe('QR Token Rotation', () => {
    it('QR rotation invalidates old token without creating a second ticket', async () => {
      let updatedVersion = 1
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM tickets WHERE id = ?')) {
            return {
              id: 'ticket-rot',
              purchase_item_id: 'pi-1',
              purchase_id: 'pur-1',
              ticket_type: 'GATE_PASS',
              beneficiary_id: buyer.id,
              event_id: null,
              tier: 'GENERAL',
              valid_from: 1000,
              valid_to: 2000,
              qr_version: updatedVersion,
              status: 'ACTIVE',
              created_at: 1000,
              updated_at: 1000,
            }
          }
          return null
        },
        runHandler: (sql, args) => {
          if (sql.includes('UPDATE tickets SET qr_version = ?')) {
            updatedVersion = args[0]
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 1 } }
        },
      })

      // Generate token v1
      const tokenV1 = await generateQrToken(mockEnv.TICKET_HMAC_SECRET, 'ticket-rot', 1)
      const parsedV1 = await verifyAndParseQrToken(tokenV1, mockEnv.TICKET_HMAC_SECRET)
      expect(parsedV1.qrVersion).toBe(1)

      // Rotate QR
      const rotationResult = await rotateTicketQr(db, 'ticket-rot', mockEnv)
      expect(rotationResult.ticket.qr_version).toBe(2)
      expect(updatedVersion).toBe(2)

      // Verify new token v2 matches updated version
      const parsedV2 = await verifyAndParseQrToken(rotationResult.qr_token, mockEnv.TICKET_HMAC_SECRET)
      expect(parsedV2.qrVersion).toBe(2)

      // Verify that tokenV1 version does not match ticket's updated version in DB!
      expect(parsedV1.qrVersion).not.toBe(rotationResult.ticket.qr_version)

      // Exactly ONE ticket updated in place, no INSERT called
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE tickets SET qr_version = ?'))
      expect(db.prepare).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO tickets'))
    })
  })

  // ==========================================
  // 6. TICKET VIEWS, OWNERSHIP, STUDENT-ID
  // ==========================================
  describe('Owner Views & Student-ID Reminders', () => {
    const studentTicket: Ticket = {
      id: 'ticket-student-1',
      purchase_item_id: 'pi-gate',
      purchase_id: 'pur-1',
      ticket_type: 'GATE_PASS',
      beneficiary_id: buyer.id,
      event_id: null,
      tier: 'STUDENT',
      valid_from: festDays[0].starts_at,
      valid_to: festDays[2].ends_at,
      qr_version: 1,
      status: 'ACTIVE',
      event_checked_in_at: null,
      replaces_ticket_id: null,
      created_at: 1000,
      updated_at: 1000,
    }

    const generalTicket: Ticket = {
      ...studentTicket,
      id: 'ticket-general-2',
      tier: 'GENERAL',
      beneficiary_id: teamMember.id,
    }

    it('enforces ownership: owner can view ticket, non-owner gets 404', async () => {
      const db = createMockD1({
        firstHandler: (sql, args) => {
          if (sql.includes('FROM tickets WHERE id = ?')) {
            return args[0] === studentTicket.id ? studentTicket : null
          }
          if (sql.includes('FROM purchases WHERE id = ?')) {
            return { id: 'pur-1', status: 'PAID', total_amount_paise: 20000 }
          }
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('FROM settings')) {
            return {
              results: [
                { key: 'student_id_warning_text', value: 'Must present college ID card at gate.' },
              ],
            }
          }
          return { results: [] }
        },
      })

      // Owner (buyer) views own ticket
      const ownerView = await getEnrichedTicketForOwner(db, studentTicket.id, buyer, mockEnv)
      expect(ownerView.id).toBe(studentTicket.id)
      expect(ownerView.qr_token).toMatch(/^tx1\.ticket-student-1\.1\./)

      // Other user (teamMember) tries to view buyer's ticket -> 404 existence hiding
      await expect(
        getEnrichedTicketForOwner(db, studentTicket.id, teamMember, mockEnv)
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 404,
        code: 'NOT_FOUND',
      })
    })

    it('includes physical student ID reminder on student-tier tickets and omits on general', async () => {
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM purchases WHERE id = ?')) {
            return { id: 'pur-1', status: 'PAID', total_amount_paise: 20000 }
          }
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('FROM settings')) {
            return {
              results: [
                {
                  key: 'student_id_warning_text',
                  value: 'Physical student institution ID card must be presented at entry for verification.',
                },
              ],
            }
          }
          if (sql.includes('FROM tickets WHERE beneficiary_id = ?')) {
            return { results: [studentTicket] }
          }
          if (sql.includes('FROM purchases')) {
            return { results: [] }
          }
          return { results: [] }
        },
      })

      // Buyer view for student ticket
      const userTickets = await getUserTickets(db, buyer, mockEnv)
      expect(userTickets.tickets.length).toBe(1)
      expect(userTickets.tickets[0].tier).toBe('STUDENT')
      expect(userTickets.tickets[0].student_id_warning).toBe(
        'Physical student institution ID card must be presented at entry for verification.'
      )

      // Format general ticket view
      const generalDb = createMockD1({
        firstHandler: () => ({ id: 'pur-1', status: 'PAID', total_amount_paise: 20000 }),
        allHandler: (sql) => {
          if (sql.includes('FROM settings')) return { results: [] }
          if (sql.includes('FROM tickets WHERE beneficiary_id = ?')) return { results: [generalTicket] }
          return { results: [] }
        },
      })

      const generalTickets = await getUserTickets(generalDb, teamMember, mockEnv)
      expect(generalTickets.tickets.length).toBe(1)
      expect(generalTickets.tickets[0].tier).toBe('GENERAL')
      expect(generalTickets.tickets[0].student_id_warning).toBeNull()
    })

    it('returns safe preparing tickets state and retry affordance if paid but fulfillment failed', async () => {
      const db = createMockD1({
        allHandler: (sql) => {
          if (sql.includes('FROM settings')) return { results: [] }
          if (sql.includes('FROM tickets WHERE beneficiary_id = ?')) {
            return { results: [] } // No active tickets yet
          }
          if (sql.includes('FROM purchases')) {
            return {
              results: [
                {
                  id: 'pur-failed-ful',
                  total_amount_paise: 20000,
                  status: 'PAID',
                  fulfillment_status: 'FAILED',
                  fulfillment_attempts: 2,
                  fulfillment_last_error: 'Temporary lock error',
                  updated_at: 1000,
                },
              ],
            }
          }
          return { results: [] }
        },
      })

      const view = await getUserTickets(db, buyer, mockEnv)
      expect(view.tickets).toEqual([])
      expect(view.preparing_tickets.length).toBe(1)

      const prep = view.preparing_tickets[0]
      expect(prep.purchase_id).toBe('pur-failed-ful')
      expect(prep.status).toBe('FAILED')
      expect(prep.can_retry).toBe(true)
      expect(prep.retry_endpoint).toBe('/api/purchases/pur-failed-ful/retry-fulfillment')
      expect(prep.message).toContain('Ticket generation encountered an issue')
    })
  })

  // ==========================================
  // 7. DERIVED VALIDITY CALCULATION
  // ==========================================
  describe('Derived Validity State Calculation', () => {
    it('accurately computes VALID, UPCOMING, EXPIRED, and REVOKED states', () => {
      const baseTicket: Ticket = {
        id: 't-val',
        purchase_item_id: 'pi-1',
        purchase_id: 'pur-1',
        ticket_type: 'GATE_PASS',
        beneficiary_id: 'u-1',
        event_id: null,
        tier: 'GENERAL',
        valid_from: 1000,
        valid_to: 2000,
        qr_version: 1,
        status: 'ACTIVE',
        event_checked_in_at: null,
        replaces_ticket_id: null,
        created_at: 500,
        updated_at: 500,
      }

      // 1. Before window
      expect(deriveTicketValidity(baseTicket, 999)).toEqual({
        valid_from: 1000,
        valid_to: 2000,
        state: 'UPCOMING',
        is_currently_valid: false,
      })

      // 2. Inside window
      expect(deriveTicketValidity(baseTicket, 1500)).toEqual({
        valid_from: 1000,
        valid_to: 2000,
        state: 'VALID',
        is_currently_valid: true,
      })

      // 3. After window
      expect(deriveTicketValidity(baseTicket, 2001)).toEqual({
        valid_from: 1000,
        valid_to: 2000,
        state: 'EXPIRED',
        is_currently_valid: false,
      })

      // 4. Revoked ticket
      const revokedTicket: Ticket = { ...baseTicket, status: 'REVOKED' }
      expect(deriveTicketValidity(revokedTicket, 1500)).toEqual({
        valid_from: 1000,
        valid_to: 2000,
        state: 'REVOKED',
        is_currently_valid: false,
      })
    })
  })

  // ==========================================
  // 8. CRON SERVICE ENTRYPOINT
  // ==========================================
  describe('Cron Fulfillment Service Entrypoint', () => {
    it('processes pending failed/not-started fulfillments and records results', async () => {
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM purchases WHERE id = ?')) {
            return {
              id: 'pur-cron-1',
              status: 'PAID',
              fulfillment_status: 'FAILED',
              fulfillment_attempts: 1,
            }
          }
          if (sql.includes('FROM events WHERE id = ?')) return day2Event
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('SELECT id FROM purchases') && sql.includes("status = 'PAID'")) {
            return { results: [{ id: 'pur-cron-1' }] }
          }
          if (sql.includes('FROM fest_days')) return { results: festDays }
          if (sql.includes('FROM purchase_items')) return { results: purchaseItems }
          if (sql.includes('FROM tickets WHERE purchase_id = ?')) return { results: [] }
          return { results: [] }
        },
        batchHandler: async () => [],
      })

      const cronResult = await processPendingFulfillments(db, mockEnv)
      expect(cronResult.processed).toBe(1)
      expect(cronResult.succeeded).toBe(1)
      expect(cronResult.failed).toBe(0)
    })
  })
})

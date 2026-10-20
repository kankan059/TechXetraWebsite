import { describe, it, expect, vi } from 'vitest'
import {
  lookupScan,
  admitScan,
  denyScan,
  assertScannerAuthorized,
} from '../src/services/scan.service'
import { generateQrToken } from '../src/utils/qr'
import { AppError } from '../src/common/errors'
import type { Ticket, Purchase, User, CheckInLog } from '../src/types'
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

describe('TASK-08: Gate Entry & Event Check-in Scanning', () => {
  const mockSecret = 'gate-and-event-scan-hmac-secret-test-key-32'
  const mockEnv: CloudflareBindings = {
    DB: {} as D1Database,
    TICKET_HMAC_SECRET: mockSecret,
    GOOGLE_CLIENT_ID: 'google-client-id',
    FRONTEND_ORIGIN: 'http://localhost:3000',
    UPI_VPA: 'techxetra@upi',
    UPI_PAYEE_NAME: 'TechXetra 2026',
  }

  const gateScanner: User = {
    id: 'user-gate-staff',
    google_sub: 'sub-gate',
    email: 'gatestaff@example.com',
    name: 'Gate Volunteer',
    avatar_url: null,
    phone: '9000000001',
    is_student: 0,
    institution_name: null,
    institution_id: null,
    student_fields_locked: 0,
    role: 'VOLUNTEER',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const eventScanner: User = {
    ...gateScanner,
    id: 'user-event-staff-a',
    email: 'eventstaff@example.com',
    name: 'Event A Volunteer',
  }

  const regularParticipant: User = {
    ...gateScanner,
    id: 'user-regular-participant',
    email: 'regular@example.com',
    name: 'Regular Participant',
    role: 'PARTICIPANT',
  }

  const superAdminScanner: User = {
    ...gateScanner,
    id: 'user-super-admin',
    email: 'admin@example.com',
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
  }

  const studentBeneficiary: User = {
    id: 'user-beneficiary-student',
    google_sub: 'sub-student',
    email: 'student.ben@example.com',
    name: 'Student Beneficiary',
    avatar_url: null,
    phone: '9876543210',
    is_student: 1,
    institution_name: 'National Tech Institute',
    institution_id: 'NTI-2026-CS-09',
    student_fields_locked: 1,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const gateTicket: Ticket = {
    id: 'ticket-gate-1',
    purchase_item_id: 'pi-1',
    purchase_id: 'pur-1',
    ticket_type: 'GATE_PASS',
    beneficiary_id: studentBeneficiary.id,
    event_id: null,
    tier: 'STUDENT',
    valid_from: 100000,
    valid_to: 200000,
    qr_version: 1,
    status: 'ACTIVE',
    event_checked_in_at: null,
    replaces_ticket_id: null,
    created_at: 1000,
    updated_at: 1000,
  }

  const eventTicket: Ticket = {
    ...gateTicket,
    id: 'ticket-event-a',
    ticket_type: 'EVENT_PASS',
    event_id: 'evt-a',
    tier: 'STUDENT',
  }

  // ==========================================
  // 1. SCANNER AUTHORIZATION BOUNDARIES
  // ==========================================
  describe('Scanner Authorization & Information Leak Prevention', () => {
    it('unauthorized scanner response does not leak ticket existence, owner, or validity', async () => {
      let queryExecutedForTicket = false
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM gate_staff')) return null // Not gate staff
          if (sql.includes('FROM tickets')) {
            queryExecutedForTicket = true
            return gateTicket
          }
          return null
        },
      })

      const token = await generateQrToken(mockSecret, gateTicket.id, 1)

      // Regular participant tries to lookup
      await expect(
        lookupScan(db, regularParticipant, { token, context: 'GATE' }, mockEnv, 150000)
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 403,
        code: 'FORBIDDEN',
      })

      // Ticket table must NEVER be queried for unauthorized scanners!
      expect(queryExecutedForTicket).toBe(false)
    })

    it('volunteer assigned to Event A cannot scan Event B by changing request body', async () => {
      const db = createMockD1({
        firstHandler: (sql, args) => {
          // Scanner is assigned to evt-a, NOT evt-b
          if (sql.includes('FROM event_staff')) {
            const [targetEventId, staffUserId] = args
            return targetEventId === 'evt-a' && staffUserId === eventScanner.id ? { 1: 1 } : null
          }
          return null
        },
      })

      const token = await generateQrToken(mockSecret, 'ticket-event-b', 1)

      await expect(
        lookupScan(db, eventScanner, { token, context: 'EVENT', event_id: 'evt-b' }, mockEnv, 150000)
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 403,
        code: 'FORBIDDEN',
      })
    })

    it('SUPER_ADMIN is authorized for both GATE and EVENT without explicit staff assignment', async () => {
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM tickets')) {
            return {
              ...gateTicket,
              ticket_status: gateTicket.status,
              purchase_status: 'PAID',
              beneficiary_name: 'Super Beneficiary',
              institution_name: null,
              institution_id: null,
            }
          }
          return null
        },
      })

      const token = await generateQrToken(mockSecret, gateTicket.id, 1)
      const res = await lookupScan(db, superAdminScanner, { token, context: 'GATE' }, mockEnv, 150000)
      expect(res.verdict).toBe('VALID')
    })
  })

  // ==========================================
  // 2. TOKEN INTEGRITY & CRYPTO PRE-CHECKS
  // ==========================================
  describe('Cryptographic Pre-checks', () => {
    it('forged token is rejected before ticket database lookup', async () => {
      let queryExecutedForTicket = false
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM gate_staff')) return { 1: 1 }
          if (sql.includes('FROM tickets')) {
            queryExecutedForTicket = true
            return gateTicket
          }
          return null
        },
      })

      const forgedToken = 'tx1.ticket-gate-1.1.invalid_signature_here'

      await expect(
        lookupScan(db, gateScanner, { token: forgedToken, context: 'GATE' }, mockEnv, 150000)
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 401,
        code: 'INVALID_QR_SIGNATURE',
      })

      expect(queryExecutedForTicket).toBe(false)
    })
  })

  // ==========================================
  // 3. LOOKUP VERDICTS & PRIVACY
  // ==========================================
  describe('Scan Lookup Verdicts & Privacy Guarantees', () => {
    const makeLookupDb = (ticketOverrides: Partial<any> = {}) => {
      return createMockD1({
        firstHandler: (sql, args) => {
          if (sql.includes('FROM gate_staff')) return { 1: 1 }
          if (sql.includes('FROM event_staff')) return { 1: 1 }
          if (sql.includes('FROM tickets t')) {
            return {
              ...eventTicket,
              ticket_status: eventTicket.status,
              purchase_status: 'PAID',
              beneficiary_name: studentBeneficiary.name,
              institution_name: studentBeneficiary.institution_name,
              institution_id: studentBeneficiary.institution_id,
              event_table_id: 'evt-a',
              event_title: 'Hackathon',
              event_category: 'TECHNICAL',
              event_day: 2,
              ...ticketOverrides,
            }
          }
          return null
        },
      })
    };

    it('no phone or email exposed in lookup payload', async () => {
      const db = makeLookupDb()
      const token = await generateQrToken(mockSecret, eventTicket.id, 1)

      const result = await lookupScan(db, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 150000)
      expect(result.verdict).toBe('VALID')

      const serialized = JSON.stringify(result)
      expect(serialized).not.toContain(studentBeneficiary.email)
      expect(serialized).not.toContain(studentBeneficiary.phone!)
      expect((result.ticket as any)?.email).toBeUndefined()
      expect((result.ticket as any)?.phone).toBeUndefined()
    })

    it('returns WRONG_TICKET_TYPE when gate pass is scanned in EVENT context', async () => {
      const db = makeLookupDb({ ticket_type: 'GATE_PASS', event_id: null, event_table_id: null })
      const token = await generateQrToken(mockSecret, 'ticket-gate-1', 1)

      const result = await lookupScan(db, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 150000)
      expect(result.verdict).toBe('WRONG_TICKET_TYPE')
      expect(result.reason).toContain('Gate pass cannot be used for event admission')
    })

    it('returns WRONG_EVENT when ticket is for a different event', async () => {
      const db = makeLookupDb({ event_id: 'evt-different', event_table_id: 'evt-different', event_title: 'Robotics' })
      const token = await generateQrToken(mockSecret, 'ticket-event-a', 1)

      const result = await lookupScan(db, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 150000)
      expect(result.verdict).toBe('WRONG_EVENT')
    })

    it('returns ALREADY_USED when event ticket has already checked in', async () => {
      const db = makeLookupDb({ event_checked_in_at: 123456 })
      const token = await generateQrToken(mockSecret, 'ticket-event-a', 1)

      const result = await lookupScan(db, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 150000)
      expect(result.verdict).toBe('ALREADY_USED')
    })

    it('returns NOT_YET_VALID and EXPIRED on boundary violations', async () => {
      const db = makeLookupDb()
      const token = await generateQrToken(mockSecret, 'ticket-event-a', 1)

      // 1. Before valid_from (100000)
      const earlyResult = await lookupScan(db, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 99999)
      expect(earlyResult.verdict).toBe('NOT_YET_VALID')

      // 2. After valid_to (200000)
      const lateResult = await lookupScan(db, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 200001)
      expect(lateResult.verdict).toBe('EXPIRED')
    })

    it('returns REVOKED and PAYMENT_NOT_APPROVED when ticket status is non-active or unpaid', async () => {
      const token = await generateQrToken(mockSecret, 'ticket-event-a', 1)

      // Revoked
      const revokedDb = makeLookupDb({ ticket_status: 'REVOKED' })
      const resRevoked = await lookupScan(revokedDb, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 150000)
      expect(resRevoked.verdict).toBe('REVOKED')

      // Unpaid
      const unpaidDb = makeLookupDb({ purchase_status: 'AWAITING_PAYMENT' })
      const resUnpaid = await lookupScan(unpaidDb, eventScanner, { token, context: 'EVENT', event_id: 'evt-a' }, mockEnv, 150000)
      expect(resUnpaid.verdict).toBe('PAYMENT_NOT_APPROVED')
    })
  })

  // ==========================================
  // 4. EVENT ADMIT RACE & SINGLE-USE ATOMICITY
  // ==========================================
  describe('Race-Safe Event Single-Use Enforcement', () => {
    it('10 parallel EVENT admits of same ticket: exactly one ADMITTED; others ALREADY_USED/conflict after reread', async () => {
      let isCheckedIn = false

      // Create 10 concurrent requests to admitScan
      const runParallelAdmit = async (attemptIndex: number) => {
        const db = createMockD1({
          firstHandler: (sql, args) => {
            if (sql.includes('FROM event_staff')) return { 1: 1 }
            if (sql.includes('FROM check_in_logs WHERE client_scan_id = ?')) return null
            if (sql.includes('FROM tickets t')) {
              return {
                ...eventTicket,
                purchase_status: 'PAID',
                event_checked_in_at: isCheckedIn ? 150000 : null,
              }
            }
            if (sql.includes('SELECT event_checked_in_at FROM tickets WHERE id = ?')) {
              return { event_checked_in_at: isCheckedIn ? 150000 : null }
            }
            return null
          },
          batchHandler: async () => {
            if (isCheckedIn) {
              // Duplicate scan guard triggered!
              throw new Error('CHECK constraint failed: _guard')
            }
            // Winner locks the row
            isCheckedIn = true
            return []
          },
        })

        const token = await generateQrToken(mockSecret, eventTicket.id, 1)

        try {
          const res = await admitScan(
            db,
            eventScanner,
            {
              token,
              context: 'EVENT',
              event_id: 'evt-a',
              student_id_checked: true,
              client_scan_id: `scan-client-${attemptIndex}`,
            },
            mockEnv,
            150000
          )
          return { status: 'ADMITTED', res }
        } catch (err: any) {
          return { status: 'CONFLICT', error: err }
        }
      }

      // Execute 10 parallel admissions
      const results = await Promise.all([
        runParallelAdmit(1),
        runParallelAdmit(2),
        runParallelAdmit(3),
        runParallelAdmit(4),
        runParallelAdmit(5),
        runParallelAdmit(6),
        runParallelAdmit(7),
        runParallelAdmit(8),
        runParallelAdmit(9),
        runParallelAdmit(10),
      ])

      const admitted = results.filter((r) => r.status === 'ADMITTED')
      const conflicts = results.filter((r) => r.status === 'CONFLICT')

      // Exactly ONE admitted
      expect(admitted.length).toBe(1)
      expect(conflicts.length).toBe(9)

      // The 9 rejected all received 409 ALREADY_CHECKED_IN
      for (const c of conflicts) {
        expect(c.error).toMatchObject({
          name: 'AppError',
          status: 409,
          code: 'ALREADY_CHECKED_IN',
        })
      }
    })
  })

  // ==========================================
  // 5. GATE ADMIT REPEATABILITY & CLIENT_SCAN_ID
  // ==========================================
  describe('Gate Repeatable Admits & Client Scan Idempotence', () => {
    it('repeated GATE admits create multiple logs; retry with same client_scan_id returns same result and no duplicate log', async () => {
      let logInsertsCount = 0
      const existingLogs: CheckInLog[] = []

      const makeGateDb = () =>
        createMockD1({
          firstHandler: (sql, args) => {
            if (sql.includes('FROM gate_staff')) return { 1: 1 }
            if (sql.includes('FROM check_in_logs WHERE client_scan_id = ?')) {
              const [clientScanId] = args
              return existingLogs.find((l) => l.client_scan_id === clientScanId) || null
            }
            if (sql.includes('FROM tickets t')) {
              return {
                ...gateTicket,
                purchase_status: 'PAID',
              }
            }
            return null
          },
          batchHandler: async (stmts) => {
            logInsertsCount++
            const insertStmt = stmts.find((s) => s.sql.includes('INSERT INTO check_in_logs'))
            if (insertStmt) {
              const [logId, ticketId, scannerId, studentChecked, clientScanId, createdAt] = insertStmt.args
              existingLogs.push({
                id: logId,
                ticket_id: ticketId,
                context: 'GATE',
                event_id: null,
                scanner_id: scannerId,
                verdict: 'ADMITTED',
                reason: null,
                student_id_checked: studentChecked,
                client_scan_id: clientScanId,
                created_at: createdAt,
              })
            }
            return []
          },
        })

      const token = await generateQrToken(mockSecret, gateTicket.id, 1)

      // First admission at gate with scan ID 1
      const db1 = makeGateDb()
      const res1 = await admitScan(
        db1,
        gateScanner,
        { token, context: 'GATE', student_id_checked: true, client_scan_id: 'gate-scan-uuid-1' },
        mockEnv,
        150000
      )
      expect(res1.verdict).toBe('ADMITTED')
      expect(res1.idempotent_replay).toBeUndefined()
      expect(logInsertsCount).toBe(1)

      // Repeated admission later in the day without scan ID: creates a SECOND log entry (gate re-entry permitted!)
      const db2 = makeGateDb()
      const res2 = await admitScan(
        db2,
        gateScanner,
        { token, context: 'GATE', student_id_checked: true },
        mockEnv,
        160000
      )
      expect(res2.verdict).toBe('ADMITTED')
      expect(logInsertsCount).toBe(2)

      // Retry of scan ID 1 (network retry / duplicate scan request): returns same result, NO new batch insert
      const db3 = makeGateDb()
      const resRetry = await admitScan(
        db3,
        gateScanner,
        { token, context: 'GATE', student_id_checked: true, client_scan_id: 'gate-scan-uuid-1' },
        mockEnv,
        170000
      )
      expect(resRetry.verdict).toBe('ADMITTED')
      expect(resRetry.idempotent_replay).toBe(true)
      expect(resRetry.log_id).toBe(res1.log_id)
      // logInsertsCount did not increment!
      expect(logInsertsCount).toBe(2)
    })
  })

  // ==========================================
  // 6. STUDENT ID PHYSICAL INSPECTION
  // ==========================================
  describe('Student ID Verification Requirements', () => {
    it('student ID missing check denies admission; student_id_checked flag is auditable', async () => {
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM gate_staff')) return { 1: 1 }
          if (sql.includes('FROM tickets t')) {
            return {
              ...gateTicket,
              purchase_status: 'PAID',
              tier: 'STUDENT',
            }
          }
          return null
        },
      })

      const token = await generateQrToken(mockSecret, gateTicket.id, 1)

      // 1. Admit without student_id_checked=true fails
      await expect(
        admitScan(db, gateScanner, { token, context: 'GATE', student_id_checked: false }, mockEnv, 150000)
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 400,
        code: 'STUDENT_ID_CHECK_REQUIRED',
      })

      // 2. Deny scan records DENIED log with student ID mismatch reason
      let denyRunLogged = false
      const denyDb = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM gate_staff')) return { 1: 1 }
          return null
        },
        runHandler: (sql, args) => {
          if (sql.includes('INSERT INTO check_in_logs')) {
            denyRunLogged = true
            expect(args[5]).toBe('DENIED')
            expect(args[6]).toBe('Physical student institution ID name mismatch')
          }
          return { meta: { changes: 1 } }
        },
      })

      const denyResult = await denyScan(
        denyDb,
        gateScanner,
        {
          token,
          context: 'GATE',
          reason: 'Physical student institution ID name mismatch',
        },
        mockEnv,
        150000
      )

      expect(denyResult.verdict).toBe('DENIED')
      expect(denyResult.reason).toBe('Physical student institution ID name mismatch')
      expect(denyRunLogged).toBe(true)
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import {
  updateUserByAdmin,
  listAdminUsers,
  getAdminUserDetail,
} from '../src/services/admin-user.service'
import {
  revokeTicketByAdmin,
  reissueTicketByAdmin,
  rotateTicketQrByAdmin,
  undoEventCheckInByAdmin,
} from '../src/services/admin-ticket.service'
import {
  cancelRegistrationByAdmin,
  replaceRegistrationMemberByAdmin,
} from '../src/services/admin-registration.service'
import {
  getSalesReport,
  getPendingVerificationReport,
  getEventRegistrationsReport,
  getSeatReconciliationReport,
  fixEventSeatsReconciliation,
  getAttendanceReport,
  getFailedFulfillmentReport,
  getStudentTierReport,
  getDuplicateInstitutionsReport,
} from '../src/services/report.service'
import { queryAuditLogs } from '../src/services/audit.service'
import { executeBatch } from '../src/db/batch'
import { verifyAndParseQrToken } from '../src/utils/qr'
import { AppError } from '../src/common/errors'
import type { User, Ticket, Registration, Purchase, Event } from '../src/types'
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

describe('TASK-10: Admin Operations, Audit Coverage, and Reports', () => {
  const mockSecret = 'admin-audit-reports-hmac-secret-test-key-32'
  const mockEnv: CloudflareBindings = {
    DB: {} as D1Database,
    TICKET_HMAC_SECRET: mockSecret,
    GOOGLE_CLIENT_ID: 'google-client-id',
    FRONTEND_ORIGIN: 'http://localhost:3000',
    UPI_VPA: 'techxetra@upi',
    UPI_PAYEE_NAME: 'TechXetra 2026',
  }

  const superAdmin: User = {
    id: 'user-super-admin',
    google_sub: 'sub-admin',
    email: 'admin@example.com',
    name: 'Super Admin',
    avatar_url: null,
    phone: null,
    is_student: 0,
    institution_name: null,
    institution_id: null,
    student_fields_locked: 0,
    role: 'SUPER_ADMIN',
    can_review_payments: 1,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const leadUser: User = {
    ...superAdmin,
    id: 'user-lead',
    email: 'lead@example.com',
    name: 'Event Lead',
    role: 'LEAD',
    can_review_payments: 0,
  }

  const volunteerUser: User = {
    ...superAdmin,
    id: 'user-volunteer',
    email: 'volunteer@example.com',
    name: 'Volunteer',
    role: 'VOLUNTEER',
    can_review_payments: 0,
  }

  const participantUser: User = {
    ...superAdmin,
    id: 'user-participant',
    email: 'participant@example.com',
    name: 'Participant User',
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_student: 1,
    institution_id: 'INST-001',
    institution_name: 'Tech University',
  }

  const replacementStudent: User = {
    ...participantUser,
    id: 'user-replacement-student',
    email: 'replacement@example.com',
    name: 'Replacement Student',
    institution_id: 'INST-002',
  }

  const nonStudentUser: User = {
    ...participantUser,
    id: 'user-non-student',
    email: 'nonstudent@example.com',
    name: 'Non Student',
    is_student: 0,
    institution_id: null,
    institution_name: null,
  }

  const testEvent: Event = {
    id: 'evt-test',
    slug: 'coding-battle',
    title: 'Coding Battle',
    category: 'TECHNICAL',
    description: 'Competitive coding',
    venue: 'Lab A',
    day_of_event: 1,
    starts_at: 1794010000000,
    ends_at: 1794080000000,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 0,
    min_team_size: 1,
    max_team_size: 1,
    price_model: 'FREE',
    price_paise: 0,
    student_price_paise: null,
    capacity: 50,
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

  const activeTicket: Ticket = {
    id: 'tkt-001',
    purchase_item_id: 'item-001',
    purchase_id: 'pur-001',
    ticket_type: 'EVENT_PASS',
    beneficiary_id: participantUser.id,
    event_id: testEvent.id,
    tier: 'STUDENT',
    valid_from: 1000,
    valid_to: 9999999999,
    qr_version: 1,
    status: 'ACTIVE',
    event_checked_in_at: null,
    replaces_ticket_id: null,
    created_at: 1000,
    updated_at: 1000,
  }

  const confirmedRegistration: Registration = {
    id: 'reg-001',
    event_id: testEvent.id,
    team_id: null,
    participant_id: participantUser.id,
    status: 'CONFIRMED',
    seat_count: 1,
    created_at: 1000,
    updated_at: 1000,
  }

  // ==========================================
  // 1. USER & STAFF MANAGEMENT GUARDRAILS
  // ==========================================
  describe('User & Staff Management', () => {
    it('role/active/reviewer flag changes are SUPER_ADMIN-only', async () => {
      const db = createMockD1({
        firstHandler: () => participantUser,
      })

      // Non-superadmin cannot modify users
      await expect(
        updateUserByAdmin(db, participantUser.id, { role: 'LEAD' }, leadUser)
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      })
    })

    it('self-promotion or self-demotion is impossible', async () => {
      const db = createMockD1({
        firstHandler: () => superAdmin,
      })

      // Super admin trying to modify own role
      await expect(
        updateUserByAdmin(db, superAdmin.id, { role: 'LEAD' }, superAdmin)
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      })
    })

    it('self-deactivation is rejected', async () => {
      const db = createMockD1({
        firstHandler: () => superAdmin,
      })

      await expect(
        updateUserByAdmin(db, superAdmin.id, { is_active: false }, superAdmin)
      ).rejects.toMatchObject({
        status: 400,
        code: 'BAD_REQUEST',
      })
    })

    it('rejects invalid role-assignment: participants cannot review payments', async () => {
      const db = createMockD1({
        firstHandler: () => participantUser,
      })

      await expect(
        updateUserByAdmin(db, participantUser.id, { can_review_payments: true }, superAdmin)
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_ROLE_ASSIGNMENT',
      })
    })

    it('deactivation revokes sessions immediately in the same batch with audit row', async () => {
      let batchStatements: any[] = []
      const db = createMockD1({
        firstHandler: () => participantUser,
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      const updated = await updateUserByAdmin(
        db,
        participantUser.id,
        { is_active: false, reason: 'Suspicious activity' },
        superAdmin
      )

      expect(updated.is_active).toBe(0)

      // Verify that user update, session revocation, and audit log were submitted in one batch
      const updateUserStmt = batchStatements.find((s) => s.sql.includes('UPDATE users SET'))
      const revokeSessionsStmt = batchStatements.find((s) => s.sql.includes('UPDATE sessions SET revoked_at'))
      const auditStmt = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))

      expect(updateUserStmt).toBeDefined()
      expect(revokeSessionsStmt).toBeDefined()
      expect(auditStmt).toBeDefined()
      expect(auditStmt.args[2]).toBe('USER_DEACTIVATED')
    })
  })

  // ==========================================
  // 2. AUDIT TABLE IMMUTABILITY
  // ==========================================
  describe('Audit Tables Immutability', () => {
    it('audit tables reject unauthorized UPDATE or DELETE (triggers error map)', async () => {
      const mockDb = {
        batch: vi.fn().mockRejectedValue(new Error('abort at 12: audit_logs is append-only')),
      } as unknown as D1Database

      await expect(
        executeBatch(mockDb, [{} as any])
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 403,
        code: 'IMMUTABLE_RECORD',
      })
    })

    it('payment_audit_logs reject unauthorized mutation', async () => {
      const mockDb = {
        batch: vi.fn().mockRejectedValue(new Error('abort at 10: payment_audit_logs is append-only')),
      } as unknown as D1Database

      await expect(
        executeBatch(mockDb, [{} as any])
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 403,
        code: 'IMMUTABLE_RECORD',
      })
    })
  })

  // ==========================================
  // 3. TICKET REVOKE, REISSUE & QR ROTATION
  // ==========================================
  describe('Ticket Operations & QR Invalidation', () => {
    it('revoking ticket requires reason and marks ticket REVOKED with audit row', async () => {
      let batchStatements: any[] = []
      const db = createMockD1({
        firstHandler: () => activeTicket,
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      // Missing reason fails
      await expect(
        revokeTicketByAdmin(db, activeTicket.id, '  ', superAdmin)
      ).rejects.toMatchObject({
        status: 400,
        code: 'REASON_REQUIRED',
      })

      // Non-admin fails
      await expect(
        revokeTicketByAdmin(db, activeTicket.id, 'Fraud suspected', leadUser)
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      })

      // Super admin revokes
      const revoked = await revokeTicketByAdmin(
        db,
        activeTicket.id,
        'Fraud suspected',
        superAdmin
      )
      expect(revoked.status).toBe('REVOKED')

      const updateStmt = batchStatements.find((s) => s.sql.includes("UPDATE tickets SET status = 'REVOKED'"))
      const auditStmt = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))
      expect(updateStmt).toBeDefined()
      expect(auditStmt).toBeDefined()
      expect(auditStmt.args[2]).toBe('TICKET_REVOKED')
    })

    it('checked-in ticket cannot be silently transferred or reissued', async () => {
      const checkedInTicket: Ticket = {
        ...activeTicket,
        event_checked_in_at: 1794015000000,
      }

      const db = createMockD1({
        firstHandler: () => checkedInTicket,
      })

      await expect(
        reissueTicketByAdmin(db, checkedInTicket.id, 'Transfer to peer', mockEnv, superAdmin, {
          newBeneficiaryId: replacementStudent.id,
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'TICKET_ALREADY_CHECKED_IN',
      })
    })

    it('reissuing ticket preserves one active ticket invariant, links replaces_ticket_id, and checks student tier', async () => {
      const db = createMockD1({
        firstHandler: (sql, args) => {
          if (sql.includes('FROM tickets')) return activeTicket
          if (sql.includes('FROM users')) {
            if (args[0] === nonStudentUser.id) return nonStudentUser
            if (args[0] === replacementStudent.id) return replacementStudent
          }
          return null
        },
      })

      // Ineligible student tier replacement rejected
      await expect(
        reissueTicketByAdmin(db, activeTicket.id, 'Transfer to peer', mockEnv, superAdmin, {
          newBeneficiaryId: nonStudentUser.id,
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'INELIGIBLE_FOR_STUDENT_TIER',
      })

      // Eligible student replacement succeeds
      let batchStatements: any[] = []
      const successDb = createMockD1({
        firstHandler: (sql, args) => {
          if (sql.includes('FROM tickets')) return activeTicket
          if (sql.includes('FROM users')) return replacementStudent
          return null
        },
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      const res = await reissueTicketByAdmin(
        successDb,
        activeTicket.id,
        'Replacement for student transfer',
        mockEnv,
        superAdmin,
        { newBeneficiaryId: replacementStudent.id }
      )

      expect(res.old_ticket.status).toBe('REPLACED')
      expect(res.new_ticket.status).toBe('ACTIVE')
      expect(res.new_ticket.replaces_ticket_id).toBe(activeTicket.id)
      expect(res.new_ticket.beneficiary_id).toBe(replacementStudent.id)

      const updateOldStmt = batchStatements.find((s) => s.sql.includes("UPDATE tickets SET status = 'REPLACED'"))
      const insertNewStmt = batchStatements.find((s) => s.sql.includes('INSERT INTO tickets'))
      const updateItemStmt = batchStatements.find((s) => s.sql.includes('UPDATE purchase_items SET beneficiary_id'))
      const auditStmt = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))

      expect(updateOldStmt).toBeDefined()
      expect(insertNewStmt).toBeDefined()
      expect(updateItemStmt).toBeDefined()
      expect(auditStmt).toBeDefined()
      expect(auditStmt.args[2]).toBe('TICKET_REISSUED')
    })

    it('rotate QR increments qr_version and invalidates previous token', async () => {
      let batchStatements: any[] = []
      const db = createMockD1({
        firstHandler: () => activeTicket,
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      const rotated = await rotateTicketQrByAdmin(
        db,
        activeTicket.id,
        'User lost phone screenshot',
        mockEnv,
        superAdmin
      )

      expect(rotated.ticket.qr_version).toBe(activeTicket.qr_version + 1)

      const parsedToken = await verifyAndParseQrToken(rotated.qr_token, mockSecret)
      expect(parsedToken.ticketId).toBe(activeTicket.id)
      expect(parsedToken.qrVersion).toBe(2)

      const updateStmt = batchStatements.find((s) => s.sql.includes('UPDATE tickets SET qr_version = ?'))
      expect(updateStmt).toBeDefined()
    })
  })

  // ==========================================
  // 4. EVENT CHECK-IN UNDO
  // ==========================================
  describe('Event Check-in Undo', () => {
    it('event check-in undo clears event_checked_in_at, updates log to OVERRIDDEN, and writes audit row', async () => {
      const checkedInTicket: Ticket = {
        ...activeTicket,
        event_checked_in_at: 1794015000000,
      }

      const admittedLog = {
        id: 'log-001',
        ticket_id: checkedInTicket.id,
        context: 'EVENT',
        event_id: testEvent.id,
        scanner_id: 'scanner-1',
        verdict: 'ADMITTED',
        reason: null,
        student_id_checked: 1,
        client_scan_id: 'client-1',
        created_at: 1794015000000,
      }

      let batchStatements: any[] = []
      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM tickets')) return checkedInTicket
          if (sql.includes('FROM check_in_logs')) return admittedLog
          return null
        },
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      // Undo check-in
      const res = await undoEventCheckInByAdmin(
        db,
        checkedInTicket.id,
        'Accidental scan by volunteer at event gate',
        superAdmin
      )

      expect(res.undone).toBe(true)

      const clearTicketStmt = batchStatements.find((s) => s.sql.includes('event_checked_in_at = NULL'))
      const updateLogStmt = batchStatements.find((s) => s.sql.includes("verdict = 'OVERRIDDEN'"))
      const auditStmt = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))

      expect(clearTicketStmt).toBeDefined()
      expect(updateLogStmt).toBeDefined()
      expect(auditStmt).toBeDefined()
      expect(auditStmt.args[2]).toBe('EVENT_CHECKIN_UNDONE')
    })
  })

  // ==========================================
  // 5. REGISTRATION CANCELLATION & MEMBER REPLACEMENT
  // ==========================================
  describe('Registration Cancellation & Replacement', () => {
    it('cancellation decrements seats_taken for confirmed registration, revokes tickets, and audits', async () => {
      let batchStatements: any[] = []
      const db = createMockD1({
        firstHandler: () => confirmedRegistration,
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      const result = await cancelRegistrationByAdmin(
        db,
        confirmedRegistration.id,
        'Participant requested withdrawal before festival',
        superAdmin
      )

      expect(result.cancelled).toBe(true)
      expect(result.freed_seats).toBe(1)

      const decrementSeatsStmt = batchStatements.find((s) => s.sql.includes('seats_taken = max(0, seats_taken - ?)'))
      const cancelRegStmt = batchStatements.find((s) => s.sql.includes("status = 'CANCELLED'"))
      const revokeTicketsStmt = batchStatements.find((s) => s.sql.includes("status = 'REVOKED'"))
      const auditStmt = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))

      expect(decrementSeatsStmt).toBeDefined()
      expect(cancelRegStmt).toBeDefined()
      expect(revokeTicketsStmt).toBeDefined()
      expect(auditStmt).toBeDefined()
      expect(auditStmt.args[2]).toBe('REGISTRATION_CANCELLED')
    })

    it('member replacement preserves confirmed seats and rejects already checked-in ticket', async () => {
      const checkedInOldTicket: Ticket = {
        ...activeTicket,
        event_checked_in_at: 1794015000000,
      }

      const db = createMockD1({
        firstHandler: (sql, args) => {
          if (sql.includes('FROM registrations WHERE id = ?')) return confirmedRegistration
          if (sql.includes('FROM registrations WHERE event_id = ?')) return null
          if (sql.includes('FROM users')) {
            if (args[0] === participantUser.id) return participantUser
            if (args[0] === replacementStudent.id) return replacementStudent
          }
          if (sql.includes('FROM tickets')) return checkedInOldTicket
          return null
        },
      })

      // Cannot replace member if ticket is already checked in
      await expect(
        replaceRegistrationMemberByAdmin(
          db,
          confirmedRegistration.id,
          {
            old_user_id: participantUser.id,
            new_user_id: replacementStudent.id,
            reason: 'Substitution',
          },
          mockEnv,
          superAdmin
        )
      ).rejects.toMatchObject({
        status: 409,
        code: 'TICKET_ALREADY_CHECKED_IN',
      })
    })
  })

  // ==========================================
  // 6. REPORTS & SEAT RECONCILIATION
  // ==========================================
  describe('Reports & Seat Reconciliation', () => {
    it('seat reconciliation detects discrepancy and fix endpoint re-syncs count with audit log', async () => {
      const db = createMockD1({
        allHandler: () => ({
          results: [
            {
              event_id: testEvent.id,
              title: testEvent.title,
              slug: testEvent.slug,
              capacity: 50,
              seats_taken: 10,
              recount_seats: 8, // Discrepancy!
              confirmed_seats: 8,
              reserved_seats: 0,
            },
          ],
        }),
      })

      const report = await getSeatReconciliationReport(db)
      expect(report.has_any_discrepancy).toBe(true)
      expect(report.events[0].has_discrepancy).toBe(true)
      expect(report.events[0].discrepancy_amount).toBe(2)

      // Fix reconciliation
      let batchStatements: any[] = []
      const fixDb = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events')) return testEvent
          if (sql.includes('recount_seats')) return { recount_seats: 8 }
          return null
        },
        batchHandler: async (stmts) => {
          batchStatements = stmts
          return []
        },
      })

      const fixed = await fixEventSeatsReconciliation(fixDb, testEvent.id, superAdmin)
      expect(fixed.fixed).toBe(true)
      expect(fixed.previous_seats).toBe(10)
      expect(fixed.new_seats).toBe(8)

      const updateStmt = batchStatements.find((s) => s.sql.includes('UPDATE events SET seats_taken = ?'))
      const auditStmt = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))
      expect(updateStmt).toBeDefined()
      expect(auditStmt).toBeDefined()
      expect(auditStmt.args[2]).toBe('SEATS_RECONCILED')
    })

    it('duplicate institution IDs are reported, not blocked', async () => {
      const db = createMockD1({
        allHandler: () => ({
          results: [
            {
              institution_id: 'TU-100',
              user_count: 3,
              emails: 'user1@example.com,user2@example.com,user3@example.com',
              names: 'User One,User Two,User Three',
            },
          ],
        }),
      })

      const report = await getDuplicateInstitutionsReport(db)
      expect(report.duplicate_count).toBe(1)
      expect(report.institutions[0].institution_id).toBe('TU-100')
      expect(report.institutions[0].user_count).toBe(3)
      expect(report.institutions[0].emails).toEqual([
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ])
    })

    it('sales, pending verification, registrations, and attendance reports execute correctly', async () => {
      const db = createMockD1({
        allHandler: (sql) => {
          if (sql.includes("p.status IN ('PENDING', 'ON_HOLD')")) {
            return {
              results: [
                {
                  payment_id: 'pay-1',
                  purchase_id: 'pur-1',
                  expected_amount_paise: 50000,
                  transaction_id: 'UTR12345678',
                  status: 'PENDING',
                  created_at: 1000,
                  buyer_id: 'user-1',
                  buyer_name: 'Buyer',
                  buyer_email: 'buyer@example.com',
                },
              ],
            }
          }
          if (sql.includes('GROUP BY status')) {
            return {
              results: [
                { status: 'PAID', count: 10, total_amount_paise: 500000 },
                { status: 'AWAITING_PAYMENT', count: 2, total_amount_paise: 100000 },
              ],
            }
          }
          return { results: [] }
        },
        firstHandler: () => ({ count: 5 }),
      })

      const sales = await getSalesReport(db)
      expect(sales.paid_count).toBe(10)
      expect(sales.paid_total_amount_paise).toBe(500000)

      const pending = await getPendingVerificationReport(db, 2000000000000)
      expect(pending.pending_count).toBe(1)
      expect(pending.overdue_count).toBe(1)

      const regs = await getEventRegistrationsReport(db)
      expect(Array.isArray(regs)).toBe(true)

      const attendance = await getAttendanceReport(db)
      expect(attendance.unique_gate_attendees_count).toBe(5)
    })
  })

  // ==========================================
  // 7. AUDIT VIEWER
  // ==========================================
  describe('Audit Log Viewer', () => {
    it('cursor-paginated audit logs viewer returns items with next_cursor', async () => {
      const db = createMockD1({
        allHandler: () => ({
          results: [
            {
              id: 'audit-2',
              actor_id: superAdmin.id,
              action: 'TICKET_REVOKED',
              target_type: 'TICKET',
              target_id: 'tkt-001',
              before_json: null,
              after_json: null,
              reason: 'Revoked by admin',
              ip_address: null,
              user_agent: null,
              created_at: 2000,
            },
            {
              id: 'audit-1',
              actor_id: superAdmin.id,
              action: 'USER_DEACTIVATED',
              target_type: 'USER',
              target_id: participantUser.id,
              before_json: null,
              after_json: null,
              reason: null,
              ip_address: null,
              user_agent: null,
              created_at: 1000,
            },
          ],
        }),
      })

      const res = await queryAuditLogs(db, { limit: 1 })
      expect(res.logs.length).toBe(1)
      expect(res.next_cursor).toBe('2000:audit-2')
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import {
  upsertScore,
  deleteScore,
  finalizeScores,
  reopenScores,
  getLeaderboard,
  listPublicLeaderboards,
} from '../src/services/esports.service'
import { createEvent } from '../src/services/event.service'
import { AppError } from '../src/common/errors'
import type { Event, Registration, User, EsportsScore } from '../src/types'

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

describe('TASK-09: E_SPORTS Scoring, History, Finalization & Leaderboards', () => {
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

  const eventLead: User = {
    ...superAdmin,
    id: 'user-lead-1',
    email: 'lead@example.com',
    name: 'Event Lead',
    role: 'LEAD',
  }

  const eventVolunteer: User = {
    ...superAdmin,
    id: 'user-vol-1',
    email: 'volunteer@example.com',
    name: 'Event Volunteer',
    role: 'VOLUNTEER',
  }

  const unassignedUser: User = {
    ...superAdmin,
    id: 'user-unassigned',
    email: 'unassigned@example.com',
    name: 'Unassigned User',
    role: 'PARTICIPANT',
  }

  const esportsEvent: Event = {
    id: 'evt-valorant',
    slug: 'valorant-tournament',
    title: 'Valorant Tournament',
    category: 'E_SPORTS',
    description: 'TechXetra Valorant Championship',
    venue: 'Seminar Hall 1',
    day_of_event: 2,
    starts_at: 1794010000000,
    ends_at: 1794080000000,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 1,
    min_team_size: 5,
    max_team_size: 5,
    price_model: 'FREE',
    price_paise: 0,
    student_price_paise: null,
    capacity: 16,
    seats_taken: 8,
    capacity_unit: 'TEAMS',
    scoring_enabled: 1,
    scoring_status: 'OPEN',
    max_rounds: 3,
    volunteers_can_score: 0,
    leaderboard_public: 1,
    created_at: 1000,
    updated_at: 1000,
  }

  const confirmedRegistration: Registration = {
    id: 'reg-team-alpha',
    event_id: esportsEvent.id,
    team_id: 'team-alpha',
    participant_id: 'user-leader-alpha',
    status: 'CONFIRMED',
    seat_count: 5,
    created_at: 1000,
    updated_at: 1000,
  }

  // ==========================================
  // 1. NON-E_SPORTS SCORING REJECTION
  // ==========================================
  describe('E_SPORTS-Only Scoring Constraints', () => {
    it('DB rejects scoring enabled or public leaderboard on non-E_SPORTS event', async () => {
      const db = createMockD1({
        firstHandler: () => null,
      })

      // Attempt creating a TECHNICAL event with scoring_enabled = true
      await expect(
        createEvent(
          db,
          {
            slug: 'coding-contest',
            title: 'Coding Contest',
            category: 'TECHNICAL',
            day_of_event: 1,
            starts_at: 1000,
            ends_at: 2000,
            scoring_enabled: true,
          },
          superAdmin
        )
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 400,
        code: 'INVALID_SCORING_CATEGORY',
      })
    })

    it('rejects scoring writes on non-E_SPORTS event category', async () => {
      const nonEsportsEvent: Event = {
        ...esportsEvent,
        category: 'CULTURAL',
        scoring_enabled: 0,
      }

      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) return nonEsportsEvent
          return null
        },
      })

      await expect(
        upsertScore(db, nonEsportsEvent.id, eventLead, {
          registration_id: 'reg-1',
          round_no: 1,
          score: 50,
        })
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 400,
        code: 'INVALID_CATEGORY',
      })
    })
  })

  // ==========================================
  // 2. PERMISSIONS & PRECONDITIONS
  // ==========================================
  describe('Permissions & Preconditions', () => {
    it('rejects writes when scoring is disabled, unassigned staff, volunteer cannot score, or registration unconfirmed', async () => {
      // 1. Scoring disabled
      const disabledDb = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) {
            return { ...esportsEvent, scoring_enabled: 0 }
          }
          return null
        },
      })

      await expect(
        upsertScore(disabledDb, esportsEvent.id, eventLead, {
          registration_id: confirmedRegistration.id,
          round_no: 1,
          score: 50,
        })
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 400,
        code: 'SCORING_DISABLED',
      })

      // 2. Unassigned staff/user
      const unassignedDb = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) return esportsEvent
          if (sql.includes('FROM event_staff')) return null // Not assigned
          return null
        },
      })

      await expect(
        upsertScore(unassignedDb, esportsEvent.id, unassignedUser, {
          registration_id: confirmedRegistration.id,
          round_no: 1,
          score: 50,
        })
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 403,
        code: 'FORBIDDEN',
      })

      // 3. Volunteer cannot score when volunteers_can_score = 0
      const volDb = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) {
            return { ...esportsEvent, volunteers_can_score: 0 }
          }
          if (sql.includes('FROM event_staff')) return { role: 'VOLUNTEER' }
          return null
        },
      })

      await expect(
        upsertScore(volDb, esportsEvent.id, eventVolunteer, {
          registration_id: confirmedRegistration.id,
          round_no: 1,
          score: 50,
        })
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 403,
        code: 'FORBIDDEN',
      })

      // 4. Registration unconfirmed (RESERVED)
      const unconfirmedDb = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) return esportsEvent
          if (sql.includes('FROM event_staff')) return { role: 'LEAD' }
          if (sql.includes('FROM registrations')) {
            return { ...confirmedRegistration, status: 'RESERVED' }
          }
          return null
        },
      })

      await expect(
        upsertScore(unconfirmedDb, esportsEvent.id, eventLead, {
          registration_id: confirmedRegistration.id,
          round_no: 1,
          score: 50,
        })
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 400,
        code: 'REGISTRATION_NOT_CONFIRMED',
      })
    })
  })

  // ==========================================
  // 3. OPTIMISTIC LOCKING & CONCURRENCY
  // ==========================================
  describe('Optimistic Concurrency & Version Conflicts', () => {
    it('two concurrent updates with same expected version yield one success and one version conflict', async () => {
      let currentVersion = 1
      let currentScore = 50

      const makeConcurrentDb = () =>
        createMockD1({
          firstHandler: (sql) => {
            if (sql.includes('FROM events WHERE id = ?')) return esportsEvent
            if (sql.includes('FROM event_staff')) return { role: 'LEAD' }
            if (sql.includes('FROM registrations')) return confirmedRegistration
            if (sql.includes('FROM esports_scores')) {
              return {
                id: 'score-1',
                event_id: esportsEvent.id,
                registration_id: confirmedRegistration.id,
                round_no: 1,
                score: currentScore,
                version: currentVersion,
                created_by: eventLead.id,
                updated_by: eventLead.id,
                created_at: 1000,
                updated_at: 1000,
              }
            }
            return null
          },
          batchHandler: async (stmts) => {
            const updateStmt = stmts.find((s) => s.sql.includes('UPDATE esports_scores SET'))
            if (updateStmt) {
              const expectedVer = updateStmt.args[5]
              if (expectedVer !== currentVersion) {
                throw new Error('CHECK constraint failed: _guard')
              }
              currentVersion = updateStmt.args[1]
              currentScore = updateStmt.args[0]
            }
            return []
          },
        })

      // Writer A updates from version 1 -> 2
      const dbA = makeConcurrentDb()
      const resA = await upsertScore(dbA, esportsEvent.id, eventLead, {
        registration_id: confirmedRegistration.id,
        round_no: 1,
        score: 75,
        expected_version: 1,
        reason: 'Round 1 score correction by Lead',
      })
      expect(resA.version).toBe(2)
      expect(resA.score).toBe(75)

      // Writer B also expected version 1 (which has now changed to 2)
      const dbB = makeConcurrentDb()
      await expect(
        upsertScore(dbB, esportsEvent.id, eventLead, {
          registration_id: confirmedRegistration.id,
          round_no: 1,
          score: 80,
          expected_version: 1,
          reason: 'Concurrent overwrite attempt',
        })
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 409,
        code: 'SCORE_VERSION_CONFLICT',
      })
    })
  })

  // ==========================================
  // 4. APPEND-ONLY HISTORY & AUDIT TRAILS
  // ==========================================
  describe('Append-Only History & Score Deletes', () => {
    it('create, update, and delete each produce correct immutable history rows', async () => {
      const historyRows: any[] = []

      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) return esportsEvent
          if (sql.includes('FROM event_staff')) return { role: 'LEAD' }
          if (sql.includes('FROM registrations')) return confirmedRegistration
          if (sql.includes('FROM esports_scores')) {
            if (historyRows.length === 0) return null // Initial create
            return {
              id: 'score-audit-1',
              event_id: esportsEvent.id,
              registration_id: confirmedRegistration.id,
              round_no: 1,
              score: 50,
              version: 1,
            }
          }
          return null
        },
        batchHandler: async (stmts) => {
          const histStmt = stmts.find((s) => s.sql.includes('INSERT INTO esports_score_history'))
          if (histStmt) {
            historyRows.push({
              action: histStmt.args[8],
              old_score: histStmt.args[5],
              new_score: histStmt.args[6],
              version: histStmt.args[7],
              reason: histStmt.args[9],
            })
          }
          return []
        },
      })

      // 1. Create score (version 1)
      await upsertScore(db, esportsEvent.id, eventLead, {
        registration_id: confirmedRegistration.id,
        round_no: 1,
        score: 50,
      })
      expect(historyRows[0]).toEqual({
        action: 'CREATE',
        old_score: null,
        new_score: 50,
        version: 1,
        reason: 'Initial round score entry',
      })

      // 2. Update score (version 2)
      await upsertScore(db, esportsEvent.id, eventLead, {
        registration_id: confirmedRegistration.id,
        round_no: 1,
        score: 60,
        expected_version: 1,
        reason: 'Penalty added',
      })
      expect(historyRows[1]).toEqual({
        action: 'UPDATE',
        old_score: 50,
        new_score: 60,
        version: 2,
        reason: 'Penalty added',
      })

      // 3. Delete score
      await deleteScore(db, esportsEvent.id, 'score-audit-1', eventLead, 'Disqualified player')
      expect(historyRows[2]).toEqual({
        action: 'DELETE',
        old_score: 50,
        new_score: null,
        version: 1,
        reason: 'Disqualified player',
      })
    })
  })

  // ==========================================
  // 5. FINALIZATION & SUPER_ADMIN REOPEN
  // ==========================================
  describe('Finalization & Reopening', () => {
    it('finalization blocks writes; only SUPER_ADMIN can reopen with reason', async () => {
      let eventScoringStatus = 'OPEN'

      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) {
            return { ...esportsEvent, scoring_status: eventScoringStatus }
          }
          if (sql.includes('FROM event_staff')) return { role: 'LEAD' }
          if (sql.includes('FROM registrations')) return confirmedRegistration
          return null
        },
        batchHandler: async (stmts) => {
          const updateStmt = stmts.find((s) => s.sql.includes('UPDATE events SET scoring_status'))
          if (updateStmt) {
            eventScoringStatus = updateStmt.args[0]
          }
          return []
        },
      })

      // 1. Event lead finalizes scores
      const finalizedEvent = await finalizeScores(db, esportsEvent.id, eventLead)
      expect(finalizedEvent.scoring_status).toBe('FINALIZED')
      expect(eventScoringStatus).toBe('FINALIZED')

      // 2. Writing score on finalized event fails
      await expect(
        upsertScore(db, esportsEvent.id, eventLead, {
          registration_id: confirmedRegistration.id,
          round_no: 1,
          score: 80,
        })
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 409,
        code: 'SCORING_NOT_OPEN',
      })

      // 3. Event Lead attempts to reopen -> fails with 403 (SUPER_ADMIN only)
      await expect(
        reopenScores(db, esportsEvent.id, eventLead, 'Lead wants to edit')
      ).rejects.toMatchObject({
        name: 'AppError',
        status: 403,
        code: 'FORBIDDEN',
      })

      // 4. SUPER_ADMIN reopens scores with reason
      const reopenedEvent = await reopenScores(
        db,
        esportsEvent.id,
        superAdmin,
        'Admin verified referee mistake in round 2'
      )
      expect(reopenedEvent.scoring_status).toBe('OPEN')
      expect(eventScoringStatus).toBe('OPEN')
    })
  })

  // ==========================================
  // 6. MULTI-ROUND TOTALS, TIES & RANK()
  // ==========================================
  describe('Computed Leaderboards & RANK() Semantics', () => {
    it('multi-round totals, ties (1,2,2,4), stable ordering, no unconfirmed registration', async () => {
      const confirmedRegs = [
        { registration_id: 'reg-alpha', participant_id: 'u-1', team_id: 't-1', team_name: 'Alpha Team', participant_name: 'P1' },
        { registration_id: 'reg-beta', participant_id: 'u-2', team_id: 't-2', team_name: 'Beta Team', participant_name: 'P2' },
        { registration_id: 'reg-gamma', participant_id: 'u-3', team_id: 't-3', team_name: 'Gamma Team', participant_name: 'P3' },
        { registration_id: 'reg-delta', participant_id: 'u-4', team_id: 't-4', team_name: 'Delta Team', participant_name: 'P4' },
      ]

      // Scores:
      // Alpha: 30 + 40 + 30 = 100
      // Beta: 30 + 30 + 30 = 90
      // Gamma: 40 + 25 + 25 = 90 (TIE with Beta!)
      // Delta: 20 + 20 + 20 = 60
      const scores = [
        { registration_id: 'reg-alpha', round_no: 1, score: 30 },
        { registration_id: 'reg-alpha', round_no: 2, score: 40 },
        { registration_id: 'reg-alpha', round_no: 3, score: 30 },
        { registration_id: 'reg-beta', round_no: 1, score: 30 },
        { registration_id: 'reg-beta', round_no: 2, score: 30 },
        { registration_id: 'reg-beta', round_no: 3, score: 30 },
        { registration_id: 'reg-gamma', round_no: 1, score: 40 },
        { registration_id: 'reg-gamma', round_no: 2, score: 25 },
        { registration_id: 'reg-gamma', round_no: 3, score: 25 },
        { registration_id: 'reg-delta', round_no: 1, score: 20 },
        { registration_id: 'reg-delta', round_no: 2, score: 20 },
        { registration_id: 'reg-delta', round_no: 3, score: 20 },
        // Score for unconfirmed registration (must be omitted because reg is not in confirmedRegs)
        { registration_id: 'reg-unconfirmed', round_no: 1, score: 200 },
      ]

      const db = createMockD1({
        firstHandler: (sql) => {
          if (sql.includes('FROM events WHERE id = ?')) return esportsEvent
          return null
        },
        allHandler: (sql) => {
          if (sql.includes('FROM registrations r')) return { results: confirmedRegs }
          if (sql.includes('FROM esports_scores')) return { results: scores }
          return { results: [] }
        },
      })

      const board = await getLeaderboard(db, esportsEvent.id)
      const entries = board.leaderboard

      expect(entries.length).toBe(4)

      // 1. Alpha: Rank 1, Score 100
      expect(entries[0]).toMatchObject({
        rank: 1,
        registration_id: 'reg-alpha',
        display_name: 'Alpha Team',
        total_score: 100,
        round_scores: { 1: 30, 2: 40, 3: 30 },
      })

      // 2. Beta: Rank 2, Score 90
      expect(entries[1]).toMatchObject({
        rank: 2,
        registration_id: 'reg-beta',
        display_name: 'Beta Team',
        total_score: 90,
      })

      // 3. Gamma: Rank 2 (TIED with Beta!), Score 90
      expect(entries[2]).toMatchObject({
        rank: 2,
        registration_id: 'reg-gamma',
        display_name: 'Gamma Team',
        total_score: 90,
      })

      // 4. Delta: Rank 4 (Jumps to 4!), Score 60
      expect(entries[3]).toMatchObject({
        rank: 4,
        registration_id: 'reg-delta',
        display_name: 'Delta Team',
        total_score: 60,
      })

      // Unconfirmed registration (reg-unconfirmed) is completely excluded
      expect(entries.find((e) => e.registration_id === 'reg-unconfirmed')).toBeUndefined()
    })
  })

  // ==========================================
  // 7. PUBLIC PRIVACY & CACHING
  // ==========================================
  describe('Public Privacy & Access Control', () => {
    it('non-public board 404s publicly and is visible only to authorized staff', async () => {
      const privateEvent: Event = {
        ...esportsEvent,
        leaderboard_public: 0,
      }

      const db = createMockD1({
        firstHandler: (sql, args) => {
          if (sql.includes('FROM events WHERE id = ?')) return privateEvent
          if (sql.includes('FROM event_staff')) {
            const [targetEventId, staffUserId] = args
            return targetEventId === privateEvent.id && staffUserId === eventLead.id ? { 1: 1 } : null
          }
          return null
        },
        allHandler: () => ({ results: [] }),
      })

      // 1. Anonymous viewer -> 404
      await expect(getLeaderboard(db, privateEvent.id, null)).rejects.toMatchObject({
        name: 'AppError',
        status: 404,
        code: 'NOT_FOUND',
      })

      // 2. Regular participant -> 404
      await expect(getLeaderboard(db, privateEvent.id, unassignedUser)).rejects.toMatchObject({
        name: 'AppError',
        status: 404,
        code: 'NOT_FOUND',
      })

      // 3. Assigned staff (eventLead) -> succeeds
      const staffBoard = await getLeaderboard(db, privateEvent.id, eventLead)
      expect(staffBoard.event.id).toBe(privateEvent.id)
    })

    it('listPublicLeaderboards queries only public, scoring-enabled E_SPORTS events', async () => {
      const db = createMockD1({
        allHandler: (sql) => {
          expect(sql).toContain("category = 'E_SPORTS'")
          expect(sql).toContain('scoring_enabled = 1')
          expect(sql).toContain('leaderboard_public = 1')
          return {
            results: [
              {
                id: esportsEvent.id,
                slug: esportsEvent.slug,
                title: esportsEvent.title,
                category: 'E_SPORTS',
                max_rounds: 3,
                scoring_status: 'OPEN',
              },
            ],
          }
        },
      })

      const list = await listPublicLeaderboards(db)
      expect(list.length).toBe(1)
      expect(list[0].id).toBe(esportsEvent.id)
    })
  })
})

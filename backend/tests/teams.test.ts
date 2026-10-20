import { describe, it, expect, vi } from 'vitest'
import {
  createTeam,
  inviteTeamMember,
  acceptTeamInvite,
  removeTeamMember,
  cancelTeam,
  validateTeamForPurchase,
  getTeamWithMembers,
} from '../src/services/team.service'
import { AppError } from '../src/common/errors'
import type { Team, Event, User } from '../src/types'

describe('Team Creation & Invariants', () => {
  const leader: User = {
    id: 'user-leader-1',
    google_sub: 'sub-leader',
    email: 'leader@example.com',
    name: 'Team Leader',
    avatar_url: null,
    phone: '9876543210',
    is_student: 1,
    institution_name: 'Tech University',
    institution_id: 'TU-001',
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const teamEvent: Event = {
    id: 'event-team-hackathon',
    slug: 'hackathon-2026',
    title: 'Hackathon 2026',
    category: 'TECHNICAL',
    description: 'Hackathon',
    venue: 'Lab 1',
    day_of_event: 1,
    starts_at: 1000,
    ends_at: 2000,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 1,
    min_team_size: 2,
    max_team_size: 4,
    price_model: 'PER_TEAM',
    price_paise: 50000,
    student_price_paise: 40000,
    capacity: 20,
    seats_taken: 2,
    capacity_unit: 'TEAMS',
    scoring_enabled: 0,
    scoring_status: 'NOT_APPLICABLE',
    max_rounds: 1,
    volunteers_can_score: 0,
    leaderboard_public: 0,
    created_at: 1000,
    updated_at: 1000,
  }

  const soloEvent: Event = {
    ...teamEvent,
    id: 'event-solo-coding',
    is_team_event: 0, // Solo event!
  }

  it('rejects team creation for solo event', async () => {
    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => soloEvent),
        })),
      })),
    } as unknown as D1Database

    await expect(
      createTeam(mockDb, { event_id: soloEvent.id, name: 'Code Crushers' }, leader)
    ).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Cannot create a team for an individual/solo event',
    })
  })

  it('rejects duplicate leader for the same event with ALREADY_LEADER (409)', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM events')) return teamEvent
            if (sql.includes('leader_id = ?')) return { exists: 1 } // Already leading a team!
            return null
          }),
        })),
      })),
    } as unknown as D1Database

    await expect(
      createTeam(mockDb, { event_id: teamEvent.id, name: 'New Team Name' }, leader)
    ).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_LEADER',
    })
  })

  it('rejects duplicate team name for the same event with TEAM_NAME_TAKEN (409)', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM events')) return teamEvent
            if (sql.includes('lower(name) = lower(?)')) return { exists: 1 } // Duplicate name!
            return null
          }),
        })),
      })),
    } as unknown as D1Database

    await expect(
      createTeam(mockDb, { event_id: teamEvent.id, name: 'Alpha Squad' }, leader)
    ).rejects.toMatchObject({
      status: 409,
      code: 'TEAM_NAME_TAKEN',
    })
  })

  it('successfully creates team and adds creator as ACCEPTED LEADER member', async () => {
    const batchStatements: any[] = []
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM events')) return teamEvent
            return null
          }),
          sql,
          args,
        })),
      })),
      batch: vi.fn(async (stmts: any[]) => {
        batchStatements.push(...stmts)
        return []
      }),
    } as unknown as D1Database

    const team = await createTeam(mockDb, { event_id: teamEvent.id, name: 'Victory Force' }, leader)

    expect(team.name).toBe('Victory Force')
    expect(team.status).toBe('DRAFT')
    expect(team.members).toHaveLength(1)
    expect(team.members[0].role).toBe('LEADER')
    expect(team.members[0].status).toBe('ACCEPTED')
    expect(team.members[0].user_id).toBe(leader.id)

    expect(batchStatements).toHaveLength(3) // team insert + member insert + audit
  })
})

describe('Team Invitations & Acceptance Lifecycle', () => {
  const leader: User = {
    id: 'leader-1',
    google_sub: 'sub-l',
    email: 'leader@example.com',
    name: 'Leader',
    avatar_url: null,
    phone: '9876543210',
    is_student: 1,
    institution_name: 'Tech Univ',
    institution_id: 'TU-1',
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const memberUser: User = {
    id: 'user-member-2',
    google_sub: 'sub-m',
    email: 'invitee@example.com',
    name: 'Invitee',
    avatar_url: null,
    phone: '9876543211',
    is_student: 1,
    institution_name: 'Tech Univ',
    institution_id: 'TU-2',
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const draftTeam: Team = {
    id: 'team-1',
    event_id: 'event-1',
    name: 'Robo Warriors',
    leader_id: leader.id,
    status: 'DRAFT',
    created_at: 1000,
    updated_at: 1000,
  }

  const event: Event = {
    id: 'event-1',
    slug: 'hack',
    title: 'Hack',
    category: 'TECHNICAL',
    description: null,
    venue: null,
    day_of_event: 1,
    starts_at: 1000,
    ends_at: 2000,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 1,
    min_team_size: 2,
    max_team_size: 3, // capacity is 3 members
    price_model: 'FREE',
    price_paise: 0,
    student_price_paise: null,
    capacity: 10,
    seats_taken: 1,
    capacity_unit: 'TEAMS',
    scoring_enabled: 0,
    scoring_status: 'NOT_APPLICABLE',
    max_rounds: 1,
    volunteers_can_score: 0,
    leaderboard_public: 0,
    created_at: 1000,
    updated_at: 1000,
  }

  it('rejects invitation when team capacity limit (INVITED + ACCEPTED) is reached', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM teams')) return draftTeam
            if (sql.includes('SELECT * FROM events')) return event
            if (sql.includes('SELECT count(*) as total FROM team_members')) return { total: 3 } // already 3 (max_team_size)
            return null
          }),
        })),
      })),
    } as unknown as D1Database

    await expect(
      inviteTeamMember(mockDb, draftTeam.id, 'fourth@example.com', leader)
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('Team capacity limit'),
    })
  })

  it('allows leader to invite new email and links user_id if registered', async () => {
    const batchStatements: any[] = []
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM teams')) return draftTeam
            if (sql.includes('SELECT * FROM events')) return event
            if (sql.includes('count(*) as total')) return { total: 1 } // only leader so far
            if (sql.includes('SELECT id FROM users WHERE email = ?')) return { id: memberUser.id }
            return null
          }),
          sql,
          args,
        })),
      })),
      batch: vi.fn(async (stmts: any[]) => {
        batchStatements.push(...stmts)
        return []
      }),
    } as unknown as D1Database

    const invited = await inviteTeamMember(mockDb, draftTeam.id, memberUser.email, leader)

    expect(invited.invited_email).toBe('invitee@example.com')
    expect(invited.user_id).toBe(memberUser.id)
    expect(invited.status).toBe('INVITED')
  })

  it('rejects accept from an unrelated participant with 404 NOT_FOUND (existence hiding)', async () => {
    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => ({
            id: 'mem-1',
            team_id: 'team-1',
            user_id: 'user-member-2',
            invited_email: 'invitee@example.com',
            status: 'INVITED',
          })),
        })),
      })),
    } as unknown as D1Database

    const stranger: User = {
      ...leader,
      id: 'stranger-id',
      email: 'stranger@example.com',
    }

    await expect(acceptTeamInvite(mockDb, 'mem-1', stranger)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('allows invitee to accept invitation atomically', async () => {
    const batchStatements: any[] = []
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM team_members')) {
              return {
                id: 'mem-1',
                team_id: draftTeam.id,
                user_id: memberUser.id,
                invited_email: memberUser.email,
                status: 'INVITED',
              }
            }
            if (sql.includes('SELECT * FROM teams')) return draftTeam
            if (sql.includes('SELECT * FROM events')) return event
            return null
          }),
          sql,
          args,
        })),
      })),
      batch: vi.fn(async (stmts: any[]) => {
        batchStatements.push(...stmts)
        return []
      }),
    } as unknown as D1Database

    const accepted = await acceptTeamInvite(mockDb, 'mem-1', memberUser)
    expect(accepted.status).toBe('ACCEPTED')
    expect(batchStatements.some((s) => s.sql.includes('_guard'))).toBe(true) // Includes capacity & one-team guards
  })

  it('blocks team purchase when pending invitations exist', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM teams')) return draftTeam
            if (sql.includes('SELECT * FROM events')) return event
            if (sql.includes('status = \'INVITED\'')) return { count: 1 } // Pending invite!
            return null
          }),
        })),
      })),
    } as unknown as D1Database

    await expect(
      validateTeamForPurchase(mockDb, draftTeam.id, leader.id)
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('pending invitations'),
    })
  })

  it('rejects member removal from LOCKED or CONFIRMED teams', async () => {
    const lockedTeam: Team = {
      ...draftTeam,
      status: 'LOCKED', // locked during purchase!
    }

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => lockedTeam),
        })),
      })),
    } as unknown as D1Database

    await expect(
      removeTeamMember(mockDb, lockedTeam.id, 'mem-1', leader)
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('locked'),
    })
  })

  it('rejects leader removal; requires team cancellation instead', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM teams')) return draftTeam
            if (sql.includes('SELECT * FROM team_members')) {
              return { id: 'leader-mem', team_id: draftTeam.id, role: 'LEADER' }
            }
            return null
          }),
        })),
      })),
    } as unknown as D1Database

    await expect(
      removeTeamMember(mockDb, draftTeam.id, 'leader-mem', leader)
    ).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: expect.stringContaining('The team leader cannot be removed'),
    })
  })
})

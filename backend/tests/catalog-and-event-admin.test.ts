import { describe, it, expect, vi } from 'vitest'
import {
  formatPublicEvent,
  createEvent,
  updateEvent,
} from '../src/services/event.service'
import { updateFestDay } from '../src/services/settings.service'
import { AppError } from '../src/common/errors'
import type { Event, User } from '../src/types'

describe('Public Event Formatting & Informational Status', () => {
  const baseEvent: Event = {
    id: 'evt-1',
    slug: 'robotics-clash',
    title: 'Robotics Clash',
    category: 'TECHNICAL',
    description: 'Battle bots arena',
    venue: 'Dean Amphitheatre',
    day_of_event: 1,
    starts_at: 1793930000000,
    ends_at: 1793950000000,
    registration_closes_at: 1793925000000,
    status: 'OPEN',
    is_team_event: 1,
    min_team_size: 2,
    max_team_size: 4,
    price_model: 'PER_TEAM',
    price_paise: 50000,
    student_price_paise: 40000,
    capacity: 20,
    seats_taken: 5,
    capacity_unit: 'TEAMS',
    scoring_enabled: 0,
    scoring_status: 'NOT_APPLICABLE',
    max_rounds: 1,
    volunteers_can_score: 0,
    leaderboard_public: 0,
    created_at: 1000,
    updated_at: 1000,
  }

  it('calculates seats_remaining and registration_open when open and capacity available', () => {
    const formatted = formatPublicEvent(baseEvent, 1793920000000) // before registration_closes_at
    expect(formatted.seats_remaining).toBe(15)
    expect(formatted.registration_open).toBe(true)
  })

  it('reports registration_open = false when past registration_closes_at', () => {
    const formatted = formatPublicEvent(baseEvent, 1793926000000) // after registration_closes_at
    expect(formatted.registration_open).toBe(false)
  })

  it('reports registration_open = false when capacity is reached', () => {
    const fullEvent: Event = {
      ...baseEvent,
      seats_taken: 20,
    }
    const formatted = formatPublicEvent(fullEvent, 1793920000000)
    expect(formatted.seats_remaining).toBe(0)
    expect(formatted.registration_open).toBe(false)
  })

  it('reports registration_open = false for DRAFT or CLOSED events', () => {
    const closedEvent: Event = { ...baseEvent, status: 'CLOSED' }
    expect(formatPublicEvent(closedEvent, 1793920000000).registration_open).toBe(false)

    const draftEvent: Event = { ...baseEvent, status: 'DRAFT' }
    expect(formatPublicEvent(draftEvent, 1793920000000).registration_open).toBe(false)
  })

  it('handles unlimited capacity with seats_remaining = null', () => {
    const unlimitedEvent: Event = {
      ...baseEvent,
      capacity: null,
      seats_taken: 100,
    }
    const formatted = formatPublicEvent(unlimitedEvent, 1793920000000)
    expect(formatted.seats_remaining).toBeNull()
    expect(formatted.registration_open).toBe(true)
  })
})

describe('Event Administration & Role Guardrails', () => {
  const superAdmin: User = {
    id: 'admin-1',
    google_sub: 'sub-admin',
    email: 'admin@example.com',
    name: 'Admin',
    avatar_url: null,
    phone: '9876543210',
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
    id: 'lead-1',
    role: 'LEAD',
  }

  const volunteer: User = {
    ...superAdmin,
    id: 'vol-1',
    role: 'VOLUNTEER',
  }

  const testEvent: Event = {
    id: 'event-battle',
    slug: 'battle-of-bands',
    title: 'Battle of the Bands',
    category: 'CULTURAL',
    description: 'Music battle',
    venue: 'Main Ground',
    day_of_event: 2,
    starts_at: 1794010000000,
    ends_at: 1794030000000,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 1,
    min_team_size: 3,
    max_team_size: 8,
    price_model: 'PER_TEAM',
    price_paise: 100000,
    student_price_paise: 80000,
    capacity: 10,
    seats_taken: 4,
    capacity_unit: 'TEAMS',
    scoring_enabled: 0,
    scoring_status: 'NOT_APPLICABLE',
    max_rounds: 1,
    volunteers_can_score: 0,
    leaderboard_public: 0,
    created_at: 1000,
    updated_at: 1000,
  }

  it('rejects scoring and public leaderboards for non-E_SPORTS events', async () => {
    const mockDb = {
      prepare: vi.fn(),
      batch: vi.fn(),
    } as unknown as D1Database

    await expect(
      createEvent(
        mockDb,
        {
          slug: 'chess-masters',
          title: 'Chess Masters',
          category: 'TECHNICAL', // not E_SPORTS!
          day_of_event: 1,
          starts_at: 1000,
          ends_at: 2000,
          scoring_enabled: true, // scoring attempted
        },
        superAdmin
      )
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_SCORING_CATEGORY',
    })
  })

  it('allows LEAD to edit only description and venue, rejecting other fields', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('event_staff')) return { role: 'LEAD' }
            return null
          }),
        })),
      })),
      batch: vi.fn().mockResolvedValue([]),
    } as unknown as D1Database

    // Lead editing description and venue -> Success
    const updated = await updateEvent(
      mockDb,
      testEvent,
      { description: 'Updated description', venue: 'New Hall' },
      eventLead
    )
    expect(updated.description).toBe('Updated description')
    expect(updated.venue).toBe('New Hall')

    // Lead attempting to edit price -> Rejected
    await expect(
      updateEvent(mockDb, testEvent, { price_paise: 200000 }, eventLead)
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })

    // Lead attempting to edit capacity -> Rejected
    await expect(
      updateEvent(mockDb, testEvent, { capacity: 25 }, eventLead)
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
  })

  it('rejects capacity decrease below seats_taken with CAPACITY_BELOW_TAKEN (409)', async () => {
    const mockDb = {
      prepare: vi.fn(),
      batch: vi.fn(),
    } as unknown as D1Database

    // testEvent has seats_taken = 4. Attempting to reduce capacity to 3
    await expect(
      updateEvent(mockDb, testEvent, { capacity: 3 }, superAdmin)
    ).rejects.toMatchObject({
      status: 409,
      code: 'CAPACITY_BELOW_TAKEN',
    })
  })

  it('freezes structural fields (is_team, team_size, price_model, capacity_unit) after registrations exist', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('registrations')) return { exists: 1 }
            return null
          }),
        })),
      })),
    } as unknown as D1Database

    await expect(
      updateEvent(mockDb, testEvent, { min_team_size: 5 }, superAdmin)
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('structural configuration'),
    })

    await expect(
      updateEvent(mockDb, testEvent, { price_model: 'FREE' }, superAdmin)
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
    })
  })

  it('atomically updates active ticket validity windows when event day_of_event changes', async () => {
    const batchStatements: any[] = []

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => {
          const stmt = { sql, args }
          return {
            first: vi.fn(async () => {
              if (sql.includes('fest_days')) {
                return { starts_at: 1794096000000, ends_at: 1794182399999 } // Day 3 times
              }
              return null
            }),
            run: vi.fn(async () => ({})),
            sql,
            args,
          }
        }),
      })),
      batch: vi.fn(async (stmts: any[]) => {
        batchStatements.push(...stmts)
        return []
      }),
    } as unknown as D1Database

    // Changing day_of_event from 2 to 3
    await updateEvent(mockDb, testEvent, { day_of_event: 3 }, superAdmin)

    // Ensure tickets update statement and audit statement are present in the batch
    const ticketUpdate = batchStatements.find((s) => s.sql.includes('UPDATE tickets SET'))
    expect(ticketUpdate).toBeDefined()
    expect(ticketUpdate.sql).toContain("WHERE event_id = ? AND status = 'ACTIVE'")

    const auditInsert = batchStatements.find((s) => s.sql.includes('INSERT INTO audit_logs'))
    expect(auditInsert).toBeDefined()
    expect(auditInsert.args).toContain('EVENT_UPDATED_WITH_DAY_CHANGE')
  })

  it('supports newly added categories (INTERACTIVE, RECREATIONAL, SHOWCASE) and metadata', async () => {
    let capturedEventInsert: any = null
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => {
          if (sql.includes('INSERT INTO events')) {
            capturedEventInsert = { sql, args }
          }
          return { sql, args }
        }),
      })),
      batch: vi.fn(async () => []),
    } as unknown as D1Database

    const metadataStr = JSON.stringify({ organizer: 'TU-CODES', rules: ['Rule 1'] })
    const created = await createEvent(
      mockDb,
      {
        slug: 'techxibition-school',
        title: 'TechXibition',
        category: 'INTERACTIVE',
        day_of_event: 1,
        starts_at: 1000,
        ends_at: 2000,
        metadata: metadataStr,
      },
      superAdmin
    )

    expect(created.category).toBe('INTERACTIVE')
    expect(created.metadata).toBe(metadataStr)
    expect(capturedEventInsert).toBeDefined()
    expect(capturedEventInsert.sql).toContain('metadata')

    const formatted = formatPublicEvent(created)
    expect(formatted.category).toBe('INTERACTIVE')
    expect(formatted.metadata).toBe(metadataStr)
  })
})

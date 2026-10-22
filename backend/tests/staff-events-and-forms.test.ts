import { describe, it, expect, vi } from 'vitest'
import {
  getMyStaffEvents,
  getStaffEventDashboard,
  getStaffEventRegistrations,
  getStaffEventPayments,
  reviewStaffEventPayment,
} from '../src/services/staff-event.service'
import { deleteEventByAdmin } from '../src/services/event.service'
import { AppError } from '../src/common/errors'
import type { User, Event } from '../src/types'

describe('Staff Events and Committee Portal Services', () => {
  const superAdmin: User = {
    id: 'admin-1',
    google_sub: 'sub-admin',
    email: 'admin@techxetra.in',
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
    email: 'lead@techxetra.in',
    name: 'Event Lead',
    role: 'LEAD',
    can_review_payments: 0,
  }

  const volunteer: User = {
    ...superAdmin,
    id: 'vol-1',
    email: 'vol@techxetra.in',
    name: 'Volunteer',
    role: 'VOLUNTEER',
    can_review_payments: 0,
  }

  const sampleEvent: Event = {
    id: 'evt-101',
    slug: 'hackxetra',
    title: 'HackXetra Hackathon',
    category: 'TECHNICAL',
    description: 'Hackathon event',
    venue: 'Dean Amphitheatre',
    day_of_event: 1,
    starts_at: 1793923200000,
    ends_at: 1794009599999,
    registration_closes_at: null,
    status: 'OPEN',
    is_team_event: 1,
    min_team_size: 2,
    max_team_size: 5,
    price_model: 'PER_PARTICIPANT',
    price_paise: 10000,
    student_price_paise: null,
    capacity: 100,
    seats_taken: 10,
    capacity_unit: 'SEATS',
    scoring_enabled: 0,
    scoring_status: 'NOT_APPLICABLE',
    max_rounds: 1,
    volunteers_can_score: 0,
    leaderboard_public: 0,
    metadata: null,
    form_schema: JSON.stringify([
      { id: 'github_url', label: 'GitHub URL', type: 'text', required: true },
    ]),
    created_at: 1000,
    updated_at: 1000,
  }

  it('getMyStaffEvents returns assigned events for LEAD with computed metrics', async () => {
    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(async () => ({
            results: [
              {
                ...sampleEvent,
                staff_role: 'LEAD',
                confirmed_count: 8,
                reserved_count: 2,
                pending_payments_count: 1,
              },
            ],
          })),
        })),
      })),
    } as unknown as D1Database

    const events = await getMyStaffEvents(mockDb, eventLead)
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe('evt-101')
    expect(events[0].role).toBe('LEAD')
    expect(events[0].confirmed_registrations_count).toBe(8)
    expect(events[0].seats_remaining).toBe(90)
  })

  it('getStaffEventDashboard returns metrics and staff roster', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM events')) return sampleEvent
            if (sql.includes('SELECT count(*) FROM registrations')) {
              return {
                confirmed_count: 5,
                reserved_count: 1,
                checked_in_count: 3,
                pending_payments_count: 1,
              }
            }
            return null
          }),
          all: vi.fn(async () => {
            if (sql.includes('FROM event_staff')) {
              return {
                results: [{ role: 'LEAD', user_id: 'lead-1', name: 'Lead User' }],
              }
            }
            return { results: [] }
          }),
        })),
      })),
    } as unknown as D1Database

    const dashboard = await getStaffEventDashboard(mockDb, 'evt-101')
    expect(dashboard.event.id).toBe('evt-101')
    expect(dashboard.metrics.confirmed_registrations).toBe(5)
    expect(dashboard.metrics.checked_in_count).toBe(3)
    expect(dashboard.staff).toHaveLength(1)
  })

  it('getStaffEventRegistrations parses form_responses JSON cleanly', async () => {
    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn(async () => ({
            results: [
              {
                registration_id: 'reg-1',
                registration_status: 'CONFIRMED',
                seat_count: 1,
                form_responses: '{"github_url":"https://github.com/coder"}',
                registered_at: 2000,
                participant_id: 'u-1',
                participant_name: 'Coder',
                participant_email: 'coder@test.com',
                participant_phone: '9999999999',
                institution_name: 'TU',
                institution_id: 'TU01',
                team_id: null,
                team_name: null,
                ticket_id: 't-1',
                ticket_status: 'ACTIVE',
                event_checked_in_at: 2500,
              },
            ],
          })),
        })),
      })),
    } as unknown as D1Database

    const roster = await getStaffEventRegistrations(mockDb, 'evt-101')
    expect(roster).toHaveLength(1)
    expect(roster[0].participant.name).toBe('Coder')
    expect(roster[0].form_responses).toEqual({ github_url: 'https://github.com/coder' })
    expect(roster[0].ticket.checked_in).toBe(true)
  })

  it('deleteEventByAdmin deletes event with 0 registrations', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM events')) return sampleEvent
            if (sql.includes('FROM registrations')) return { count: 0 }
            if (sql.includes('FROM tickets')) return { count: 0 }
            return null
          }),
        })),
      })),
      batch: vi.fn().mockResolvedValue([]),
    } as unknown as D1Database

    const result = await deleteEventByAdmin(mockDb, 'evt-101', superAdmin)
    expect(result.deleted).toBe(true)
    expect(result.status).toBe('DELETED')
  })

  it('deleteEventByAdmin transitions to CANCELLED if registrations exist', async () => {
    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM events')) return sampleEvent
            if (sql.includes('FROM registrations')) return { count: 5 } // active registrations!
            if (sql.includes('FROM tickets')) return { count: 5 }
            return null
          }),
        })),
      })),
      batch: vi.fn().mockResolvedValue([]),
    } as unknown as D1Database

    const result = await deleteEventByAdmin(mockDb, 'evt-101', superAdmin)
    expect(result.deleted).toBe(false)
    expect(result.status).toBe('CANCELLED')
  })
})

import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireSuperAdminOnly } from '../middleware/auth'
import {
  createEvent,
  updateEvent,
  deleteEventByAdmin,
  getEventByIdOrSlug,
  formatPublicEvent,
} from '../services/event.service'
import { reopenScores } from '../services/esports.service'
import { executeBatch } from '../db/batch'
import { createAuditStatement } from '../services/audit.service'
import { jsonSuccess } from '../common/response'
import { AppError } from '../common/errors'
import type { Event } from '../types'

export const adminEventRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminEventRoutes.use('*', requireAuth(), requireSuperAdminOnly())

// GET /api/admin/events - List all events for SuperAdmin
adminEventRoutes.get('/', async (c) => {
  const now = c.get('now') || Date.now()
  const rows = await c.env.DB.prepare(
    'SELECT * FROM events ORDER BY day_of_event ASC, starts_at ASC, id ASC'
  ).all<Event>()

  const items = rows.results || []
  return jsonSuccess(c, {
    events: items.map((e) => formatPublicEvent(e, now)),
    next_cursor: null,
  })
})

const EventCategoryEnum = z.enum([
  'CULTURAL',
  'TECHNICAL',
  'E_SPORTS',
  'SPORTS',
  'MANAGEMENT',
  'LITERARY',
  'WORKSHOP',
  'INTERACTIVE',
  'RECREATIONAL',
  'SHOWCASE',
  'OTHER',
])

const CreateEventSchema = z
  .object({
    slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    title: z.string().min(3).max(100),
    category: EventCategoryEnum,
    description: z.string().max(2000).nullable().optional(),
    venue: z.string().max(200).nullable().optional(),
    day_of_event: z.number().int().min(1).max(3),
    starts_at: z.number().int(),
    ends_at: z.number().int(),
    registration_closes_at: z.number().int().nullable().optional(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED']).optional(),
    is_team_event: z.boolean().optional(),
    min_team_size: z.number().int().min(1).max(50).optional(),
    max_team_size: z.number().int().min(1).max(50).optional(),
    price_model: z.enum(['FREE', 'PER_PARTICIPANT', 'PER_TEAM']).optional(),
    price_paise: z.number().int().min(0).optional(),
    student_price_paise: z.number().int().min(0).nullable().optional(),
    capacity: z.number().int().min(1).nullable().optional(),
    capacity_unit: z.enum(['SEATS', 'TEAMS']).optional(),
    scoring_enabled: z.boolean().optional(),
    scoring_status: z.enum(['NOT_APPLICABLE', 'OPEN', 'FINALIZED']).optional(),
    max_rounds: z.number().int().min(1).max(20).optional(),
    volunteers_can_score: z.boolean().optional(),
    leaderboard_public: z.boolean().optional(),
    metadata: z.string().nullable().optional(),
    form_schema: z.string().nullable().optional(),
  })
  .strict()

adminEventRoutes.post('/', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const validated = CreateEventSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const created = await createEvent(c.env.DB, validated, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, formatPublicEvent(created, now), 201)
})

const UpdateEventSchema = z
  .object({
    title: z.string().min(3).max(100).optional(),
    category: EventCategoryEnum.optional(),
    description: z.string().max(2000).nullable().optional(),
    venue: z.string().max(200).nullable().optional(),
    day_of_event: z.number().int().min(1).max(3).optional(),
    starts_at: z.number().int().optional(),
    ends_at: z.number().int().optional(),
    registration_closes_at: z.number().int().nullable().optional(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED']).optional(),
    is_team_event: z.boolean().optional(),
    min_team_size: z.number().int().min(1).max(50).optional(),
    max_team_size: z.number().int().min(1).max(50).optional(),
    price_model: z.enum(['FREE', 'PER_PARTICIPANT', 'PER_TEAM']).optional(),
    price_paise: z.number().int().min(0).optional(),
    student_price_paise: z.number().int().min(0).nullable().optional(),
    capacity: z.number().int().min(1).nullable().optional(),
    capacity_unit: z.enum(['SEATS', 'TEAMS']).optional(),
    scoring_enabled: z.boolean().optional(),
    scoring_status: z.enum(['NOT_APPLICABLE', 'OPEN', 'FINALIZED']).optional(),
    max_rounds: z.number().int().min(1).max(20).optional(),
    volunteers_can_score: z.boolean().optional(),
    leaderboard_public: z.boolean().optional(),
    metadata: z.string().nullable().optional(),
    form_schema: z.string().nullable().optional(),
  })
  .strict()

// PATCH /api/admin/events/:id - SuperAdmin full event update
adminEventRoutes.patch('/:id', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const event = await getEventByIdOrSlug(c.env.DB, eventId)

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  const body = await c.req.json().catch(() => ({}))
  const validated = UpdateEventSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await updateEvent(c.env.DB, event, validated, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, formatPublicEvent(updated, now))
})

// DELETE /api/admin/events/:id - SuperAdmin safe event deletion or cancellation
adminEventRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await deleteEventByAdmin(c.env.DB, eventId, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, result)
})

const StaffAssignmentSchema = z
  .object({
    user_id: z.string().min(1),
    role: z.enum(['LEAD', 'VOLUNTEER']),
  })
  .strict()

adminEventRoutes.post('/:id/staff', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const event = await getEventByIdOrSlug(c.env.DB, eventId)
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  const body = await c.req.json().catch(() => ({}))
  const parsed = StaffAssignmentSchema.parse(body)
  const now = c.get('now') || Date.now()

  const insertStmt = c.env.DB.prepare(
    `INSERT INTO event_staff (event_id, user_id, role, assigned_at, assigned_by)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(event_id, user_id) DO UPDATE SET
       role = excluded.role,
       assigned_at = excluded.assigned_at,
       assigned_by = excluded.assigned_by`
  ).bind(eventId, parsed.user_id, parsed.role, now, user.id)

  const auditStmt = createAuditStatement(c.env.DB, {
    actorId: user.id,
    action: 'EVENT_STAFF_ASSIGNED',
    targetType: 'EVENT_STAFF',
    targetId: `${eventId}:${parsed.user_id}`,
    afterJson: { event_id: eventId, user_id: parsed.user_id, role: parsed.role },
    now,
  })

  await executeBatch(c.env.DB, [insertStmt, auditStmt])

  return jsonSuccess(c, { assigned: true, event_id: eventId, user_id: parsed.user_id, role: parsed.role }, 201)
})

adminEventRoutes.delete('/:id/staff/:userId', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const targetUserId = c.req.param('userId')
  const now = c.get('now') || Date.now()

  const deleteStmt = c.env.DB.prepare(
    'DELETE FROM event_staff WHERE event_id = ? AND user_id = ?'
  ).bind(eventId, targetUserId)

  const auditStmt = createAuditStatement(c.env.DB, {
    actorId: user.id,
    action: 'EVENT_STAFF_REMOVED',
    targetType: 'EVENT_STAFF',
    targetId: `${eventId}:${targetUserId}`,
    now,
  })

  await executeBatch(c.env.DB, [deleteStmt, auditStmt])

  return jsonSuccess(c, { removed: true })
})

adminEventRoutes.get('/:id/staff', async (c) => {
  const eventId = c.req.param('id')
  const rows = await c.env.DB.prepare(
    `SELECT es.role, es.assigned_at, u.id as user_id, u.name, u.email
     FROM event_staff es
     JOIN users u ON es.user_id = u.id
     WHERE es.event_id = ?`
  )
    .bind(eventId)
    .all()

  return jsonSuccess(c, rows.results || [])
})

const ReopenScoresSchema = z
  .object({
    reason: z.string().min(2).max(500),
  })
  .strict()

adminEventRoutes.post('/:id/scores/reopen', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = ReopenScoresSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await reopenScores(c.env.DB, eventId, user, validated.reason, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, formatPublicEvent(updated, now))
})


import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { optionalAuth, requireAuth } from '../middleware/auth'
import {
  getPublicEvents,
  getEventByIdOrSlug,
  formatPublicEvent,
  updateEvent,
} from '../services/event.service'
import { getLeaderboard } from '../services/esports.service'
import { isEventStaff, isSuperAdmin } from '../services/authz.service'
import { jsonSuccess } from '../common/response'
import { AppError } from '../common/errors'

export const eventRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

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

const EventFilterQuerySchema = z
  .object({
    category: EventCategoryEnum.optional(),
    day: z.coerce.number().int().min(1).max(3).optional(),
    is_team: z
      .string()
      .optional()
      .transform((val) => (val === undefined ? undefined : val === 'true' || val === '1')),
    search: z.string().max(100).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict()

eventRoutes.get('/', optionalAuth(), async (c) => {
  const query = c.req.query()
  const validated = EventFilterQuerySchema.parse(query)

  const now = c.get('now') || Date.now()
  const result = await getPublicEvents(c.env.DB, validated, now)

  return jsonSuccess(c, result)
})

/**
 * GET /api/events/:id/leaderboard
 * Public view of event leaderboard with 10s caching.
 * Authorized staff can view non-public boards.
 */
eventRoutes.get('/:id/leaderboard', optionalAuth(), async (c) => {
  const eventId = c.req.param('id')
  const user = c.get('user') || null
  const result = await getLeaderboard(c.env.DB, eventId, user)

  if (result.event.leaderboard_public) {
    c.header('Cache-Control', 'public, max-age=10')
  }

  return jsonSuccess(c, result)
})

eventRoutes.get('/:idOrSlug', optionalAuth(), async (c) => {
  const idOrSlug = c.req.param('idOrSlug')
  const event = await getEventByIdOrSlug(c.env.DB, idOrSlug)

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  // If in DRAFT, only SUPER_ADMIN or assigned event staff can view it
  if (event.status === 'DRAFT') {
    const user = c.get('user')
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found')
    }
    const isLeadOrVol = await isEventStaff(c.env.DB, event.id, user.id)
    if (!isSuperAdmin(user) && !isLeadOrVol) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found')
    }
  }

  const now = c.get('now') || Date.now()
  return jsonSuccess(c, formatPublicEvent(event, now))
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

// PATCH /api/events/:id - Authorized Lead (description/venue only) or SuperAdmin
eventRoutes.patch('/:id', requireAuth(), async (c) => {
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

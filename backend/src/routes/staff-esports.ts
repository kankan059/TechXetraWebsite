import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth } from '../middleware/auth'
import {
  getStaffScoresView,
  upsertScore,
  deleteScore,
  finalizeScores,
} from '../services/esports.service'
import { jsonSuccess } from '../common/response'

export const staffEsportsRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

staffEsportsRoutes.use('*', requireAuth())

const UpsertScoreSchema = z
  .object({
    registration_id: z.string().min(1),
    round_no: z.number().int().min(1),
    score: z.number().min(-1000000).max(1000000),
    expected_version: z.number().int().min(1).optional(),
    reason: z.string().max(500).optional(),
  })
  .strict()

const DeleteScoreSchema = z
  .object({
    reason: z.string().min(2).max(500),
  })
  .strict()

/**
 * GET /api/staff/events/:id/scores
 * Staff view of all scores and history for an event.
 */
staffEsportsRoutes.get('/:id/scores', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const result = await getStaffScoresView(c.env.DB, eventId, user)
  return jsonSuccess(c, result)
})

/**
 * PUT /api/staff/events/:eventId/scores
 * Create or update a score for an event round.
 */
staffEsportsRoutes.put('/:eventId/scores', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('eventId')
  const body = await c.req.json().catch(() => ({}))
  const validated = UpsertScoreSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const score = await upsertScore(c.env.DB, eventId, user, validated, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, score)
})

/**
 * POST /api/staff/events/:eventId/scores
 * Convenience alias for score entry.
 */
staffEsportsRoutes.post('/:eventId/scores', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('eventId')
  const body = await c.req.json().catch(() => ({}))
  const validated = UpsertScoreSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const score = await upsertScore(c.env.DB, eventId, user, validated, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, score)
})

/**
 * DELETE /api/staff/events/:id/scores/:entryId
 * Delete a score entry with reason. Requires LEAD or SUPER_ADMIN.
 */
staffEsportsRoutes.delete('/:id/scores/:entryId', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const entryId = c.req.param('entryId')

  const body = await c.req.json().catch(() => ({}))
  const queryReason = c.req.query('reason')
  const reason = body?.reason || queryReason || ''

  const validated = DeleteScoreSchema.parse({ reason })

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await deleteScore(c.env.DB, eventId, entryId, user, validated.reason, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, result)
})

/**
 * POST /api/staff/events/:id/scores/finalize
 * Finalize event scoring (transition from OPEN -> FINALIZED).
 */
staffEsportsRoutes.post('/:id/scores/finalize', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const event = await finalizeScores(c.env.DB, eventId, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, event)
})

import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { listPublicLeaderboards } from '../services/esports.service'
import { jsonSuccess } from '../common/response'

export const leaderboardRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

/**
 * GET /api/leaderboards
 * Lists all events with public leaderboards.
 * Caches responses for max 10 seconds.
 */
leaderboardRoutes.get('/', async (c) => {
  const boards = await listPublicLeaderboards(c.env.DB)
  c.header('Cache-Control', 'public, max-age=10')
  return jsonSuccess(c, boards)
})

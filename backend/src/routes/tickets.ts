import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth } from '../middleware/auth'
import { getUserTickets, getEnrichedTicketForOwner } from '../services/ticket.service'
import { jsonSuccess } from '../common/response'

export const ticketRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

ticketRoutes.use('*', requireAuth())

/**
 * GET /api/tickets/me
 * Returns all active/valid tickets owned by the current beneficiary,
 * along with preparing_tickets for paid purchases awaiting ticket generation.
 */
ticketRoutes.get('/me', async (c) => {
  const user = c.get('user')!
  const now = c.get('now') || Date.now()
  const result = await getUserTickets(c.env.DB, user, c.env, now)
  return jsonSuccess(c, result)
})

/**
 * GET /api/tickets/:id
 * Owner-only view of a single ticket including derived validity,
 * event summary, physical-ID reminder for student tier, and signed QR token.
 */
ticketRoutes.get('/:id', async (c) => {
  const user = c.get('user')!
  const ticketId = c.req.param('id')
  const now = c.get('now') || Date.now()
  const ticket = await getEnrichedTicketForOwner(c.env.DB, ticketId, user, c.env, now)
  return jsonSuccess(c, ticket)
})

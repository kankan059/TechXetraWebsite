import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireProfileComplete } from '../middleware/auth'
import { acceptTeamInvite, declineTeamInvite } from '../services/team.service'
import { jsonSuccess } from '../common/response'

export const teamInviteRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

teamInviteRoutes.use('*', requireAuth())

teamInviteRoutes.post('/:memberId/accept', requireProfileComplete(), async (c) => {
  const user = c.get('user')!
  const memberId = c.req.param('memberId')

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await acceptTeamInvite(c.env.DB, memberId, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, updated)
})

teamInviteRoutes.post('/:memberId/decline', async (c) => {
  const user = c.get('user')!
  const memberId = c.req.param('memberId')

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await declineTeamInvite(c.env.DB, memberId, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, updated)
})

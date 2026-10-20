import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireProfileComplete } from '../middleware/auth'
import {
  createTeam,
  getTeamWithMembers,
  inviteTeamMember,
  removeTeamMember,
  cancelTeam,
} from '../services/team.service'
import { jsonSuccess } from '../common/response'

export const teamRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

teamRoutes.use('*', requireAuth())

const CreateTeamSchema = z
  .object({
    event_id: z.string().min(1, 'event_id is required'),
    name: z.string().min(2).max(50),
  })
  .strict()

teamRoutes.post('/', requireProfileComplete(), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const validated = CreateTeamSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const team = await createTeam(c.env.DB, validated, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, team, 201)
})

teamRoutes.get('/:id', async (c) => {
  const user = c.get('user')!
  const teamId = c.req.param('id')
  const team = await getTeamWithMembers(c.env.DB, teamId, user)

  return jsonSuccess(c, team)
})

teamRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!
  const teamId = c.req.param('id')

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  await cancelTeam(c.env.DB, teamId, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, { cancelled: true })
})

const InviteMemberSchema = z
  .object({
    email: z.string().email(),
  })
  .strict()

teamRoutes.post('/:id/invites', requireProfileComplete(), async (c) => {
  const user = c.get('user')!
  const teamId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = InviteMemberSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const member = await inviteTeamMember(c.env.DB, teamId, validated.email, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, member, 201)
})

teamRoutes.delete('/:id/members/:memberId', async (c) => {
  const user = c.get('user')!
  const teamId = c.req.param('id')
  const memberId = c.req.param('memberId')

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  await removeTeamMember(c.env.DB, teamId, memberId, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, { removed: true })
})

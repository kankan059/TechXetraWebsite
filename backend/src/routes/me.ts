import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth } from '../middleware/auth'
import { formatUserProfile, updateParticipantProfile } from '../services/profile.service'
import { getUserTeams, getUserPendingInvites } from '../services/team.service'
import { getUserTickets } from '../services/ticket.service'
import { jsonSuccess } from '../common/response'

export const meRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

meRoutes.use('*', requireAuth())

meRoutes.get('/', (c) => {
  const user = c.get('user')!
  return jsonSuccess(c, formatUserProfile(user))
})

const UpdateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().optional(),
    is_student: z.boolean().optional(),
    institution_name: z.string().max(100).nullable().optional(),
    institution_id: z.string().max(40).nullable().optional(),
  })
  .strict()

meRoutes.patch('/profile', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const validated = UpdateProfileSchema.parse(body)

  const now = c.get('now') || Date.now()
  const updatedUser = await updateParticipantProfile(c.env.DB, user, validated, now)

  return jsonSuccess(c, formatUserProfile(updatedUser))
})

meRoutes.get('/teams', async (c) => {
  const user = c.get('user')!
  const teams = await getUserTeams(c.env.DB, user.id, user.email)
  return jsonSuccess(c, teams)
})

meRoutes.get('/team-invites', async (c) => {
  const user = c.get('user')!
  const invites = await getUserPendingInvites(c.env.DB, user.id, user.email)
  return jsonSuccess(c, invites)
})

meRoutes.get('/tickets', async (c) => {
  const user = c.get('user')!
  const now = c.get('now') || Date.now()
  const result = await getUserTickets(c.env.DB, user, c.env, now)
  return jsonSuccess(c, result)
})


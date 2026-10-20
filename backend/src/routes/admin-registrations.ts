import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireSuperAdminOnly } from '../middleware/auth'
import {
  cancelRegistrationByAdmin,
  replaceRegistrationMemberByAdmin,
} from '../services/admin-registration.service'
import { jsonSuccess } from '../common/response'

export const adminRegistrationRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminRegistrationRoutes.use('*', requireAuth(), requireSuperAdminOnly())

const CancelSchema = z
  .object({
    reason: z.string().min(2).max(500),
  })
  .strict()

adminRegistrationRoutes.post('/:id/cancel', async (c) => {
  const actor = c.get('user')!
  const registrationId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = CancelSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await cancelRegistrationByAdmin(
    c.env.DB,
    registrationId,
    validated.reason,
    actor,
    {
      ipAddress,
      userAgent,
      now,
    }
  )

  return jsonSuccess(c, result)
})

const ReplaceMemberSchema = z
  .object({
    old_user_id: z.string().min(1),
    new_user_id: z.string().min(1),
    reason: z.string().min(2).max(500),
  })
  .strict()

adminRegistrationRoutes.post('/:id/replace-member', async (c) => {
  const actor = c.get('user')!
  const registrationId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = ReplaceMemberSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await replaceRegistrationMemberByAdmin(
    c.env.DB,
    registrationId,
    validated,
    c.env,
    actor,
    {
      ipAddress,
      userAgent,
      now,
    }
  )

  return jsonSuccess(c, result)
})

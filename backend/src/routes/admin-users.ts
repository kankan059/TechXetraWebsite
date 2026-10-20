import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireSuperAdminOnly } from '../middleware/auth'
import { preRegisterStaff } from '../services/user.service'
import {
  updateUserByAdmin,
  listAdminUsers,
  getAdminUserDetail,
} from '../services/admin-user.service'
import { formatUserProfile } from '../services/profile.service'
import { jsonSuccess } from '../common/response'

export const adminUserRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminUserRoutes.use('*', requireAuth(), requireSuperAdminOnly())

const PreRegisterStaffSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    role: z.enum(['PARTICIPANT', 'VOLUNTEER', 'LEAD', 'SUPER_ADMIN']),
    can_review_payments: z.boolean().optional(),
  })
  .strict()

adminUserRoutes.post('/pre-register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = PreRegisterStaffSchema.parse(body)

  const now = c.get('now') || Date.now()
  const user = await preRegisterStaff(
    c.env.DB,
    {
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      canReviewPayments: parsed.can_review_payments,
    },
    now
  )

  return jsonSuccess(c, formatUserProfile(user), 201)
})

const UserQuerySchema = z
  .object({
    search: z.string().max(100).optional(),
    role: z.enum(['PARTICIPANT', 'VOLUNTEER', 'LEAD', 'SUPER_ADMIN']).optional(),
    is_active: z.coerce.boolean().optional(),
    can_review_payments: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  })
  .strict()

adminUserRoutes.get('/', async (c) => {
  const query = c.req.query()
  const validated = UserQuerySchema.parse(query)
  const result = await listAdminUsers(c.env.DB, validated)
  return jsonSuccess(c, result)
})

adminUserRoutes.get('/:id', async (c) => {
  const userId = c.req.param('id')
  const detail = await getAdminUserDetail(c.env.DB, userId)
  return jsonSuccess(c, detail)
})

const UpdateUserSchema = z
  .object({
    role: z.enum(['PARTICIPANT', 'VOLUNTEER', 'LEAD', 'SUPER_ADMIN']).optional(),
    can_review_payments: z.boolean().optional(),
    is_active: z.boolean().optional(),
    reason: z.string().max(500).optional(),
  })
  .strict()

async function handleUserUpdate(c: any) {
  const actor = c.get('user')!
  const targetUserId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = UpdateUserSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await updateUserByAdmin(c.env.DB, targetUserId, validated, actor, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, formatUserProfile(updated))
}

adminUserRoutes.patch('/:id', handleUserUpdate)
adminUserRoutes.post('/:id', handleUserUpdate)

import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireSuperAdminOnly } from '../middleware/auth'
import { queryAuditLogs } from '../services/audit.service'
import { jsonSuccess } from '../common/response'

export const adminAuditRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminAuditRoutes.use('*', requireAuth(), requireSuperAdminOnly())

const AuditQuerySchema = z
  .object({
    actor_id: z.string().optional(),
    target_type: z.string().optional(),
    target_id: z.string().optional(),
    action: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  })
  .strict()

adminAuditRoutes.get('/', async (c) => {
  const query = c.req.query()
  const validated = AuditQuerySchema.parse(query)

  const result = await queryAuditLogs(c.env.DB, {
    actorId: validated.actor_id,
    targetType: validated.target_type,
    targetId: validated.target_id,
    action: validated.action,
    limit: validated.limit,
    cursor: validated.cursor,
  })

  return jsonSuccess(c, result)
})

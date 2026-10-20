import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireSuperAdminOnly } from '../middleware/auth'
import {
  revokeTicketByAdmin,
  reissueTicketByAdmin,
  rotateTicketQrByAdmin,
  undoEventCheckInByAdmin,
  getAdminTicketDetail,
} from '../services/admin-ticket.service'
import { jsonSuccess } from '../common/response'

export const adminTicketRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminTicketRoutes.use('*', requireAuth(), requireSuperAdminOnly())

const ReasonSchema = z
  .object({
    reason: z.string().min(2).max(500),
  })
  .strict()

const ReissueSchema = z
  .object({
    reason: z.string().min(2).max(500),
    new_beneficiary_id: z.string().optional(),
  })
  .strict()

adminTicketRoutes.get('/:id', async (c) => {
  const ticketId = c.req.param('id')
  const detail = await getAdminTicketDetail(c.env.DB, ticketId)
  return jsonSuccess(c, detail)
})

adminTicketRoutes.post('/:id/revoke', async (c) => {
  const actor = c.get('user')!
  const ticketId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = ReasonSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const revoked = await revokeTicketByAdmin(c.env.DB, ticketId, validated.reason, actor, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, revoked)
})

adminTicketRoutes.post('/:id/reissue', async (c) => {
  const actor = c.get('user')!
  const ticketId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = ReissueSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await reissueTicketByAdmin(
    c.env.DB,
    ticketId,
    validated.reason,
    c.env,
    actor,
    {
      newBeneficiaryId: validated.new_beneficiary_id,
      ipAddress,
      userAgent,
      now,
    }
  )

  return jsonSuccess(c, result, 201)
})

adminTicketRoutes.post('/:id/rotate-qr', async (c) => {
  const actor = c.get('user')!
  const ticketId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = ReasonSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await rotateTicketQrByAdmin(
    c.env.DB,
    ticketId,
    validated.reason,
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

adminTicketRoutes.post('/:id/undo-checkin', async (c) => {
  const actor = c.get('user')!
  const ticketId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = ReasonSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await undoEventCheckInByAdmin(
    c.env.DB,
    ticketId,
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

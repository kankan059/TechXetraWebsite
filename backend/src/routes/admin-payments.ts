import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requirePaymentReviewerOnly } from '../middleware/auth'
import {
  getReviewerPaymentsQueue,
  getPaymentDetail,
  approvePayment,
  rejectPayment,
  holdPayment,
  unholdPayment,
  resubmitPayment,
} from '../services/payment.service'
import { fulfillPurchase } from '../services/ticket.service'
import { jsonSuccess } from '../common/response'

export const adminPaymentRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminPaymentRoutes.use('*', requireAuth(), requirePaymentReviewerOnly())

const QueueFilterSchema = z
  .object({
    status: z.enum(['PENDING', 'ON_HOLD', 'SUCCESS', 'FAILED', 'WITHDRAWN']).optional(),
    search: z.string().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  })
  .strict()

adminPaymentRoutes.get('/', async (c) => {
  const query = c.req.query()
  const validated = QueueFilterSchema.parse(query)
  const now = c.get('now') || Date.now()

  const queue = await getReviewerPaymentsQueue(c.env.DB, validated, now)
  return jsonSuccess(c, queue)
})

adminPaymentRoutes.get('/:id', async (c) => {
  const paymentId = c.req.param('id')
  const detail = await getPaymentDetail(c.env.DB, paymentId)
  return jsonSuccess(c, detail)
})

adminPaymentRoutes.post('/:id/approve', async (c) => {
  const user = c.get('user')!
  const paymentId = c.req.param('id')

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const approved = await approvePayment(c.env.DB, paymentId, user, {
    ipAddress,
    userAgent,
    now,
  })

  // Attempt ticket fulfillment immediately, catching errors separately so payment approval remains durable
  try {
    await fulfillPurchase(c.env.DB, approved.purchase_id, c.env, { now })
  } catch {
    // Fulfillment error is logged and durably recorded in purchases table as FAILED.
    // Approval remains intact!
  }

  return jsonSuccess(c, approved)
})

const RejectSchema = z
  .object({
    reason: z.string().min(2).max(500),
    internal_note: z.string().max(1000).optional(),
    cancel_purchase: z.boolean().optional(),
  })
  .strict()

adminPaymentRoutes.post('/:id/reject', async (c) => {
  const user = c.get('user')!
  const paymentId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = RejectSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const rejected = await rejectPayment(c.env.DB, paymentId, validated, user, {
    ipAddress,
    userAgent,
    now,
    env: c.env,
  })

  return jsonSuccess(c, rejected)
})

const HoldSchema = z
  .object({
    reason: z.string().max(500).optional(),
    internal_note: z.string().max(1000).optional(),
  })
  .strict()

adminPaymentRoutes.post('/:id/hold', async (c) => {
  const user = c.get('user')!
  const paymentId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = HoldSchema.parse(body)
  const now = c.get('now') || Date.now()

  const updated = await holdPayment(c.env.DB, paymentId, user, validated, now)
  return jsonSuccess(c, updated)
})

adminPaymentRoutes.post('/:id/unhold', async (c) => {
  const user = c.get('user')!
  const paymentId = c.req.param('id')
  const now = c.get('now') || Date.now()

  const updated = await unholdPayment(c.env.DB, paymentId, user, now)
  return jsonSuccess(c, updated)
})

const ResubmitSchema = z
  .object({
    transaction_id: z.string().min(8).max(35),
  })
  .strict()

adminPaymentRoutes.post('/:id/resubmit', async (c) => {
  const user = c.get('user')!
  const failedPaymentId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = ResubmitSchema.parse(body)
  const now = c.get('now') || Date.now()

  const resubmitted = await resubmitPayment(
    c.env.DB,
    failedPaymentId,
    validated.transaction_id,
    user,
    { now }
  )

  return jsonSuccess(c, resubmitted, 201)
})

import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireProfileComplete } from '../middleware/auth'
import {
  getPaymentInstructions,
  submitUpiPayment,
  withdrawPayment,
} from '../services/payment.service'
import {
  hashRequestBody,
  checkIdempotency,
  recordIdempotencyResponse,
} from '../services/idempotency.service'
import { jsonSuccess } from '../common/response'

export const paymentRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

paymentRoutes.use('*', requireAuth())

paymentRoutes.get('/purchases/:id/payment-instructions', async (c) => {
  const user = c.get('user')!
  const purchaseId = c.req.param('id')
  const now = c.get('now') || Date.now()

  const instructions = await getPaymentInstructions(
    c.env.DB,
    purchaseId,
    user,
    c.env,
    now
  )

  return jsonSuccess(c, instructions)
})

const SubmitPaymentSchema = z
  .object({
    transaction_id: z.string().min(8).max(35),
  })
  .strict()

paymentRoutes.post('/purchases/:id/payment', requireProfileComplete(), async (c) => {
  const user = c.get('user')!
  const purchaseId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const validated = SubmitPaymentSchema.parse(body)

  const idempotencyKey = c.req.header('idempotency-key')
  let requestHash: string | undefined

  if (idempotencyKey) {
    requestHash = await hashRequestBody(body)
    const check = await checkIdempotency(
      c.env.DB,
      idempotencyKey,
      user.id,
      `/api/purchases/${purchaseId}/payment`,
      requestHash,
      c.get('now')
    )

    if (check.isReplay) {
      return c.json(check.body, (check.status || 200) as any)
    }
  }

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const payment = await submitUpiPayment(
    c.env.DB,
    purchaseId,
    validated.transaction_id,
    user,
    {
      ipAddress,
      userAgent,
      now,
    }
  )

  const responsePayload = {
    success: true,
    data: payment,
    request_id: c.get('requestId') || 'unknown',
  }

  if (idempotencyKey && requestHash) {
    await recordIdempotencyResponse(
      c.env.DB,
      idempotencyKey,
      user.id,
      `/api/purchases/${purchaseId}/payment`,
      201,
      responsePayload
    )
  }

  return c.json(responsePayload, 201)
})

paymentRoutes.post('/payments/:id/withdraw', async (c) => {
  const user = c.get('user')!
  const paymentId = c.req.param('id')
  const now = c.get('now') || Date.now()

  const updated = await withdrawPayment(c.env.DB, paymentId, user, {
    now,
    env: c.env,
  })

  return jsonSuccess(c, updated)
})

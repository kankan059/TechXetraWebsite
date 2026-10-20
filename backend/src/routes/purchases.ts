import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireProfileComplete } from '../middleware/auth'
import {
  createPurchase,
  getUserPurchases,
  getPurchaseById,
  releasePurchase,
} from '../services/purchase.service'
import { fulfillPurchase } from '../services/ticket.service'
import {
  hashRequestBody,
  checkIdempotency,
  recordIdempotencyResponse,
} from '../services/idempotency.service'
import { assertOwnership } from '../services/authz.service'
import { jsonSuccess } from '../common/response'
import { AppError } from '../common/errors'

export const purchaseRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

purchaseRoutes.use('*', requireAuth())

const PurchaseItemSchema = z
  .object({
    item_type: z.enum(['GATE_PASS', 'EVENT_PASS']),
    event_id: z.string().optional(),
    team_id: z.string().optional(),
  })
  .strict()

const CreatePurchaseSchema = z
  .object({
    items: z.array(PurchaseItemSchema).min(1).max(10),
    acknowledge_student_id_policy: z.boolean().optional(),
  })
  .strict()

purchaseRoutes.post('/', requireProfileComplete(), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const validated = CreatePurchaseSchema.parse(body)

  const idempotencyKey = c.req.header('idempotency-key')
  let requestHash: string | undefined

  if (idempotencyKey) {
    requestHash = await hashRequestBody(body)
    const check = await checkIdempotency(
      c.env.DB,
      idempotencyKey,
      user.id,
      '/api/purchases',
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

  const purchase = await createPurchase(
    c.env.DB,
    user,
    {
      items: validated.items,
      acknowledge_student_id_policy: validated.acknowledge_student_id_policy,
      idempotency_key: idempotencyKey,
    },
    c.env,
    {
      ipAddress,
      userAgent,
      now,
      requestHash,
    }
  )

  if (purchase.status === 'PAID') {
    try {
      await fulfillPurchase(c.env.DB, purchase.id, c.env, { now })
    } catch {
      // Safe: fulfillment failure is recorded in DB and can be retried without losing purchase
    }
  }

  const responsePayload = {
    success: true,
    data: purchase,
    request_id: c.get('requestId') || 'unknown',
  }

  if (idempotencyKey && requestHash) {
    await recordIdempotencyResponse(
      c.env.DB,
      idempotencyKey,
      user.id,
      '/api/purchases',
      201,
      responsePayload
    )
  }

  return c.json(responsePayload, 201)
})

purchaseRoutes.get('/', async (c) => {
  const user = c.get('user')!
  const list = await getUserPurchases(c.env.DB, user.id)
  return jsonSuccess(c, list)
})

purchaseRoutes.get('/:id', async (c) => {
  const user = c.get('user')!
  const purchaseId = c.req.param('id')
  const purchase = await getPurchaseById(c.env.DB, purchaseId)

  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  assertOwnership(user, purchase.buyer_id, 'Purchase')

  return jsonSuccess(c, purchase)
})

purchaseRoutes.post('/:id/cancel', async (c) => {
  const user = c.get('user')!
  const purchaseId = c.req.param('id')
  const purchase = await getPurchaseById(c.env.DB, purchaseId)

  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  assertOwnership(user, purchase.buyer_id, 'Purchase')

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  await releasePurchase(
    c.env.DB,
    purchaseId,
    'CANCELLED',
    'Cancelled by buyer',
    user,
    { ipAddress, userAgent, now }
  )

  return jsonSuccess(c, { cancelled: true })
})

/**
 * POST /api/purchases/:id/retry-fulfillment
 * Owner-accessible retry endpoint for ticket generation.
 * Rate limited to at most once per 5 seconds per purchase.
 */
purchaseRoutes.post('/:id/retry-fulfillment', async (c) => {
  const user = c.get('user')!
  const purchaseId = c.req.param('id')
  const purchase = await getPurchaseById(c.env.DB, purchaseId)

  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  assertOwnership(user, purchase.buyer_id, 'Purchase')

  if (purchase.status !== 'PAID') {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `Cannot retry ticket fulfillment for purchase in ${purchase.status} status. Purchase must be PAID.`
    )
  }

  const now = c.get('now') || Date.now()

  // Rate limiting for owner retries: must wait at least 5 seconds between consecutive attempts
  if (user.role !== 'SUPER_ADMIN' && purchase.fulfillment_attempts > 0 && now - purchase.updated_at < 5000) {
    throw new AppError(429, 'RATE_LIMITED', 'Please wait a few seconds before retrying ticket fulfillment')
  }

  const result = await fulfillPurchase(c.env.DB, purchase.id, c.env, { now })
  return jsonSuccess(c, result)
})


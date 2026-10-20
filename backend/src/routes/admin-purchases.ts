import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requirePaymentReviewerOnly } from '../middleware/auth'
import { fulfillPurchase } from '../services/ticket.service'
import { getPurchaseById } from '../services/purchase.service'
import { jsonSuccess } from '../common/response'
import { AppError } from '../common/errors'

export const adminPurchaseRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminPurchaseRoutes.use('*', requireAuth(), requirePaymentReviewerOnly())

const PurchaseQuerySchema = z
  .object({
    status: z.enum(['AWAITING_PAYMENT', 'PENDING_VERIFICATION', 'PAID', 'CANCELLED', 'EXPIRED']).optional(),
    fulfillment_status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
    buyer_id: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  })
  .strict()

adminPurchaseRoutes.get('/', async (c) => {
  const query = c.req.query()
  const validated = PurchaseQuerySchema.parse(query)
  const limit = Math.min(Math.max(validated.limit || 20, 1), 100)
  const conditions: string[] = []
  const bindings: unknown[] = []

  if (validated.status) {
    conditions.push('p.status = ?')
    bindings.push(validated.status)
  }

  if (validated.fulfillment_status) {
    conditions.push('p.fulfillment_status = ?')
    bindings.push(validated.fulfillment_status)
  }

  if (validated.buyer_id) {
    conditions.push('p.buyer_id = ?')
    bindings.push(validated.buyer_id)
  }

  if (validated.cursor) {
    const [cursorCreatedAtStr, cursorId] = validated.cursor.split(':')
    const cursorCreatedAt = parseInt(cursorCreatedAtStr, 10)
    if (!isNaN(cursorCreatedAt) && cursorId) {
      conditions.push('(p.created_at < ? OR (p.created_at = ? AND p.id < ?))')
      bindings.push(cursorCreatedAt, cursorCreatedAt, cursorId)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `
    SELECT p.*, u.name as buyer_name, u.email as buyer_email
    FROM purchases p
    JOIN users u ON p.buyer_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ?
  `
  bindings.push(limit + 1)

  const rows = await c.env.DB.prepare(sql).bind(...bindings).all<any>()
  const items = rows.results || []

  const hasNextPage = items.length > limit
  const pagedItems = hasNextPage ? items.slice(0, limit) : items

  let nextCursor: string | null = null
  if (hasNextPage && pagedItems.length > 0) {
    const last = pagedItems[pagedItems.length - 1]
    nextCursor = `${last.created_at}:${last.id}`
  }

  return jsonSuccess(c, { purchases: pagedItems, next_cursor: nextCursor })
})

adminPurchaseRoutes.get('/:id', async (c) => {
  const purchaseId = c.req.param('id')
  const purchase = await getPurchaseById(c.env.DB, purchaseId)

  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  return jsonSuccess(c, purchase)
})

/**
 * POST /api/admin/purchases/:id/retry-fulfillment
 * Admin / Reviewer route to trigger ticket fulfillment for any PAID purchase.
 */
adminPurchaseRoutes.post('/:id/retry-fulfillment', async (c) => {
  const purchaseId = c.req.param('id')
  const purchase = await getPurchaseById(c.env.DB, purchaseId)

  if (!purchase) {
    throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  }

  if (purchase.status !== 'PAID') {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `Cannot retry ticket fulfillment for purchase in ${purchase.status} status. Purchase must be PAID.`
    )
  }

  const now = c.get('now') || Date.now()
  const result = await fulfillPurchase(c.env.DB, purchase.id, c.env, { now })
  return jsonSuccess(c, result)
})

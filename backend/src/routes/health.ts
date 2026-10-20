import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { jsonSuccess } from '../common/response'
import { AppError } from '../common/errors'

export const healthRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

healthRoutes.get('/health', (c) => {
  return jsonSuccess(c, {
    status: 'healthy',
    timestamp: c.get('now') || Date.now(),
  })
})

healthRoutes.get('/ready', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as is_ready').first<{ is_ready: number }>()
    if (!result || result.is_ready !== 1) {
      throw new Error('Database ping failed')
    }
    return jsonSuccess(c, {
      ready: true,
      timestamp: c.get('now') || Date.now(),
    })
  } catch {
    throw new AppError(500, 'DATABASE_UNAVAILABLE', 'Service database is not ready')
  }
})

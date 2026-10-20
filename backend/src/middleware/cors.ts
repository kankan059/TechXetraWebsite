import type { MiddlewareHandler } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'

export const corsMiddleware = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const origin = c.req.header('origin')
    const allowedOrigin = c.env.FRONTEND_ORIGIN?.trim()

    const isWildcard = !allowedOrigin || allowedOrigin === '*'
    const isMatch = Boolean(origin && (isWildcard || origin.trim() === allowedOrigin))

    if (c.req.method === 'OPTIONS') {
      if (isMatch) {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin!,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, Authorization, X-Request-Id, Idempotency-Key',
            'Access-Control-Expose-Headers': 'X-Request-Id',
            'Access-Control-Max-Age': '86400',
            Vary: 'Origin',
          },
        })
      }
      return new Response(null, { status: 204 })
    }

    await next()

    if (isMatch) {
      c.res.headers.set('Access-Control-Allow-Origin', origin!)
      c.res.headers.set('Access-Control-Allow-Credentials', 'true')
      c.res.headers.set('Access-Control-Expose-Headers', 'X-Request-Id')
      c.res.headers.append('Vary', 'Origin')
    } else if (isWildcard && !origin) {
      c.res.headers.set('Access-Control-Allow-Origin', '*')
    }
  }
}

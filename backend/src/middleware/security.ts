import type { MiddlewareHandler } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { AppError } from '../common/errors'

export const securityHeadersMiddleware = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    await next()

    c.res.headers.set('X-Content-Type-Options', 'nosniff')
    c.res.headers.set('X-Frame-Options', 'DENY')
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.res.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")

    if (c.env.ENVIRONMENT === 'production') {
      c.res.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }
  }
}

export const mutationOriginMiddleware = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const method = c.req.method.toUpperCase()
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

    if (!isMutation) {
      return next()
    }

    const allowedOrigin = c.env.FRONTEND_ORIGIN?.trim()
    const isWildcard = !allowedOrigin || allowedOrigin === '*'

    if (isWildcard) {
      await next()
      return
    }

    const origin = c.req.header('origin')
    const referer = c.req.header('referer')

    if (origin) {
      if (origin.trim() !== allowedOrigin) {
        throw new AppError(403, 'CSRF_ORIGIN_INVALID', 'Cross-origin request rejected')
      }
    } else if (referer) {
      try {
        const refererOrigin = new URL(referer).origin
        if (!allowedOrigin || refererOrigin !== allowedOrigin) {
          throw new AppError(403, 'CSRF_ORIGIN_INVALID', 'Cross-origin referer rejected')
        }
      } catch {
        throw new AppError(403, 'CSRF_ORIGIN_INVALID', 'Invalid referer header')
      }
    } else if (c.env.ENVIRONMENT === 'production') {
      // In production, require Origin or Referer for mutations
      throw new AppError(403, 'CSRF_ORIGIN_INVALID', 'Origin or Referer required for state mutation')
    }

    await next()
  }
}

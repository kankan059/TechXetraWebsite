import type { MiddlewareHandler } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { AppError } from '../common/errors'
import { validateSession } from '../services/session.service'
import { computeProfileCompleteness } from '../services/profile.service'
import { isSuperAdmin, canReviewPayments } from '../services/authz.service'
import type { UserRole } from '../types'

function extractSessionToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null

  // Prioritize __Host-session, then fallback to session for local non-https testing
  const matchHost = cookieHeader.match(/(?:^|;\s*)__Host-session=([^;]+)/)
  if (matchHost) return matchHost[1]

  const matchPlain = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  if (matchPlain) return matchPlain[1]

  return null
}

export const requireAuth = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const authHeader = c.req.header('authorization')
    let token: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    }
    if (!token) {
      const cookieHeader = c.req.header('cookie')
      token = extractSessionToken(cookieHeader)
    }

    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication session required')
    }

    const now = c.get('now') || Date.now()
    const { session, user } = await validateSession(c.env.DB, token, c.env, now)

    c.set('session', session)
    c.set('user', user)

    await next()
  }
}

export const optionalAuth = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const authHeader = c.req.header('authorization')
    let token: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    }
    if (!token) {
      const cookieHeader = c.req.header('cookie')
      token = extractSessionToken(cookieHeader)
    }

    if (token) {
      try {
        const now = c.get('now') || Date.now()
        const { session, user } = await validateSession(c.env.DB, token, c.env, now)
        c.set('session', session)
        c.set('user', user)
      } catch {
        // Optional auth does not fail if session is expired or invalid
      }
    }

    await next()
  }
}

export const requireProfileComplete = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    if (!user.profile_completed_at) {
      const completeness = computeProfileCompleteness(user)
      throw new AppError(
        403,
        'PROFILE_INCOMPLETE',
        'Please complete your profile before proceeding',
        { missing_fields: completeness.missingFields }
      )
    }

    await next()
  }
}

export const requireRole = (
  allowedRoles: UserRole[]
): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions')
    }

    await next()
  }
}

export const requireSuperAdminOnly = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const user = c.get('user')
    if (!user || !isSuperAdmin(user)) {
      throw new AppError(403, 'FORBIDDEN', 'Super administrator access required')
    }
    await next()
  }
}

export const requirePaymentReviewerOnly = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const user = c.get('user')
    if (!user || !canReviewPayments(user)) {
      throw new AppError(403, 'FORBIDDEN', 'Payment review access required')
    }
    await next()
  }
}

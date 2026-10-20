import type { ErrorHandler, NotFoundHandler } from 'hono'
import { ZodError } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { AppError } from '../common/errors'
import { jsonError } from '../common/response'
import { logger } from '../common/logger'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const globalErrorHandler: ErrorHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> = (err, c) => {
  const requestId = c.get('requestId') || 'unknown'

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }))
    return jsonError(
      c,
      'VALIDATION_ERROR',
      'Request input validation failed',
      400,
      issues
    )
  }

  // 2. Custom Application Errors
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error('Operational server error', err, {
        requestId,
        code: err.code,
        path: c.req.path,
        method: c.req.method,
      })
    }
    return jsonError(
      c,
      err.code,
      err.message,
      err.status as ContentfulStatusCode,
      err.details
    )
  }

  // 3. Unexpected / System Errors
  logger.error('Unhandled internal server error', err, {
    requestId,
    path: c.req.path,
    method: c.req.method,
  })

  return jsonError(
    c,
    'INTERNAL_SERVER_ERROR',
    'An unexpected internal error occurred',
    500
  )
}

export const notFoundHandler: NotFoundHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> = (c) => {
  return jsonError(c, 'ROUTE_NOT_FOUND', `Route ${c.req.method} ${c.req.path} not found`, 404)
}

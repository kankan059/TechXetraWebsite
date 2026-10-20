import type { MiddlewareHandler } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'

const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/

export const requestIdMiddleware = (): MiddlewareHandler<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> => {
  return async (c, next) => {
    const incomingHeader = c.req.header('x-request-id')
    let requestId: string

    if (incomingHeader && REQUEST_ID_REGEX.test(incomingHeader)) {
      requestId = incomingHeader
    } else {
      requestId = crypto.randomUUID()
    }

    c.set('requestId', requestId)
    c.set('now', Date.now())

    await next()

    c.res.headers.set('X-Request-Id', requestId)
  }
}

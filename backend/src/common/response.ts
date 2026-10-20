import type { AppContext } from '../types/env'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  request_id: string
}

export interface ApiErrorPayload {
  code: string
  message: string
  details?: unknown
}

export interface ApiErrorResponse {
  success: false
  error: ApiErrorPayload
  request_id: string
}

export function jsonSuccess<T>(
  c: AppContext,
  data: T,
  status: ContentfulStatusCode = 200
): Response {
  const requestId = c.get('requestId') || 'unknown'
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    request_id: requestId,
  }
  return c.json(payload, status)
}

export function jsonError(
  c: AppContext,
  code: string,
  message: string,
  status: ContentfulStatusCode = 500,
  details?: unknown
): Response {
  const requestId = c.get('requestId') || 'unknown'
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    request_id: requestId,
  }
  return c.json(payload, status)
}

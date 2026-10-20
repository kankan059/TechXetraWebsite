export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string
  timeoutMs?: number
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { idempotencyKey, timeoutMs = 15000, headers = {}, signal, ...rest } = options

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (idempotencyKey) {
    defaultHeaders['Idempotency-Key'] = idempotencyKey
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include', // Mandates HttpOnly session cookies
      headers: {
        ...defaultHeaders,
        ...(headers as Record<string, string>),
      },
      signal: signal || controller.signal,
      ...rest,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch'
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Cannot connect to backend (${API_BASE}): ${errorMsg}`,
      err
    )
  } finally {
    clearTimeout(timeoutId)
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload.success) {
    const error = payload.error || {}
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred',
      error.details,
      payload.request_id
    )
  }

  return payload.data as T
}

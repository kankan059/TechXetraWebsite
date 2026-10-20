const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  '__host-session',
  'session',
  'token',
  'secret',
  'password',
  'google_token',
  'id_token',
  'transaction_id',
  'utr',
  'phone',
  'ticket_hmac_secret',
])

export function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5) return '[DEPTH_LIMIT]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    // If it looks like a bearer token or session token
    if (obj.length > 50 && !obj.includes(' ') && !obj.includes('{')) {
      return `${obj.slice(0, 4)}...[REDACTED]`
    }
    return obj
  }
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1))
  }

  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEYS.has(lowerKey)) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, depth + 1)
    } else {
      redacted[key] = value
    }
  }
  return redacted
}

export interface LogMetadata {
  requestId?: string
  userId?: string
  path?: string
  method?: string
  [key: string]: unknown
}

export const logger = {
  info(message: string, meta?: LogMetadata): void {
    const safeMeta = meta ? redactSensitiveData(meta) : undefined
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...(safeMeta && typeof safeMeta === 'object' ? (safeMeta as object) : {}),
      })
    )
  },

  warn(message: string, meta?: LogMetadata): void {
    const safeMeta = meta ? redactSensitiveData(meta) : undefined
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...(safeMeta && typeof safeMeta === 'object' ? (safeMeta as object) : {}),
      })
    )
  },

  error(message: string, error?: unknown, meta?: LogMetadata): void {
    const safeMeta = meta ? redactSensitiveData(meta) : undefined
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined,
          }
        : { raw: String(error) }

    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        error: errorDetails,
        ...(safeMeta && typeof safeMeta === 'object' ? (safeMeta as object) : {}),
      })
    )
  },
}

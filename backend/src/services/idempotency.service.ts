import { AppError } from '../common/errors'

export interface IdempotencyCheckResult {
  isReplay: boolean
  status?: number
  body?: any
}

export async function hashRequestBody(body: unknown): Promise<string> {
  const str = JSON.stringify(body || {})
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function checkIdempotency(
  db: D1Database,
  key: string,
  userId: string,
  endpoint: string,
  requestHash: string,
  now = Date.now(),
  ttlMs = 24 * 60 * 60 * 1000 // 24 hours
): Promise<IdempotencyCheckResult> {
  const existing = await db
    .prepare(
      `SELECT * FROM idempotency_keys
       WHERE key = ? AND user_id = ? AND endpoint = ?`
    )
    .bind(key, userId, endpoint)
    .first<any>()

  if (existing) {
    if (existing.expires_at <= now) {
      // Key expired, delete it and allow fresh execution
      await db
        .prepare('DELETE FROM idempotency_keys WHERE key = ? AND user_id = ? AND endpoint = ?')
        .bind(key, userId, endpoint)
        .run()
    } else {
      if (existing.request_hash !== requestHash) {
        throw new AppError(
          422,
          'IDEMPOTENCY_MISMATCH',
          'Idempotency key reuse with different request payload'
        )
      }

      if (existing.response_status !== null) {
        return {
          isReplay: true,
          status: existing.response_status,
          body: JSON.parse(existing.response_body || '{}'),
        }
      }

      // Currently in progress
      throw new AppError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'A request with this idempotency key is currently being processed'
      )
    }
  }

  // Record key as in-progress
  await db
    .prepare(
      `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, response_status, response_body, created_at, expires_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`
    )
    .bind(key, userId, endpoint, requestHash, now, now + ttlMs)
    .run()

  return { isReplay: false }
}

export async function recordIdempotencyResponse(
  db: D1Database,
  key: string,
  userId: string,
  endpoint: string,
  status: number,
  body: unknown
): Promise<void> {
  await db
    .prepare(
      `UPDATE idempotency_keys SET
        response_status = ?,
        response_body = ?
       WHERE key = ? AND user_id = ? AND endpoint = ?`
    )
    .bind(status, JSON.stringify(body), key, userId, endpoint)
    .run()
}

import { AppError } from '../common/errors'
import type { Session, User, UserRole } from '../types'
import type { CloudflareBindings } from '../types/env'

export const DEFAULT_PARTICIPANT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
export const DEFAULT_STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

/**
 * Compute SHA-256 hex digest of a string using Web Crypto API.
 */
export async function hashSessionToken(rawToken: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(rawToken)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a 32-byte cryptographically random token string.
 */
export function generateRawSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function getSessionTtlMs(role: UserRole, env: CloudflareBindings): number {
  if (role === 'PARTICIPANT') {
    return Number(env.PARTICIPANT_SESSION_TTL_MS) || DEFAULT_PARTICIPANT_SESSION_TTL_MS
  }
  return Number(env.STAFF_SESSION_TTL_MS) || DEFAULT_STAFF_SESSION_TTL_MS
}

export interface CreateSessionResult {
  session: Session
  rawToken: string
  cookieHeader: string
}

export async function createSession(
  db: D1Database,
  user: User,
  env: CloudflareBindings,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<CreateSessionResult> {
  const now = meta?.now || Date.now()
  const ttlMs = getSessionTtlMs(user.role, env)
  const expiresAt = now + ttlMs

  const rawToken = generateRawSessionToken()
  const hashedToken = await hashSessionToken(rawToken)

  const session: Session = {
    id: hashedToken,
    user_id: user.id,
    expires_at: expiresAt,
    revoked_at: null,
    ip_address: meta?.ipAddress || null,
    user_agent: meta?.userAgent || null,
    created_at: now,
    last_active_at: now,
  }

  await db
    .prepare(
      `INSERT INTO sessions (
        id, user_id, expires_at, revoked_at, ip_address, user_agent, created_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      session.id,
      session.user_id,
      session.expires_at,
      session.revoked_at,
      session.ip_address,
      session.user_agent,
      session.created_at,
      session.last_active_at
    )
    .run()

  const maxAgeSec = Math.floor(ttlMs / 1000)
  // __Host-session cookie: HttpOnly, Secure, SameSite=Lax, Path=/
 const cookieHeader = `__Host-session=${rawToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAgeSec}`;

  return { session, rawToken, cookieHeader }
}

export interface ValidatedSessionResult {
  session: Session
  user: User
}

export async function validateSession(
  db: D1Database,
  rawToken: string,
  env: CloudflareBindings,
  now = Date.now()
): Promise<ValidatedSessionResult> {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Session token is required')
  }

  const hashedToken = await hashSessionToken(rawToken)

  const row = await db
    .prepare(
      `SELECT
        s.id as s_id, s.user_id as s_user_id, s.expires_at as s_expires_at,
        s.revoked_at as s_revoked_at, s.ip_address as s_ip_address,
        s.user_agent as s_user_agent, s.created_at as s_created_at,
        s.last_active_at as s_last_active_at,
        u.*
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`
    )
    .bind(hashedToken)
    .first<any>()

  if (!row) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid session')
  }

  if (row.s_revoked_at !== null) {
    throw new AppError(401, 'SESSION_EXPIRED', 'Session has been revoked')
  }

  if (row.s_expires_at <= now) {
    throw new AppError(401, 'SESSION_EXPIRED', 'Session has expired')
  }

  if (row.is_active === 0) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'User account is deactivated')
  }

  const session: Session = {
    id: row.s_id,
    user_id: row.s_user_id,
    expires_at: row.s_expires_at,
    revoked_at: row.s_revoked_at,
    ip_address: row.s_ip_address,
    user_agent: row.s_user_agent,
    created_at: row.s_created_at,
    last_active_at: row.s_last_active_at,
  }

  const user: User = {
    id: row.id,
    google_sub: row.google_sub,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url,
    phone: row.phone,
    is_student: row.is_student,
    institution_name: row.institution_name,
    institution_id: row.institution_id,
    student_fields_locked: row.student_fields_locked,
    role: row.role as UserRole,
    can_review_payments: row.can_review_payments,
    is_active: row.is_active,
    profile_completed_at: row.profile_completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }

  // Sliding session lifetime for PARTICIPANT only
  if (user.role === 'PARTICIPANT') {
    const ttlMs = getSessionTtlMs('PARTICIPANT', env)
    const remainingMs = session.expires_at - now
    if (remainingMs < ttlMs / 2) {
      const newExpiresAt = now + ttlMs
      await db
        .prepare('UPDATE sessions SET expires_at = ?, last_active_at = ? WHERE id = ?')
        .bind(newExpiresAt, now, session.id)
        .run()
      session.expires_at = newExpiresAt
      session.last_active_at = now
    }
  }

  return { session, user }
}

export async function revokeSession(
  db: D1Database,
  rawToken: string,
  now = Date.now()
): Promise<string> {
  if (rawToken) {
    const hashedToken = await hashSessionToken(rawToken)
    await db
      .prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
      .bind(now, hashedToken)
      .run()
  }

  // Expired cookie header
  return '__Host-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax'
}

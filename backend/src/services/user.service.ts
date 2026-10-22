import { AppError } from '../common/errors'
import { generateId } from '../common/utils'
import { logger } from '../common/logger'
import type { User, UserRole } from '../types'
import type { GoogleUserPayload } from './google-auth.service'

/**
 * Generate sequential user ID in format TX26XXXX (e.g. TX260001).
 * Queries the database for the highest existing TX26 ID and increments it.
 */
export async function generateNextUserId(db: D1Database): Promise<string> {
  const row = await db
    .prepare("SELECT id FROM users WHERE id LIKE 'TX26%' ORDER BY id DESC LIMIT 1")
    .first<{ id: string }>()

  let nextNum = 1
  if (row?.id && row.id.startsWith('TX26')) {
    const numPart = row.id.slice(4)
    const parsed = parseInt(numPart, 10)
    if (!isNaN(parsed) && parsed >= 1) {
      nextNum = parsed + 1
    }
  }

  let candidate = `TX26${String(nextNum).padStart(4, '0')}`
  let exists = await db
    .prepare('SELECT 1 FROM users WHERE id = ?')
    .bind(candidate)
    .first()

  while (exists) {
    nextNum++
    candidate = `TX26${String(nextNum).padStart(4, '0')}`
    exists = await db
      .prepare('SELECT 1 FROM users WHERE id = ?')
      .bind(candidate)
      .first()
  }

  return candidate
}

export async function resolveOrCreateGoogleUser(
  db: D1Database,
  payload: GoogleUserPayload,
  now = Date.now()
): Promise<User> {
  const { sub, email, name, avatarUrl } = payload

  // 1. Resolve by google_sub
  const userBySub = await db
    .prepare('SELECT * FROM users WHERE google_sub = ?')
    .bind(sub)
    .first<User>()

  if (userBySub) {
    if (userBySub.is_active === 0) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'User account is deactivated')
    }

    // Refresh avatar if newly provided
    if (avatarUrl && avatarUrl !== userBySub.avatar_url) {
      await db
        .prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?')
        .bind(avatarUrl, now, userBySub.id)
        .run()
      userBySub.avatar_url = avatarUrl
      userBySub.updated_at = now
    }

    return userBySub
  }

  // 2. Resolve by normalized email (for pre-registered staff or invited users)
  const userByEmail = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>()

  if (userByEmail) {
    if (userByEmail.google_sub !== null && userByEmail.google_sub !== sub) {
      logger.warn('Conflicting Google sub attempted for email', {
        userId: userByEmail.id,
        email,
      })
      throw new AppError(
        409,
        'ACCOUNT_CONFLICT',
        'This email address is already linked to a different Google account'
      )
    }

    if (userByEmail.is_active === 0) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'User account is deactivated')
    }

    // Link google_sub conditionally to handle concurrent account linking
    const result = await db
      .prepare(
        `UPDATE users SET
          google_sub = ?,
          avatar_url = COALESCE(?, avatar_url),
          updated_at = ?
        WHERE id = ? AND google_sub IS NULL`
      )
      .bind(sub, avatarUrl, now, userByEmail.id)
      .run()

    if (result.meta?.changes === 0) {
      // Re-read user to check if another request linked it or conflicted
      const refreshed = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userByEmail.id)
        .first<User>()

      if (!refreshed || refreshed.google_sub !== sub) {
        throw new AppError(
          409,
          'ACCOUNT_CONFLICT',
          'Account linking conflict occurred. Please try again.'
        )
      }
      return refreshed
    }

    userByEmail.google_sub = sub
    userByEmail.avatar_url = avatarUrl || userByEmail.avatar_url
    userByEmail.updated_at = now

    // Link pending team invitations to newly linked user by email
    await db
      .prepare(
        'UPDATE team_members SET user_id = ? WHERE invited_email = ? AND user_id IS NULL'
      )
      .bind(userByEmail.id, email)
      .run()

    return userByEmail
  }

  // 3. Create new PARTICIPANT user
  const newUserId = await generateNextUserId(db)
  const newUser: User = {
    id: newUserId,
    google_sub: sub,
    email,
    name,
    avatar_url: avatarUrl,
    phone: null,
    is_student: 0,
    institution_name: null,
    institution_id: null,
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: null,
    created_at: now,
    updated_at: now,
  }

  await db
    .prepare(
      `INSERT INTO users (
        id, google_sub, email, name, avatar_url, phone, is_student,
        institution_name, institution_id, student_fields_locked, role,
        can_review_payments, is_active, profile_completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      newUser.id,
      newUser.google_sub,
      newUser.email,
      newUser.name,
      newUser.avatar_url,
      newUser.phone,
      newUser.is_student,
      newUser.institution_name,
      newUser.institution_id,
      newUser.student_fields_locked,
      newUser.role,
      newUser.can_review_payments,
      newUser.is_active,
      newUser.profile_completed_at,
      newUser.created_at,
      newUser.updated_at
    )
    .run()

  // Link any pending team invitations to this new user by email
  await db
    .prepare(
      'UPDATE team_members SET user_id = ? WHERE invited_email = ? AND user_id IS NULL'
    )
    .bind(newUser.id, email)
    .run()

  return newUser
}

export interface PreRegisterStaffInput {
  email: string
  name: string
  role: UserRole
  canReviewPayments?: boolean
}

export async function preRegisterStaff(
  db: D1Database,
  input: PreRegisterStaffInput,
  now = Date.now()
): Promise<User> {
  const normalizedEmail = input.email.trim().toLowerCase()
  const trimmedName = input.name.trim()

  const existing = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first<User>()

  if (existing) {
    await db
      .prepare(
        `UPDATE users SET
          name = ?,
          role = ?,
          can_review_payments = ?,
          is_active = 1,
          updated_at = ?
        WHERE id = ?`
      )
      .bind(
        trimmedName,
        input.role,
        input.canReviewPayments ? 1 : 0,
        now,
        existing.id
      )
      .run()

    return {
      ...existing,
      name: trimmedName,
      role: input.role,
      can_review_payments: input.canReviewPayments ? 1 : 0,
      is_active: 1,
      updated_at: now,
    }
  }

  const newId = await generateNextUserId(db)
  const user: User = {
    id: newId,
    google_sub: null,
    email: normalizedEmail,
    name: trimmedName,
    avatar_url: null,
    phone: null,
    is_student: 0,
    institution_name: null,
    institution_id: null,
    student_fields_locked: 0,
    role: input.role,
    can_review_payments: input.canReviewPayments ? 1 : 0,
    is_active: 1,
    profile_completed_at: null,
    created_at: now,
    updated_at: now,
  }

  await db
    .prepare(
      `INSERT INTO users (
        id, google_sub, email, name, avatar_url, phone, is_student,
        institution_name, institution_id, student_fields_locked, role,
        can_review_payments, is_active, profile_completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user.id,
      user.google_sub,
      user.email,
      user.name,
      user.avatar_url,
      user.phone,
      user.is_student,
      user.institution_name,
      user.institution_id,
      user.student_fields_locked,
      user.role,
      user.can_review_payments,
      user.is_active,
      user.profile_completed_at,
      user.created_at,
      user.updated_at
    )
    .run()

  return user
}

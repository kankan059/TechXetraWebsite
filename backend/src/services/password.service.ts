import { AppError } from '../common/errors'
import { generateId, normalizeEmail } from '../common/utils'
import type { User } from '../types'

const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH_BITS = 256

/**
 * Hash a plain password using Web Crypto API PBKDF2-SHA256.
 * Format: pbkdf2:sha256:100000:<salt_hex>:<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH_BITS
  )

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `pbkdf2:sha256:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`
}

/**
 * Verify a plain password against a stored PBKDF2 hash using constant-time comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || typeof storedHash !== 'string') return false

  const parts = storedHash.split(':')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') {
    return false
  }

  const iterations = parseInt(parts[2], 10)
  const saltHex = parts[3]
  const expectedHashHex = parts[4]

  if (isNaN(iterations) || iterations <= 0 || !saltHex || !expectedHashHex) {
    return false
  }

  const saltBytes = saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16))
  if (!saltBytes || saltBytes.length !== 16) {
    return false
  }
  const salt = new Uint8Array(saltBytes)

  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH_BITS
  )

  const actualHashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time string comparison
  if (actualHashHex.length !== expectedHashHex.length) {
    return false
  }

  let diff = 0
  for (let i = 0; i < actualHashHex.length; i++) {
    diff |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i)
  }

  return diff === 0
}

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface LoginInput {
  email: string
  password: string
}

/**
 * Register a new user with email and password.
 */
export async function registerWithPassword(
  db: D1Database,
  input: RegisterInput,
  now = Date.now()
): Promise<User> {
  const email = normalizeEmail(input.email)
  const name = input.name.trim()

  if (!email) {
    throw new AppError(400, 'INVALID_EMAIL', 'A valid email is required')
  }

  if (!input.password || input.password.length < 8) {
    throw new AppError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters long')
  }

  // Check if user already exists
  const existingUser = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>()

  if (existingUser) {
    if (existingUser.password_hash) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'An account with this email address already exists'
      )
    }

    // Account exists via Google or staff pre-registration but hasn't set a password yet
    const passwordHash = await hashPassword(input.password)
    await db
      .prepare('UPDATE users SET password_hash = ?, name = COALESCE(?, name), updated_at = ? WHERE id = ?')
      .bind(passwordHash, name, now, existingUser.id)
      .run()

    existingUser.password_hash = passwordHash
    existingUser.name = existingUser.name || name
    existingUser.updated_at = now
    return existingUser
  }

  const passwordHash = await hashPassword(input.password)
  const newUserId = generateId()

  const newUser: User = {
    id: newUserId,
    google_sub: null,
    email,
    password_hash: passwordHash,
    name,
    avatar_url: null,
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
        id, google_sub, email, password_hash, name, avatar_url, phone, is_student,
        institution_name, institution_id, student_fields_locked, role,
        can_review_payments, is_active, profile_completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      newUser.id,
      newUser.google_sub,
      newUser.email,
      newUser.password_hash,
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

  // Link pending team invitations
  await db
    .prepare('UPDATE team_members SET user_id = ? WHERE invited_email = ? AND user_id IS NULL')
    .bind(newUser.id, email)
    .run()

  return newUser
}

/**
 * Authenticate a user with email and password.
 */
export async function loginWithPassword(
  db: D1Database,
  input: LoginInput,
  _now = Date.now()
): Promise<User> {
  const email = normalizeEmail(input.email)

  if (!email || !input.password) {
    throw new AppError(400, 'INVALID_CREDENTIALS', 'Email and password are required')
  }

  const user = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>()

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  if (user.is_active === 0) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'User account is deactivated')
  }

  if (!user.password_hash) {
    throw new AppError(
      401,
      'PASSWORD_NOT_SET',
      'No password has been set for this account. Please sign in with Google.'
    )
  }

  const isValid = await verifyPassword(input.password, user.password_hash)
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  return user
}

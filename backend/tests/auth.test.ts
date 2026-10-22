import { describe, it, expect, vi } from 'vitest'
import { SignJWT } from 'jose'
import { verifyGoogleIdToken } from '../src/services/google-auth.service'
import {
  hashSessionToken,
  generateRawSessionToken,
  createSession,
  validateSession,
  revokeSession,
} from '../src/services/session.service'
import { resolveOrCreateGoogleUser, preRegisterStaff, generateNextUserId } from '../src/services/user.service'
import { AppError } from '../src/common/errors'
import type { User } from '../src/types'

const TEST_KEY = new TextEncoder().encode('test-secret-key-that-is-at-least-32-bytes!')
const CLIENT_ID = 'test-client-id.apps.googleusercontent.com'

async function makeToken(claims: {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  aud?: string
  iss?: string
  exp?: string | number
}) {
  const jwt = new SignJWT({
    email: claims.email ?? 'user@example.com',
    email_verified: claims.email_verified ?? true,
    name: claims.name ?? 'Test User',
    picture: claims.picture,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub ?? 'google-sub-123')
    .setAudience(claims.aud ?? CLIENT_ID)
    .setIssuer(claims.iss ?? 'https://accounts.google.com')

  if (claims.exp !== undefined) {
    jwt.setExpirationTime(claims.exp)
  } else {
    jwt.setExpirationTime('1h')
  }

  return await jwt.sign(TEST_KEY)
}

describe('Google ID Token Verification', () => {
  it('successfully verifies valid Google ID token with expected claims', async () => {
    const token = await makeToken({
      sub: 'sub-456',
      email: 'John.Doe@Example.COM',
      name: 'John Doe',
      picture: 'https://example.com/avatar.jpg',
    })

    const payload = await verifyGoogleIdToken({
      idToken: token,
      expectedClientId: CLIENT_ID,
      testSecretKey: TEST_KEY,
    })

    expect(payload.sub).toBe('sub-456')
    expect(payload.email).toBe('john.doe@example.com')
    expect(payload.name).toBe('John Doe')
    expect(payload.avatarUrl).toBe('https://example.com/avatar.jpg')
  })

  it('rejects expired Google token with SESSION_EXPIRED', async () => {
    const expiredToken = await makeToken({ exp: '-10s' })

    await expect(
      verifyGoogleIdToken({
        idToken: expiredToken,
        expectedClientId: CLIENT_ID,
        testSecretKey: TEST_KEY,
      })
    ).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
      status: 401,
    })
  })

  it('rejects unverified Google email', async () => {
    const unverifiedToken = await makeToken({ email_verified: false })

    await expect(
      verifyGoogleIdToken({
        idToken: unverifiedToken,
        expectedClientId: CLIENT_ID,
        testSecretKey: TEST_KEY,
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Google email is not verified',
    })
  })

  it('rejects wrong audience', async () => {
    const token = await makeToken({ aud: 'wrong-client-id' })

    await expect(
      verifyGoogleIdToken({
        idToken: token,
        expectedClientId: CLIENT_ID,
        testSecretKey: TEST_KEY,
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    })
  })

  it('rejects wrong issuer', async () => {
    const token = await makeToken({ iss: 'https://evil-issuer.com' })

    await expect(
      verifyGoogleIdToken({
        idToken: token,
        expectedClientId: CLIENT_ID,
        testSecretKey: TEST_KEY,
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    })
  })
})

describe('Session Token & Cookie Management', () => {
  it('generates 32-byte opaque tokens and hashes them for storage', async () => {
    const raw = generateRawSessionToken()
    expect(raw).toHaveLength(64) // 32 bytes hex encoded

    const hash = await hashSessionToken(raw)
    expect(hash).toHaveLength(64)
    expect(hash).not.toBe(raw) // Storage hash must differ from raw token
  })

  it('creates session with __Host-session cookie flags', async () => {
    const user: User = {
      id: 'user-1',
      google_sub: 'sub-1',
      email: 'user@example.com',
      name: 'User One',
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
      created_at: 1000,
      updated_at: 1000,
    }

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn().mockResolvedValue({}),
        })),
      })),
    } as unknown as D1Database

    const res = await createSession(
      mockDb,
      user,
      {
        PARTICIPANT_SESSION_TTL_MS: 3600000,
      } as any,
      { now: 1000 }
    )

    expect(res.rawToken).toBeDefined()
    expect(res.session.id).not.toBe(res.rawToken)
    expect(res.cookieHeader).toContain('__Host-session=')
    expect(res.cookieHeader).toContain('HttpOnly')
    expect(res.cookieHeader).toContain('Secure')
    expect(res.cookieHeader).toContain('SameSite=Lax')
    expect(res.cookieHeader).toContain('Path=/')
  })
})

describe('Account Resolution & Conflict Rules', () => {
  it('creates new PARTICIPANT for unknown Google account', async () => {
    const rows: Record<string, any> = {}

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn(async () => {
            if (sql.includes('google_sub = ?')) return rows[args[0]] || null
            if (sql.includes('email = ?')) return rows[args[0]] || null
            return null
          }),
          run: vi.fn(async () => {
            if (sql.includes('INSERT INTO users')) {
              rows[args[1]] = { id: args[0], email: args[2], role: args[10], is_active: 1 }
            }
            return { meta: { changes: 1 } }
          }),
        })),
      })),
    } as unknown as D1Database

    const user = await resolveOrCreateGoogleUser(
      mockDb,
      {
        sub: 'sub-new',
        email: 'newbie@example.com',
        name: 'New User',
        avatarUrl: null,
      },
      2000
    )

    expect(user.role).toBe('PARTICIPANT')
    expect(user.email).toBe('newbie@example.com')
    expect(user.google_sub).toBe('sub-new')
    expect(user.id).toBe('TX260001')
  })

  it('links pre-registered staff by email and preserves role', async () => {
    const staffRow: User = {
      id: 'staff-1',
      google_sub: null, // pre-registered without google_sub
      email: 'lead@example.com',
      name: 'Event Lead',
      avatar_url: null,
      phone: null,
      is_student: 0,
      institution_name: null,
      institution_id: null,
      student_fields_locked: 0,
      role: 'LEAD',
      can_review_payments: 0,
      is_active: 1,
      profile_completed_at: null,
      created_at: 1000,
      updated_at: 1000,
    }

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn(async () => {
            if (sql.includes('google_sub = ?')) return null
            if (sql.includes('email = ?')) return staffRow
            return null
          }),
          run: vi.fn(async () => ({ meta: { changes: 1 } })),
        })),
      })),
    } as unknown as D1Database

    const resolved = await resolveOrCreateGoogleUser(
      mockDb,
      {
        sub: 'sub-lead-999',
        email: 'lead@example.com',
        name: 'Event Lead',
        avatarUrl: 'https://avatar.png',
      },
      3000
    )

    expect(resolved.role).toBe('LEAD')
    expect(resolved.google_sub).toBe('sub-lead-999')
  })

  it('rejects conflicting Google sub for an existing email', async () => {
    const existingUser: User = {
      id: 'user-conflicted',
      google_sub: 'existing-google-sub', // already linked to another sub!
      email: 'target@example.com',
      name: 'Target User',
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
      created_at: 1000,
      updated_at: 1000,
    }

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => {
            if (sql.includes('google_sub = ?')) return null
            if (sql.includes('email = ?')) return existingUser
            return null
          }),
          run: vi.fn(),
        })),
      })),
    } as unknown as D1Database

    await expect(
      resolveOrCreateGoogleUser(
        mockDb,
        {
          sub: 'different-sub-attempted',
          email: 'target@example.com',
          name: 'Hacker',
          avatarUrl: null,
        },
        4000
      )
    ).rejects.toMatchObject({
      status: 409,
      code: 'ACCOUNT_CONFLICT',
    })
  })

  it('rejects deactivated account with ACCOUNT_DISABLED (403)', async () => {
    const disabledUser: User = {
      id: 'disabled-user',
      google_sub: 'sub-disabled',
      email: 'banned@example.com',
      name: 'Banned User',
      avatar_url: null,
      phone: null,
      is_student: 0,
      institution_name: null,
      institution_id: null,
      student_fields_locked: 0,
      role: 'PARTICIPANT',
      can_review_payments: 0,
      is_active: 0, // deactivated!
      profile_completed_at: null,
      created_at: 1000,
      updated_at: 1000,
    }

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => disabledUser),
        })),
      })),
    } as unknown as D1Database

    await expect(
      resolveOrCreateGoogleUser(
        mockDb,
        {
          sub: 'sub-disabled',
          email: 'banned@example.com',
          name: 'Banned User',
          avatarUrl: null,
        },
        5000
      )
    ).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_DISABLED',
    })
  })

  describe('Sequential TX26XXXX User ID Generator', () => {
    it('starts with TX260001 when no existing TX26 users exist', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(null),
          })),
          first: vi.fn().mockResolvedValue(null),
        })),
      } as unknown as D1Database

      const id = await generateNextUserId(mockDb)
      expect(id).toBe('TX260001')
    })

    it('increments sequentially from the highest existing TX26 ID', async () => {
      const mockDb = {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockImplementation(async () => {
              if (sql.includes("WHERE id LIKE 'TX26%'")) {
                return { id: 'TX260042' }
              }
              return null
            }),
          })),
          first: vi.fn().mockImplementation(async () => {
            if (sql.includes("WHERE id LIKE 'TX26%'")) {
              return { id: 'TX260042' }
            }
            return null
          }),
        })),
      } as unknown as D1Database

      const id = await generateNextUserId(mockDb)
      expect(id).toBe('TX260043')
    })
  })
})

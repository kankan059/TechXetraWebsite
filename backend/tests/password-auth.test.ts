import { describe, it, expect, vi } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  registerWithPassword,
  loginWithPassword,
} from '../src/services/password.service'
import type { User } from '../src/types'

describe('Password Hashing & Verification (Web Crypto PBKDF2)', () => {
  it('hashes password and verifies successfully', async () => {
    const raw = 'SuperSecureP@ssword123!'
    const hashed = await hashPassword(raw)

    expect(hashed).toMatch(/^pbkdf2:sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/)

    const valid = await verifyPassword(raw, hashed)
    expect(valid).toBe(true)

    const invalid = await verifyPassword('WrongPassword123!', hashed)
    expect(invalid).toBe(false)
  })

  it('rejects invalid or corrupted hash formats gracefully', async () => {
    expect(await verifyPassword('password', '')).toBe(false)
    expect(await verifyPassword('password', 'invalid-hash-string')).toBe(false)
    expect(await verifyPassword('password', 'pbkdf2:sha1:1000:salt:hash')).toBe(false)
  })
})

describe('Password Registration Service', () => {
  it('successfully registers a new participant user', async () => {
    const rows: Record<string, any> = {}

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn(async () => {
            if (sql.includes('SELECT * FROM users WHERE email = ?')) {
              return rows[args[0]] || null
            }
            return null
          }),
          run: vi.fn(async () => {
            if (sql.includes('INSERT INTO users')) {
              rows[args[2]] = {
                id: args[0],
                google_sub: args[1],
                email: args[2],
                password_hash: args[3],
                name: args[4],
                role: args[11],
                is_active: args[13],
              }
            }
            return { meta: { changes: 1 } }
          }),
        })),
      })),
    } as unknown as D1Database

    const user = await registerWithPassword(
      mockDb,
      {
        email: 'Participant@Fest.com',
        password: 'Password@123',
        name: 'Fest Attendee',
      },
      1700000000000
    )

    expect(user.email).toBe('participant@fest.com')
    expect(user.role).toBe('PARTICIPANT')
    expect(user.name).toBe('Fest Attendee')
    expect(user.password_hash).toBeDefined()
    expect(user.google_sub).toBeNull()
    expect(user.id).toBe('TX260001')
  })

  it('throws 409 if user already exists with password_hash', async () => {
    const existingUser: Partial<User> = {
      id: 'existing-id',
      email: 'attendee@fest.com',
      password_hash: 'pbkdf2:sha256:100000:some-salt:some-hash',
    }

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(existingUser),
        })),
      })),
    } as unknown as D1Database

    await expect(
      registerWithPassword(mockDb, {
        email: 'attendee@fest.com',
        password: 'NewPassword@123',
        name: 'Attendee',
      })
    ).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_EXISTS',
      status: 409,
    })
  })

  it('throws 400 for passwords shorter than 8 characters', async () => {
    const mockDb = {} as unknown as D1Database

    await expect(
      registerWithPassword(mockDb, {
        email: 'attendee@fest.com',
        password: 'short',
        name: 'Attendee',
      })
    ).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
      status: 400,
    })
  })
})

describe('Password Login Service', () => {
  it('successfully authenticates with correct credentials', async () => {
    const rawPassword = 'ValidPassword@123'
    const passwordHash = await hashPassword(rawPassword)

    const userInDb: User = {
      id: 'user-123',
      google_sub: null,
      email: 'user@fest.com',
      password_hash: passwordHash,
      name: 'User Fest',
      avatar_url: null,
      phone: null,
      is_student: 1,
      institution_name: 'Tezpur University',
      institution_id: 'TU-001',
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
          first: vi.fn().mockResolvedValue(userInDb),
        })),
      })),
    } as unknown as D1Database

    const loggedIn = await loginWithPassword(mockDb, {
      email: 'USER@fest.com', // Test case insensitivity
      password: rawPassword,
    })

    expect(loggedIn.id).toBe('user-123')
    expect(loggedIn.email).toBe('user@fest.com')
  })

  it('throws 401 for incorrect password', async () => {
    const passwordHash = await hashPassword('CorrectPassword@123')

    const userInDb: Partial<User> = {
      id: 'user-123',
      email: 'user@fest.com',
      password_hash: passwordHash,
      is_active: 1,
    }

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(userInDb),
        })),
      })),
    } as unknown as D1Database

    await expect(
      loginWithPassword(mockDb, {
        email: 'user@fest.com',
        password: 'WrongPassword@123',
      })
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })
  })

  it('throws 401 if user has no password set (e.g. Google-only account)', async () => {
    const userInDb: Partial<User> = {
      id: 'google-user',
      email: 'google@fest.com',
      password_hash: null,
      google_sub: 'google-sub-xyz',
      is_active: 1,
    }

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(userInDb),
        })),
      })),
    } as unknown as D1Database

    await expect(
      loginWithPassword(mockDb, {
        email: 'google@fest.com',
        password: 'AnyPassword@123',
      })
    ).rejects.toMatchObject({
      code: 'PASSWORD_NOT_SET',
      status: 401,
    })
  })

  it('throws 403 if account is deactivated', async () => {
    const userInDb: Partial<User> = {
      id: 'disabled-user',
      email: 'disabled@fest.com',
      password_hash: 'pbkdf2:...',
      is_active: 0,
    }

    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(userInDb),
        })),
      })),
    } as unknown as D1Database

    await expect(
      loginWithPassword(mockDb, {
        email: 'disabled@fest.com',
        password: 'AnyPassword@123',
      })
    ).rejects.toMatchObject({
      code: 'ACCOUNT_DISABLED',
      status: 403,
    })
  })
})

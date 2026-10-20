import { describe, it, expect } from 'vitest'
import { createApp } from '../src/app'
import {
  normalizePhoneNumber,
  normalizeTransactionId,
  normalizeEmail,
  rupeesToPaise,
  paiseToRupees,
  formatPaise,
  encodeCursor,
  decodeCursor,
} from '../src/common/utils'
import { mapDatabaseError } from '../src/db/constraints'
import { AppError } from '../src/common/errors'

const mockEnv = {
  DB: {} as D1Database,
  ENVIRONMENT: 'test',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  FRONTEND_ORIGIN: 'http://localhost:3000',
  TICKET_HMAC_SECRET: 'test-hmac-secret-at-least-32-chars-long!',
  UPI_VPA: 'techxetra@upi',
  UPI_PAYEE_NAME: 'TechXetra',
}

describe('Foundation & Middleware', () => {
  const app = createApp()

  it('generates and propagates X-Request-Id header', async () => {
    const res = await app.request('/health', { method: 'GET' }, mockEnv)
    expect(res.status).toBe(200)

    const requestId = res.headers.get('X-Request-Id')
    expect(requestId).toBeDefined()
    expect(requestId?.length).toBeGreaterThan(8)

    const body = (await res.json()) as any
    expect(body.success).toBe(true)
    expect(body.request_id).toBe(requestId)
  })

  it('preserves valid incoming X-Request-Id', async () => {
    const customId = 'client-custom-req-12345'
    const res = await app.request(
      '/health',
      {
        method: 'GET',
        headers: { 'X-Request-Id': customId },
      },
      mockEnv
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Request-Id')).toBe(customId)

    const body = (await res.json()) as any
    expect(body.request_id).toBe(customId)
  })

  it('sets secure security headers', async () => {
    const res = await app.request('/health', { method: 'GET' }, mockEnv)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('Content-Security-Policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'"
    )
  })

  it('handles CORS for matching origin', async () => {
    const res = await app.request(
      '/health',
      {
        method: 'GET',
        headers: { Origin: 'http://localhost:3000' },
      },
      mockEnv
    )
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('rejects CORS headers for mismatched origin', async () => {
    const res = await app.request(
      '/health',
      {
        method: 'GET',
        headers: { Origin: 'http://evil-attacker.com' },
      },
      mockEnv
    )
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('rejects mutation requests from invalid origin (CSRF prevention)', async () => {
    const res = await app.request(
      '/api/test-mutation',
      {
        method: 'POST',
        headers: { Origin: 'http://evil-attacker.com' },
      },
      mockEnv
    )
    expect(res.status).toBe(403)
    const body = (await res.json()) as any
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CSRF_ORIGIN_INVALID')
  })

  it('returns stable 404 envelope on unknown routes', async () => {
    const res = await app.request('/unknown-endpoint', { method: 'GET' }, mockEnv)
    expect(res.status).toBe(404)
    const body = (await res.json()) as any
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ROUTE_NOT_FOUND')
    expect(body.request_id).toBeDefined()
  })
})

describe('Utility Helpers', () => {
  it('normalizes Indian phone numbers correctly', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('9876543210')
    expect(normalizePhoneNumber('+919876543210')).toBe('9876543210')
    expect(normalizePhoneNumber('+91 98765 43210')).toBe('9876543210')
    expect(normalizePhoneNumber('09876543210')).toBe('9876543210')

    expect(() => normalizePhoneNumber('12345')).toThrow(AppError)
    expect(() => normalizePhoneNumber('5876543210')).toThrow(AppError) // doesn't start with 6-9
    expect(() => normalizePhoneNumber('abcdefghij')).toThrow(AppError)
  })

  it('normalizes transaction IDs / UTRs', () => {
    expect(normalizeTransactionId(' utr12345678 ')).toBe('UTR12345678')
    expect(normalizeTransactionId('upi-1234 5678 9012'.replace('-', ''))).toBe('UPI123456789012')
    expect(() => normalizeTransactionId('short')).toThrow(AppError) // < 8 chars
  })

  it('normalizes emails', () => {
    expect(normalizeEmail('  TEST@Example.Com ')).toBe('test@example.com')
  })

  it('converts money between rupees and integer paise accurately', () => {
    expect(rupeesToPaise(150)).toBe(15000)
    expect(rupeesToPaise(150.5)).toBe(15050)
    expect(rupeesToPaise('299.99')).toBe(29999)
    expect(paiseToRupees(15050)).toBe('150.50')
    expect(formatPaise(15000)).toBe('₹150')
    expect(formatPaise(15050)).toBe('₹150.50')
  })

  it('encodes and decodes cursor pagination tokens', () => {
    const payload = { id: 'item-123', sortValue: 1700000000 }
    const cursor = encodeCursor(payload)
    expect(typeof cursor).toBe('string')

    const decoded = decodeCursor(cursor)
    expect(decoded).toEqual(payload)
  })
})

describe('Database Error & Constraint Mapping', () => {
  it('maps _guard failures to GUARD_VIOLATION (409)', () => {
    const err = new Error('D1_ERROR: CHECK constraint failed: _guard')
    const mapped = mapDatabaseError(err)
    expect(mapped).not.toBeNull()
    expect(mapped?.status).toBe(409)
    expect(mapped?.code).toBe('GUARD_VIOLATION')
  })

  it('maps ck_events_capacity to CAPACITY_FULL (409)', () => {
    const err = new Error('D1_ERROR: CHECK constraint failed: ck_events_capacity')
    const mapped = mapDatabaseError(err)
    expect(mapped?.status).toBe(409)
    expect(mapped?.code).toBe('CAPACITY_FULL')
  })

  it('maps ux_teams_event_name_active to TEAM_NAME_TAKEN (409)', () => {
    const err = new Error('D1_ERROR: UNIQUE constraint failed: ux_teams_event_name_active')
    const mapped = mapDatabaseError(err)
    expect(mapped?.status).toBe(409)
    expect(mapped?.code).toBe('TEAM_NAME_TAKEN')
  })

  it('maps ux_payments_active_utr to UTR_ALREADY_USED (409)', () => {
    const err = new Error('D1_ERROR: UNIQUE constraint failed: ux_payments_active_utr')
    const mapped = mapDatabaseError(err)
    expect(mapped?.status).toBe(409)
    expect(mapped?.code).toBe('UTR_ALREADY_USED')
  })

  it('maps append-only triggers to IMMUTABLE_RECORD (403)', () => {
    const err = new Error('D1_ERROR: audit_logs is append-only')
    const mapped = mapDatabaseError(err)
    expect(mapped?.status).toBe(403)
    expect(mapped?.code).toBe('IMMUTABLE_RECORD')
  })
})

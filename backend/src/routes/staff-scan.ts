import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth } from '../middleware/auth'
import { lookupScan, admitScan, denyScan } from '../services/scan.service'
import { jsonSuccess } from '../common/response'
import { AppError } from '../common/errors'

export const staffScanRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

// Staff authentication required for all scan routes
staffScanRoutes.use('*', requireAuth())

// Simple sliding window rate limit for scanners (e.g. max 120 scans per minute)
const scanRateTracker = new Map<string, { count: number; resetAt: number }>()

function checkScanRateLimit(scannerId: string, now: number) {
  const windowMs = 60 * 1000
  const maxRequests = 120

  const current = scanRateTracker.get(scannerId)
  if (!current || now > current.resetAt) {
    scanRateTracker.set(scannerId, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= maxRequests) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many scan requests. Please wait a moment.')
  }

  current.count++
}

const LookupSchema = z
  .object({
    token: z.string().min(5).max(300),
    context: z.enum(['GATE', 'EVENT']),
    event_id: z.string().optional(),
  })
  .strict()

const AdmitSchema = z
  .object({
    token: z.string().min(5).max(300),
    context: z.enum(['GATE', 'EVENT']),
    event_id: z.string().optional(),
    student_id_checked: z.boolean().optional(),
    client_scan_id: z.string().max(100).optional(),
  })
  .strict()

const DenySchema = z
  .object({
    token: z.string().min(5).max(300),
    context: z.enum(['GATE', 'EVENT']),
    event_id: z.string().optional(),
    reason: z.string().min(2).max(250),
    client_scan_id: z.string().max(100).optional(),
    student_id_checked: z.boolean().optional(),
  })
  .strict()

/**
 * POST /api/staff/scan/lookup
 * Read-only lookup of ticket status and validity before admission.
 */
staffScanRoutes.post('/lookup', async (c) => {
  const scanner = c.get('user')!
  const now = c.get('now') || Date.now()
  checkScanRateLimit(scanner.id, now)

  const body = await c.req.json().catch(() => ({}))
  const validated = LookupSchema.parse(body)

  const result = await lookupScan(c.env.DB, scanner, validated, c.env, now)
  return jsonSuccess(c, result)
})

/**
 * POST /api/staff/scan/admit
 * Admits ticket at gate or event.
 * Enforces atomic single-use check-in for events and physical student ID confirmation.
 */
staffScanRoutes.post('/admit', async (c) => {
  const scanner = c.get('user')!
  const now = c.get('now') || Date.now()
  checkScanRateLimit(scanner.id, now)

  const body = await c.req.json().catch(() => ({}))
  const validated = AdmitSchema.parse(body)

  const result = await admitScan(c.env.DB, scanner, validated, c.env, now)
  return jsonSuccess(c, result)
})

/**
 * POST /api/staff/scan/deny
 * Records a denial log with bounded reason.
 */
staffScanRoutes.post('/deny', async (c) => {
  const scanner = c.get('user')!
  const now = c.get('now') || Date.now()
  checkScanRateLimit(scanner.id, now)

  const body = await c.req.json().catch(() => ({}))
  const validated = DenySchema.parse(body)

  const result = await denyScan(c.env.DB, scanner, validated, c.env, now)
  return jsonSuccess(c, result)
})

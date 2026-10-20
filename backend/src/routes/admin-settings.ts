import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireSuperAdminOnly } from '../middleware/auth'
import {
  getAllSettings,
  updateSettings,
  getAllFestDays,
  updateFestDay,
} from '../services/settings.service'
import { executeBatch } from '../db/batch'
import { createAuditStatement } from '../services/audit.service'
import { jsonSuccess } from '../common/response'

export const adminSettingsRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminSettingsRoutes.use('*', requireAuth(), requireSuperAdminOnly())

adminSettingsRoutes.get('/settings', async (c) => {
  const settings = await getAllSettings(c.env.DB)
  return jsonSuccess(c, settings)
})

const UpdateSettingsSchema = z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one setting key must be provided',
})

adminSettingsRoutes.patch('/settings', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const validated = UpdateSettingsSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await updateSettings(c.env.DB, validated, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, updated)
})

adminSettingsRoutes.get('/fest-days', async (c) => {
  const festDays = await getAllFestDays(c.env.DB)
  return jsonSuccess(c, festDays)
})

const UpdateFestDaySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    starts_at: z.number().int().optional(),
    ends_at: z.number().int().optional(),
    description: z.string().max(200).nullable().optional(),
  })
  .strict()

adminSettingsRoutes.patch('/fest-days/:dayNumber', async (c) => {
  const user = c.get('user')!
  const dayNumber = parseInt(c.req.param('dayNumber'), 10)
  const body = await c.req.json().catch(() => ({}))
  const validated = UpdateFestDaySchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await updateFestDay(c.env.DB, dayNumber, validated, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, updated)
})

// Gate staff endpoints
const GateStaffSchema = z
  .object({
    user_id: z.string().min(1),
  })
  .strict()

adminSettingsRoutes.post('/gate-staff', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const parsed = GateStaffSchema.parse(body)
  const now = c.get('now') || Date.now()

  const insertStmt = c.env.DB.prepare(
    `INSERT INTO gate_staff (user_id, assigned_at, assigned_by)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       assigned_at = excluded.assigned_at,
       assigned_by = excluded.assigned_by`
  ).bind(parsed.user_id, now, user.id)

  const auditStmt = createAuditStatement(c.env.DB, {
    actorId: user.id,
    action: 'GATE_STAFF_ASSIGNED',
    targetType: 'GATE_STAFF',
    targetId: parsed.user_id,
    now,
  })

  await executeBatch(c.env.DB, [insertStmt, auditStmt])

  return jsonSuccess(c, { assigned: true, user_id: parsed.user_id }, 201)
})

adminSettingsRoutes.delete('/gate-staff/:userId', async (c) => {
  const user = c.get('user')!
  const targetUserId = c.req.param('userId')
  const now = c.get('now') || Date.now()

  const deleteStmt = c.env.DB.prepare('DELETE FROM gate_staff WHERE user_id = ?').bind(targetUserId)

  const auditStmt = createAuditStatement(c.env.DB, {
    actorId: user.id,
    action: 'GATE_STAFF_REMOVED',
    targetType: 'GATE_STAFF',
    targetId: targetUserId,
    now,
  })

  await executeBatch(c.env.DB, [deleteStmt, auditStmt])

  return jsonSuccess(c, { removed: true })
})

adminSettingsRoutes.get('/gate-staff', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT gs.assigned_at, u.id as user_id, u.name, u.email
     FROM gate_staff gs
     JOIN users u ON gs.user_id = u.id`
  ).all()

  return jsonSuccess(c, rows.results || [])
})

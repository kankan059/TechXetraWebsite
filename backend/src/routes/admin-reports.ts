import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth, requireSuperAdminOnly } from '../middleware/auth'
import {
  getSalesReport,
  getPendingVerificationReport,
  getEventRegistrationsReport,
  getSeatReconciliationReport,
  fixEventSeatsReconciliation,
  getAttendanceReport,
  getFailedFulfillmentReport,
  getStudentTierReport,
  getDuplicateInstitutionsReport,
} from '../services/report.service'
import { jsonSuccess } from '../common/response'

export const adminReportRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

adminReportRoutes.use('*', requireAuth(), requireSuperAdminOnly())

adminReportRoutes.get('/sales', async (c) => {
  const report = await getSalesReport(c.env.DB)
  return jsonSuccess(c, report)
})

adminReportRoutes.get('/pending-verification', async (c) => {
  const now = c.get('now') || Date.now()
  const report = await getPendingVerificationReport(c.env.DB, now)
  return jsonSuccess(c, report)
})

adminReportRoutes.get('/registrations', async (c) => {
  const report = await getEventRegistrationsReport(c.env.DB)
  return jsonSuccess(c, report)
})

adminReportRoutes.get('/reconciliation', async (c) => {
  const report = await getSeatReconciliationReport(c.env.DB)
  return jsonSuccess(c, report)
})

adminReportRoutes.post('/reconciliation/:id/fix', async (c) => {
  const actor = c.get('user')!
  const eventId = c.req.param('id')
  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await fixEventSeatsReconciliation(c.env.DB, eventId, actor, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, result)
})

adminReportRoutes.get('/attendance', async (c) => {
  const report = await getAttendanceReport(c.env.DB)
  return jsonSuccess(c, report)
})

adminReportRoutes.get('/failed-fulfillment', async (c) => {
  const report = await getFailedFulfillmentReport(c.env.DB)
  return jsonSuccess(c, report)
})

adminReportRoutes.get('/student-tier', async (c) => {
  const report = await getStudentTierReport(c.env.DB)
  return jsonSuccess(c, report)
})

adminReportRoutes.get('/duplicate-institutions', async (c) => {
  const report = await getDuplicateInstitutionsReport(c.env.DB)
  return jsonSuccess(c, report)
})

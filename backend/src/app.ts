import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from './types/env'
import { requestIdMiddleware } from './middleware/request-id'
import { corsMiddleware } from './middleware/cors'
import { securityHeadersMiddleware, mutationOriginMiddleware } from './middleware/security'
import { globalErrorHandler, notFoundHandler } from './middleware/error-handler'
import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { meRoutes } from './routes/me'
import { adminUserRoutes } from './routes/admin-users'
import { eventRoutes } from './routes/events'
import { catalogRoutes } from './routes/catalog'
import { adminEventRoutes } from './routes/admin-events'
import { adminSettingsRoutes } from './routes/admin-settings'
import { teamRoutes } from './routes/teams'
import { teamInviteRoutes } from './routes/team-invites'
import { purchaseRoutes } from './routes/purchases'
import { registrationRoutes } from './routes/registrations'
import { paymentRoutes } from './routes/payments'
import { adminPaymentRoutes } from './routes/admin-payments'
import { ticketRoutes } from './routes/tickets'
import { adminPurchaseRoutes } from './routes/admin-purchases'
import { adminTicketRoutes } from './routes/admin-tickets'
import { adminRegistrationRoutes } from './routes/admin-registrations'
import { adminReportRoutes } from './routes/admin-reports'
import { adminAuditRoutes } from './routes/admin-audit'
import { staffScanRoutes } from './routes/staff-scan'
import { leaderboardRoutes } from './routes/leaderboards'
import { staffEsportsRoutes } from './routes/staff-esports'

export function createApp(): Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}> {
  const app = new Hono<{
    Bindings: CloudflareBindings
    Variables: AppVariables
  }>()

  // Core global middlewares in order
  app.use('*', requestIdMiddleware())
  app.use('*', corsMiddleware())
  app.use('*', securityHeadersMiddleware())
  app.use('*', mutationOriginMiddleware())

  // Health and readiness
  app.route('/', healthRoutes)
  app.route('/api', healthRoutes)

  // Public catalog, events, and leaderboards
  app.route('/api/catalog', catalogRoutes)
  app.route('/api/events', eventRoutes)
  app.route('/api/leaderboards', leaderboardRoutes)

  // Auth, profile, and user views
  app.route('/api/auth', authRoutes)
  app.route('/api/me', meRoutes)

  // Teams and invitations
  app.route('/api/teams', teamRoutes)
  app.route('/api/team-invites', teamInviteRoutes)

  // Purchases, tickets, and registrations
  app.route('/api/purchases', purchaseRoutes)
  app.route('/api/registrations', registrationRoutes)
  app.route('/api/tickets', ticketRoutes)

  // Payments (Participant)
  app.route('/api', paymentRoutes)

  // Staff scanning and scoring
  app.route('/api/staff/scan', staffScanRoutes)
  app.route('/api/staff/events', staffEsportsRoutes)

  // Admin management
  app.route('/api/admin/users', adminUserRoutes)
  app.route('/api/admin/events', adminEventRoutes)
  app.route('/api/admin/payments', adminPaymentRoutes)
  app.route('/api/admin/purchases', adminPurchaseRoutes)
  app.route('/api/admin/tickets', adminTicketRoutes)
  app.route('/api/admin/registrations', adminRegistrationRoutes)
  app.route('/api/admin/reports', adminReportRoutes)
  app.route('/api/admin/audit-logs', adminAuditRoutes)
  app.route('/api/admin', adminSettingsRoutes)

  // Error and 404 handlers
  app.notFound(notFoundHandler)
  app.onError(globalErrorHandler)

  return app
}

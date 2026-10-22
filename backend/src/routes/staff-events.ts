import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth } from '../middleware/auth'
import { assertEventStaff } from '../services/authz.service'
import { getEventByIdOrSlug, formatPublicEvent, updateEvent } from '../services/event.service'
import {
  getMyStaffEvents,
  getStaffEventDashboard,
  getStaffEventRegistrations,
  getStaffEventPayments,
  reviewStaffEventPayment,
} from '../services/staff-event.service'
import { jsonSuccess } from '../common/response'
import { AppError } from '../common/errors'

export const staffEventRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

// Staff authentication required for all routes
staffEventRoutes.use('*', requireAuth())

/**
 * GET /api/staff/events/mine
 * Returns list of events assigned to current staff user (or all events for SUPER_ADMIN).
 */
staffEventRoutes.get('/mine', async (c) => {
  const user = c.get('user')!
  const events = await getMyStaffEvents(c.env.DB, user)
  return jsonSuccess(c, events)
})

/**
 * GET /api/staff/events/:id/dashboard
 * Summary dashboard metrics and staff roster for an event.
 * Accessible to assigned Lead, Volunteer, or SuperAdmin.
 */
staffEventRoutes.get('/:id/dashboard', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')

  const event = await getEventByIdOrSlug(c.env.DB, eventId)
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  await assertEventStaff(c.env.DB, event.id, user, 'VOLUNTEER')

  const now = c.get('now') || Date.now()
  const dashboard = await getStaffEventDashboard(c.env.DB, event.id, now)
  return jsonSuccess(c, dashboard)
})

const RegistrationQuerySchema = z
  .object({
    search: z.string().max(100).optional(),
  })
  .strict()

/**
 * GET /api/staff/events/:id/registrations
 * Attendee roster with participant contact, team info, check-in status, and form responses.
 * Accessible to assigned Lead, Volunteer, or SuperAdmin.
 */
staffEventRoutes.get('/:id/registrations', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')

  const event = await getEventByIdOrSlug(c.env.DB, eventId)
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  await assertEventStaff(c.env.DB, event.id, user, 'VOLUNTEER')

  const query = c.req.query()
  const validated = RegistrationQuerySchema.parse(query)

  const roster = await getStaffEventRegistrations(c.env.DB, event.id, validated.search)
  return jsonSuccess(c, roster)
})

const PaymentQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'ON_HOLD', 'WITHDRAWN']).optional(),
  })
  .strict()

/**
 * GET /api/staff/events/:id/payments
 * Payment verification queue for orders containing this event.
 * Accessible to assigned Lead or SuperAdmin.
 */
staffEventRoutes.get('/:id/payments', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')

  const event = await getEventByIdOrSlug(c.env.DB, eventId)
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  await assertEventStaff(c.env.DB, event.id, user, 'LEAD')

  const query = c.req.query()
  const validated = PaymentQuerySchema.parse(query)

  const payments = await getStaffEventPayments(c.env.DB, event.id, validated.status)
  return jsonSuccess(c, payments)
})

const ReviewPaymentSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'HOLD']),
    reason: z.string().min(2).max(500).optional(),
  })
  .strict()

/**
 * POST /api/staff/events/:id/payments/:paymentId/review
 * Review (approve/reject/hold) an attendee payment for this event.
 * Accessible to assigned Lead or SuperAdmin.
 */
staffEventRoutes.post('/:id/payments/:paymentId/review', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')
  const paymentId = c.req.param('paymentId')

  const event = await getEventByIdOrSlug(c.env.DB, eventId)
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  await assertEventStaff(c.env.DB, event.id, user, 'LEAD')

  const body = await c.req.json().catch(() => ({}))
  const validated = ReviewPaymentSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const result = await reviewStaffEventPayment(
    c.env.DB,
    event.id,
    paymentId,
    user,
    validated.action,
    validated.reason,
    { ipAddress, userAgent, now }
  )

  return jsonSuccess(c, result)
})

const LeadUpdateEventSchema = z
  .object({
    description: z.string().max(2000).nullable().optional(),
    venue: z.string().max(200).nullable().optional(),
    metadata: z.string().nullable().optional(),
    form_schema: z.string().nullable().optional(),
    registration_closes_at: z.number().int().nullable().optional(),
  })
  .strict()

/**
 * PATCH /api/staff/events/:id
 * Lead updates allowed event details (description, venue, rules/metadata, form schema, registration deadline).
 * Accessible to assigned Lead or SuperAdmin (Volunteers forbidden).
 */
staffEventRoutes.patch('/:id', async (c) => {
  const user = c.get('user')!
  const eventId = c.req.param('id')

  const event = await getEventByIdOrSlug(c.env.DB, eventId)
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  await assertEventStaff(c.env.DB, event.id, user, 'LEAD')

  const body = await c.req.json().catch(() => ({}))
  const validated = LeadUpdateEventSchema.parse(body)

  const now = c.get('now') || Date.now()
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const updated = await updateEvent(c.env.DB, event, validated, user, {
    ipAddress,
    userAgent,
    now,
  })

  return jsonSuccess(c, formatPublicEvent(updated, now))
})

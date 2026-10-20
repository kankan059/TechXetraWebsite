import { AppError } from '../common/errors'
import type { User, UserRole } from '../types'

export function isSuperAdmin(user: User): boolean {
  return user.role === 'SUPER_ADMIN'
}

export function canReviewPayments(user: User): boolean {
  return user.role === 'SUPER_ADMIN' || user.can_review_payments === 1
}

export async function isGateStaff(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM gate_staff WHERE user_id = ?')
    .bind(userId)
    .first()
  return Boolean(row)
}

export async function isEventStaff(
  db: D1Database,
  eventId: string,
  userId: string,
  minRole?: 'LEAD' | 'VOLUNTEER'
): Promise<boolean> {
  const row = await db
    .prepare('SELECT role FROM event_staff WHERE event_id = ? AND user_id = ?')
    .bind(eventId, userId)
    .first<{ role: string }>()

  if (!row) return false
  if (!minRole) return true
  if (minRole === 'VOLUNTEER') return true
  return row.role === 'LEAD'
}

export function assertSuperAdmin(user: User): void {
  if (!isSuperAdmin(user)) {
    throw new AppError(403, 'FORBIDDEN', 'Super administrator access required')
  }
}

export function assertPaymentReviewer(user: User): void {
  if (!canReviewPayments(user)) {
    throw new AppError(403, 'FORBIDDEN', 'Payment reviewer permission required')
  }
}

export async function assertGateStaff(db: D1Database, user: User): Promise<void> {
  if (isSuperAdmin(user)) return
  const isGate = await isGateStaff(db, user.id)
  if (!isGate) {
    throw new AppError(403, 'FORBIDDEN', 'Gate staff access required')
  }
}

export async function assertEventStaff(
  db: D1Database,
  eventId: string,
  user: User,
  minRole?: 'LEAD' | 'VOLUNTEER'
): Promise<void> {
  if (isSuperAdmin(user)) return
  const isAssigned = await isEventStaff(db, eventId, user.id, minRole)
  if (!isAssigned) {
    throw new AppError(
      403,
      'FORBIDDEN',
      minRole === 'LEAD'
        ? 'Event lead access required for this event'
        : 'Event staff access required for this event'
    )
  }
}

/**
 * Asserts ownership of a private participant resource (e.g., purchase, ticket).
 * If the user does not own the resource and is not SUPER_ADMIN, hides existence by returning 404.
 */
export function assertOwnership(
  user: User,
  ownerId: string,
  resourceName = 'Resource'
): void {
  if (isSuperAdmin(user)) return
  if (user.id !== ownerId) {
    throw new AppError(404, 'NOT_FOUND', `${resourceName} not found`)
  }
}

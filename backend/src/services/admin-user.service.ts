import { AppError } from '../common/errors'
import { executeBatch } from '../db/batch'
import { createAuditStatement } from './audit.service'
import type { User, UserRole } from '../types'

export interface UpdateUserByAdminInput {
  role?: UserRole
  can_review_payments?: boolean
  is_active?: boolean
  reason?: string
}

export interface AdminUserFilters {
  search?: string
  role?: UserRole
  is_active?: boolean
  can_review_payments?: boolean
  limit?: number
  cursor?: string
}

export async function updateUserByAdmin(
  db: D1Database,
  targetUserId: string,
  input: UpdateUserByAdminInput,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<User> {
  const now = meta?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can modify users')
  }

  const targetUser = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(targetUserId)
    .first<User>()

  if (!targetUser) {
    throw new AppError(404, 'NOT_FOUND', 'User not found')
  }

  // 1. Self-modification guardrails
  if (actor.id === targetUser.id) {
    if (input.role !== undefined && input.role !== targetUser.role) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Administrators cannot modify their own role (self-promotion/demotion prohibited)'
      )
    }
    if (input.is_active === false || (input.is_active as any) === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'Administrators cannot deactivate their own account')
    }
  }

  // 2. Role compatibility
  const newRole = input.role !== undefined ? input.role : targetUser.role
  const newCanReview =
    input.can_review_payments !== undefined
      ? (input.can_review_payments ? 1 : 0)
      : targetUser.can_review_payments

  if (newRole === 'PARTICIPANT' && newCanReview === 1) {
    throw new AppError(
      400,
      'INVALID_ROLE_ASSIGNMENT',
      'Participants cannot be granted payment review permissions'
    )
  }

  const newIsActive =
    input.is_active !== undefined
      ? (input.is_active ? 1 : 0)
      : targetUser.is_active

  const statements: D1PreparedStatement[] = []

  statements.push(
    db
      .prepare(
        `UPDATE users SET
          role = ?,
          can_review_payments = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .bind(newRole, newCanReview, newIsActive, now, targetUser.id)
  )

  // 3. Deactivation revokes all active sessions immediately
  if (newIsActive === 0) {
    statements.push(
      db
        .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
        .bind(now, targetUser.id)
    )
  }

  // 4. Audit statement
  const updatedUser: User = {
    ...targetUser,
    role: newRole,
    can_review_payments: newCanReview,
    is_active: newIsActive,
    updated_at: now,
  }

  statements.push(
    createAuditStatement(db, {
      actorId: actor.id,
      action: newIsActive === 0 ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      targetType: 'USER',
      targetId: targetUser.id,
      beforeJson: {
        role: targetUser.role,
        can_review_payments: targetUser.can_review_payments,
        is_active: targetUser.is_active,
      },
      afterJson: {
        role: newRole,
        can_review_payments: newCanReview,
        is_active: newIsActive,
      },
      reason: input.reason || null,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    })
  )

  await executeBatch(db, statements)

  return updatedUser
}

export async function listAdminUsers(
  db: D1Database,
  filters: AdminUserFilters = {}
): Promise<{ users: User[]; next_cursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit || 20, 1), 100)
  const conditions: string[] = []
  const bindings: unknown[] = []

  if (filters.search) {
    const term = `%${filters.search.trim().toLowerCase()}%`
    conditions.push(
      '(lower(name) LIKE ? OR lower(email) LIKE ? OR lower(institution_name) LIKE ? OR lower(institution_id) LIKE ?)'
    )
    bindings.push(term, term, term, term)
  }

  if (filters.role) {
    conditions.push('role = ?')
    bindings.push(filters.role)
  }

  if (filters.is_active !== undefined) {
    conditions.push('is_active = ?')
    bindings.push(filters.is_active ? 1 : 0)
  }

  if (filters.can_review_payments !== undefined) {
    conditions.push('can_review_payments = ?')
    bindings.push(filters.can_review_payments ? 1 : 0)
  }

  if (filters.cursor) {
    const [cursorCreatedAtStr, cursorId] = filters.cursor.split(':')
    const cursorCreatedAt = parseInt(cursorCreatedAtStr, 10)
    if (!isNaN(cursorCreatedAt) && cursorId) {
      conditions.push('(created_at < ? OR (created_at = ? AND id < ?))')
      bindings.push(cursorCreatedAt, cursorCreatedAt, cursorId)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `
    SELECT * FROM users
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `
  bindings.push(limit + 1)

  const rows = await db.prepare(sql).bind(...bindings).all<User>()
  const items = rows.results || []

  const hasNextPage = items.length > limit
  const pagedItems = hasNextPage ? items.slice(0, limit) : items

  let nextCursor: string | null = null
  if (hasNextPage && pagedItems.length > 0) {
    const last = pagedItems[pagedItems.length - 1]
    nextCursor = `${last.created_at}:${last.id}`
  }

  // Enrich users with active event_staff assignments
  const userIds = pagedItems.map((u) => u.id)
  const staffMap: Record<string, Array<{ role: string; event_id: string; event_title: string }>> = {}
  if (userIds.length > 0) {
    const placeholders = userIds.map(() => '?').join(',')
    const staffRows = await db
      .prepare(
        `SELECT es.user_id, es.role, e.id as event_id, e.title as event_title
         FROM event_staff es
         JOIN events e ON es.event_id = e.id
         WHERE es.user_id IN (${placeholders})`
      )
      .bind(...userIds)
      .all<any>()
    for (const row of staffRows.results || []) {
      if (!staffMap[row.user_id]) staffMap[row.user_id] = []
      staffMap[row.user_id].push({
        role: row.role,
        event_id: row.event_id,
        event_title: row.event_title,
      })
    }
  }

  const enrichedUsers = pagedItems.map((u) => ({
    ...u,
    event_staff_assignments: staffMap[u.id] || [],
  }))

  return { users: enrichedUsers, next_cursor: nextCursor }
}

export async function getAdminUserDetail(
  db: D1Database,
  userId: string
): Promise<any> {
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>()

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found')
  }

  const staffAssignments = await db
    .prepare(
      `SELECT es.role, es.assigned_at, e.id as event_id, e.title as event_title, e.category as event_category
       FROM event_staff es
       JOIN events e ON es.event_id = e.id
       WHERE es.user_id = ?`
    )
    .bind(userId)
    .all<any>()

  const gateAssignment = await db
    .prepare('SELECT assigned_at FROM gate_staff WHERE user_id = ?')
    .bind(userId)
    .first<any>()

  const activeSessions = await db
    .prepare('SELECT count(*) as count FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?')
    .bind(userId, Date.now())
    .first<{ count: number }>()

  return {
    ...user,
    event_staff_assignments: staffAssignments.results || [],
    is_gate_staff: Boolean(gateAssignment),
    active_sessions_count: activeSessions?.count || 0,
  }
}

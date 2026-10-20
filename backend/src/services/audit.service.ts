import { generateId } from '../common/utils'
import { redactSensitiveData } from '../common/logger'
import type { AuditLog } from '../types'

export interface CreateAuditEntryOptions {
  actorId?: string | null
  action: string
  targetType: string
  targetId: string
  beforeJson?: unknown
  afterJson?: unknown
  reason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  now?: number
}

/**
 * Creates an atomic D1 prepared statement to append a row to audit_logs.
 * Must be executed in the same batch as the state mutation.
 */
export function createAuditStatement(
  db: D1Database,
  options: CreateAuditEntryOptions
): D1PreparedStatement {
  const id = generateId()
  const now = options.now || Date.now()

  const safeBefore =
    options.beforeJson !== undefined
      ? JSON.stringify(redactSensitiveData(options.beforeJson))
      : null

  const safeAfter =
    options.afterJson !== undefined
      ? JSON.stringify(redactSensitiveData(options.afterJson))
      : null

  return db
    .prepare(
      `INSERT INTO audit_logs (
        id, actor_id, action, target_type, target_id, before_json, after_json,
        reason, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      options.actorId || null,
      options.action,
      options.targetType,
      options.targetId,
      safeBefore,
      safeAfter,
      options.reason || null,
      options.ipAddress || null,
      options.userAgent || null,
      now
    )
}

export interface QueryAuditLogsOptions {
  actorId?: string
  targetType?: string
  targetId?: string
  action?: string
  limit?: number
  cursor?: string
}

export interface QueryAuditLogsResult {
  logs: AuditLog[]
  next_cursor: string | null
}

export async function queryAuditLogs(
  db: D1Database,
  options: QueryAuditLogsOptions = {}
): Promise<QueryAuditLogsResult> {
  const limit = Math.min(Math.max(options.limit || 20, 1), 100)
  const conditions: string[] = []
  const bindings: unknown[] = []

  if (options.actorId) {
    conditions.push('actor_id = ?')
    bindings.push(options.actorId)
  }

  if (options.targetType) {
    conditions.push('target_type = ?')
    bindings.push(options.targetType)
  }

  if (options.targetId) {
    conditions.push('target_id = ?')
    bindings.push(options.targetId)
  }

  if (options.action) {
    conditions.push('action = ?')
    bindings.push(options.action)
  }

  if (options.cursor) {
    const [cursorCreatedAtStr, cursorId] = options.cursor.split(':')
    const cursorCreatedAt = parseInt(cursorCreatedAtStr, 10)
    if (!isNaN(cursorCreatedAt) && cursorId) {
      conditions.push('(created_at < ? OR (created_at = ? AND id < ?))')
      bindings.push(cursorCreatedAt, cursorCreatedAt, cursorId)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `
    SELECT * FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `
  bindings.push(limit + 1)

  const rows = await db.prepare(sql).bind(...bindings).all<AuditLog>()
  const items = rows.results || []

  const hasNextPage = items.length > limit
  const pagedItems = hasNextPage ? items.slice(0, limit) : items

  let nextCursor: string | null = null
  if (hasNextPage && pagedItems.length > 0) {
    const last = pagedItems[pagedItems.length - 1]
    nextCursor = `${last.created_at}:${last.id}`
  }

  return {
    logs: pagedItems,
    next_cursor: nextCursor,
  }
}


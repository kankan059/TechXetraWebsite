import { AppError } from '../common/errors'
import { executeBatch } from '../db/batch'
import { createAuditStatement } from './audit.service'
import type { FestDay, User } from '../types'

export interface SettingsMap {
  gate_pass_price_paise: number
  gate_pass_student_price_paise: number
  purchases_enabled: boolean
  student_id_warning_text: string
  support_contact: string
  [key: string]: unknown
}

export async function getAllSettings(db: D1Database): Promise<SettingsMap> {
  const rows = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
  const rawMap: Record<string, string> = {}
  for (const row of rows.results || []) {
    rawMap[row.key] = row.value
  }

  return {
    ...rawMap,
    gate_pass_price_paise: parseInt(rawMap['gate_pass_price_paise'] || '30000', 10),
    gate_pass_student_price_paise: parseInt(
      rawMap['gate_pass_student_price_paise'] || '20000',
      10
    ),
    purchases_enabled: rawMap['purchases_enabled'] === '1',
    student_id_warning_text:
      rawMap['student_id_warning_text'] ||
      'Physical student institution ID card must be presented at entry for verification.',
    support_contact: rawMap['support_contact'] || 'support@techxetra.in',
  }
}

export async function updateSettings(
  db: D1Database,
  updates: Record<string, string>,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<SettingsMap> {
  const now = meta?.now || Date.now()
  const statements: D1PreparedStatement[] = []

  for (const [key, rawVal] of Object.entries(updates)) {
    const val = String(rawVal).trim()

    if (key === 'gate_pass_price_paise' || key === 'gate_pass_student_price_paise') {
      const parsed = parseInt(val, 10)
      if (isNaN(parsed) || parsed < 0) {
        throw new AppError(400, 'VALIDATION_ERROR', `${key} must be a non-negative integer (paise)`)
      }
    } else if (key === 'purchases_enabled') {
      if (val !== '0' && val !== '1') {
        throw new AppError(400, 'VALIDATION_ERROR', 'purchases_enabled must be "0" or "1"')
      }
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO settings (key, value, updated_at, updated_by)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`
        )
        .bind(key, val, now, actor.id)
    )
  }

  const auditStmt = createAuditStatement(db, {
    actorId: actor.id,
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    targetId: 'GLOBAL',
    afterJson: updates,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  statements.push(auditStmt)

  await executeBatch(db, statements)
  return await getAllSettings(db)
}

export async function getAllFestDays(db: D1Database): Promise<FestDay[]> {
  const rows = await db
    .prepare('SELECT * FROM fest_days ORDER BY day_number ASC')
    .all<FestDay>()
  return rows.results || []
}

export interface UpdateFestDayInput {
  date?: string
  starts_at?: number
  ends_at?: number
  description?: string | null
}

export async function updateFestDay(
  db: D1Database,
  dayNumber: number,
  input: UpdateFestDayInput,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<FestDay> {
  const now = meta?.now || Date.now()
  const existing = await db
    .prepare('SELECT * FROM fest_days WHERE day_number = ?')
    .bind(dayNumber)
    .first<FestDay>()

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', `Fest day ${dayNumber} does not exist`)
  }

  const newDate = input.date ? input.date.trim() : existing.date
  const newStartsAt = input.starts_at !== undefined ? input.starts_at : existing.starts_at
  const newEndsAt = input.ends_at !== undefined ? input.ends_at : existing.ends_at
  const newDescription =
    input.description !== undefined ? input.description?.trim() || null : existing.description

  if (newStartsAt >= newEndsAt) {
    throw new AppError(400, 'VALIDATION_ERROR', 'starts_at must be strictly before ends_at')
  }

  const statements: D1PreparedStatement[] = []

  // Update fest day
  statements.push(
    db
      .prepare(
        `UPDATE fest_days SET
          date = ?, starts_at = ?, ends_at = ?, description = ?
        WHERE day_number = ?`
      )
      .bind(newDate, newStartsAt, newEndsAt, newDescription, dayNumber)
  )

  // If time window changed, update active tickets for events assigned to this day
  if (newStartsAt !== existing.starts_at || newEndsAt !== existing.ends_at) {
    statements.push(
      db
        .prepare(
          `UPDATE tickets SET
            valid_from = ?,
            valid_to = ?,
            updated_at = ?
          WHERE status = 'ACTIVE' AND event_id IN (
            SELECT id FROM events WHERE day_of_event = ?
          )`
        )
        .bind(newStartsAt, newEndsAt, now, dayNumber)
    )
  }

  const auditStmt = createAuditStatement(db, {
    actorId: actor.id,
    action: 'FEST_DAY_UPDATED',
    targetType: 'FEST_DAY',
    targetId: String(dayNumber),
    beforeJson: existing,
    afterJson: { day_number: dayNumber, date: newDate, starts_at: newStartsAt, ends_at: newEndsAt },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  statements.push(auditStmt)

  await executeBatch(db, statements)

  return {
    day_number: dayNumber as 1 | 2 | 3,
    date: newDate,
    starts_at: newStartsAt,
    ends_at: newEndsAt,
    description: newDescription,
  }
}

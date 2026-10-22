import { AppError } from '../common/errors'
import { generateId, encodeCursor, decodeCursor } from '../common/utils'
import { executeBatch } from '../db/batch'
import { createAuditStatement } from './audit.service'
import { isEventStaff } from './authz.service'
import type { Event, EventCategory, EventStatus, PriceModel, CapacityUnit, ScoringStatus, User } from '../types'

export interface PublicEventResponse {
  id: string
  slug: string
  title: string
  category: EventCategory
  description: string | null
  venue: string | null
  day_of_event: number
  starts_at: number
  ends_at: number
  registration_closes_at: number | null
  status: EventStatus
  is_team_event: boolean
  min_team_size: number
  max_team_size: number
  price_model: PriceModel
  price_paise: number
  student_price_paise: number | null
  capacity: number | null
  seats_taken: number
  seats_remaining: number | null
  capacity_unit: CapacityUnit
  registration_open: boolean
  scoring_enabled: boolean
  leaderboard_public: boolean
  metadata?: string | null
  form_schema?: string | null
}

export function formatPublicEvent(event: Event, now = Date.now()): PublicEventResponse {
  const seatsRemaining =
    event.capacity === null ? null : Math.max(0, event.capacity - event.seats_taken)

  const isRegistrationOpen =
    event.status === 'OPEN' &&
    (event.registration_closes_at === null || event.registration_closes_at > now) &&
    (event.capacity === null || event.seats_taken < event.capacity)

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: event.category,
    description: event.description,
    venue: event.venue,
    day_of_event: event.day_of_event,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    registration_closes_at: event.registration_closes_at,
    status: event.status,
    is_team_event: Boolean(event.is_team_event),
    min_team_size: event.min_team_size,
    max_team_size: event.max_team_size,
    price_model: event.price_model,
    price_paise: event.price_paise,
    student_price_paise: event.student_price_paise,
    capacity: event.capacity,
    seats_taken: event.seats_taken,
    seats_remaining: seatsRemaining,
    capacity_unit: event.capacity_unit,
    registration_open: isRegistrationOpen,
    scoring_enabled: Boolean(event.scoring_enabled),
    leaderboard_public: Boolean(event.leaderboard_public),
    metadata: event.metadata ?? null,
    form_schema: event.form_schema ?? null,
  }
}

export interface EventFilterQuery {
  category?: EventCategory
  day?: number
  is_team?: boolean
  search?: string
  cursor?: string
  limit?: number
}

export async function getPublicEvents(
  db: D1Database,
  filters: EventFilterQuery,
  now = Date.now()
): Promise<{ events: PublicEventResponse[]; next_cursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit || 20, 1), 100)
  const conditions: string[] = ["status != 'DRAFT'"]
  const bindings: any[] = []

  if (filters.category) {
    conditions.push('category = ?')
    bindings.push(filters.category)
  }

  if (filters.day !== undefined) {
    conditions.push('day_of_event = ?')
    bindings.push(filters.day)
  }

  if (filters.is_team !== undefined) {
    conditions.push('is_team_event = ?')
    bindings.push(filters.is_team ? 1 : 0)
  }

  if (filters.search) {
    const term = `%${filters.search.trim().toLowerCase()}%`
    conditions.push('(lower(title) LIKE ? OR lower(description) LIKE ?)')
    bindings.push(term, term)
  }

  if (filters.cursor) {
    const cursorData = decodeCursor(filters.cursor)
    if (cursorData && typeof cursorData.sortValue === 'number') {
      conditions.push('(starts_at > ? OR (starts_at = ? AND id > ?))')
      bindings.push(cursorData.sortValue, cursorData.sortValue, cursorData.id)
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `
    SELECT * FROM events
    ${whereClause}
    ORDER BY starts_at ASC, id ASC
    LIMIT ?
  `
  bindings.push(limit + 1)

  const rows = await db.prepare(sql).bind(...bindings).all<Event>()
  const items = rows.results || []

  const hasNextPage = items.length > limit
  const pagedItems = hasNextPage ? items.slice(0, limit) : items

  let nextCursor: string | null = null
  if (hasNextPage && pagedItems.length > 0) {
    const lastItem = pagedItems[pagedItems.length - 1]
    nextCursor = encodeCursor({ id: lastItem.id, sortValue: lastItem.starts_at })
  }

  return {
    events: pagedItems.map((e) => formatPublicEvent(e, now)),
    next_cursor: nextCursor,
  }
}

export async function getEventByIdOrSlug(
  db: D1Database,
  idOrSlug: string
): Promise<Event | null> {
  return await db
    .prepare('SELECT * FROM events WHERE id = ? OR slug = ? LIMIT 1')
    .bind(idOrSlug, idOrSlug)
    .first<Event>()
}

export interface CreateEventInput {
  slug: string
  title: string
  category: EventCategory
  description?: string | null
  venue?: string | null
  day_of_event: number
  starts_at: number
  ends_at: number
  registration_closes_at?: number | null
  status?: EventStatus
  is_team_event?: boolean
  min_team_size?: number
  max_team_size?: number
  price_model?: PriceModel
  price_paise?: number
  student_price_paise?: number | null
  capacity?: number | null
  capacity_unit?: CapacityUnit
  scoring_enabled?: boolean
  scoring_status?: ScoringStatus
  max_rounds?: number
  volunteers_can_score?: boolean
  leaderboard_public?: boolean
  metadata?: string | null
  form_schema?: string | null
}

export async function createEvent(
  db: D1Database,
  input: CreateEventInput,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<Event> {
  const now = meta?.now || Date.now()

  // Validate E_SPORTS scoring restriction
  if (input.category !== 'E_SPORTS') {
    if (
      input.scoring_enabled ||
      input.leaderboard_public ||
      (input.scoring_status && input.scoring_status !== 'NOT_APPLICABLE')
    ) {
      throw new AppError(
        400,
        'INVALID_SCORING_CATEGORY',
        'Scoring and leaderboards can only be enabled on E_SPORTS events'
      )
    }
  }

  if (input.starts_at >= input.ends_at) {
    throw new AppError(400, 'VALIDATION_ERROR', 'starts_at must be before ends_at')
  }

  const id = generateId()
  const event: Event = {
    id,
    slug: input.slug.trim().toLowerCase(),
    title: input.title.trim(),
    category: input.category,
    description: input.description?.trim() || null,
    venue: input.venue?.trim() || null,
    day_of_event: input.day_of_event,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    registration_closes_at: input.registration_closes_at || null,
    status: input.status || 'DRAFT',
    is_team_event: input.is_team_event ? 1 : 0,
    min_team_size: input.min_team_size || 1,
    max_team_size: input.max_team_size || 1,
    price_model: input.price_model || 'FREE',
    price_paise: input.price_paise || 0,
    student_price_paise: input.student_price_paise ?? null,
    capacity: input.capacity ?? null,
    seats_taken: 0,
    capacity_unit: input.capacity_unit || 'SEATS',
    scoring_enabled: input.scoring_enabled ? 1 : 0,
    scoring_status: input.scoring_status || 'NOT_APPLICABLE',
    max_rounds: input.max_rounds || 1,
    volunteers_can_score: input.volunteers_can_score ? 1 : 0,
    leaderboard_public: input.leaderboard_public ? 1 : 0,
    metadata: input.metadata?.trim() || null,
    form_schema: input.form_schema?.trim() || null,
    created_at: now,
    updated_at: now,
  }

  const insertStmt = db
    .prepare(
      `INSERT INTO events (
        id, slug, title, category, description, venue, day_of_event, starts_at,
        ends_at, registration_closes_at, status, is_team_event, min_team_size,
        max_team_size, price_model, price_paise, student_price_paise, capacity,
        seats_taken, capacity_unit, scoring_enabled, scoring_status, max_rounds,
        volunteers_can_score, leaderboard_public, metadata, form_schema, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.id,
      event.slug,
      event.title,
      event.category,
      event.description,
      event.venue,
      event.day_of_event,
      event.starts_at,
      event.ends_at,
      event.registration_closes_at,
      event.status,
      event.is_team_event,
      event.min_team_size,
      event.max_team_size,
      event.price_model,
      event.price_paise,
      event.student_price_paise,
      event.capacity,
      event.seats_taken,
      event.capacity_unit,
      event.scoring_enabled,
      event.scoring_status,
      event.max_rounds,
      event.volunteers_can_score,
      event.leaderboard_public,
      event.metadata || null,
      event.form_schema || null,
      event.created_at,
      event.updated_at
    )

  const auditStmt = createAuditStatement(db, {
    actorId: actor.id,
    action: 'EVENT_CREATED',
    targetType: 'EVENT',
    targetId: event.id,
    afterJson: event,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [insertStmt, auditStmt])

  return event
}

export interface UpdateEventInput {
  title?: string
  category?: EventCategory
  description?: string | null
  venue?: string | null
  day_of_event?: number
  starts_at?: number
  ends_at?: number
  registration_closes_at?: number | null
  status?: EventStatus
  is_team_event?: boolean
  min_team_size?: number
  max_team_size?: number
  price_model?: PriceModel
  price_paise?: number
  student_price_paise?: number | null
  capacity?: number | null
  capacity_unit?: CapacityUnit
  scoring_enabled?: boolean
  scoring_status?: ScoringStatus
  max_rounds?: number
  volunteers_can_score?: boolean
  leaderboard_public?: boolean
  metadata?: string | null
  form_schema?: string | null
}

export async function updateEvent(
  db: D1Database,
  event: Event,
  input: UpdateEventInput,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<Event> {
  const now = meta?.now || Date.now()

  // 1. Role enforcement: Lead vs SuperAdmin
  if (actor.role !== 'SUPER_ADMIN') {
    const isLead = await isEventStaff(db, event.id, actor.id, 'LEAD')
    if (!isLead) {
      throw new AppError(403, 'FORBIDDEN', 'Event lead or administrator access required')
    }

    // Lead is allowed to edit description, venue, metadata, form_schema, and registration_closes_at
    const allowedLeadKeys = new Set([
      'description',
      'venue',
      'metadata',
      'form_schema',
      'registration_closes_at',
    ])
    const disallowedKeys = Object.keys(input).filter((k) => !allowedLeadKeys.has(k))
    if (disallowedKeys.length > 0) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `Event leads may only update description, venue, rules/metadata, form fields, and registration closing time (disallowed: ${disallowedKeys.join(', ')})`
      )
    }
  }

  // 2. Capacity reduction check
  if (input.capacity !== undefined && input.capacity !== null) {
    if (input.capacity < event.seats_taken) {
      throw new AppError(
        409,
        'CAPACITY_BELOW_TAKEN',
        `Cannot reduce capacity to ${input.capacity} because ${event.seats_taken} seats are already taken`
      )
    }
  }

  // 3. Structural fields freeze check
  const structuralChanged =
    (input.is_team_event !== undefined && (input.is_team_event ? 1 : 0) !== event.is_team_event) ||
    (input.min_team_size !== undefined && input.min_team_size !== event.min_team_size) ||
    (input.max_team_size !== undefined && input.max_team_size !== event.max_team_size) ||
    (input.price_model !== undefined && input.price_model !== event.price_model) ||
    (input.capacity_unit !== undefined && input.capacity_unit !== event.capacity_unit)

  if (structuralChanged) {
    const activeRegistration = await db
      .prepare(
        "SELECT 1 FROM registrations WHERE event_id = ? AND status IN ('RESERVED', 'CONFIRMED') LIMIT 1"
      )
      .bind(event.id)
      .first()

    if (activeRegistration) {
      throw new AppError(
        409,
        'CONFLICT',
        'Cannot modify structural configuration (team, pricing, or capacity) for an event with active registrations'
      )
    }
  }

  // 4. Scoring restrictions
  const effectiveCategory = input.category || event.category
  if (effectiveCategory !== 'E_SPORTS') {
    if (
      input.scoring_enabled ||
      input.leaderboard_public ||
      (input.scoring_status && input.scoring_status !== 'NOT_APPLICABLE')
    ) {
      throw new AppError(
        400,
        'INVALID_SCORING_CATEGORY',
        'Scoring and leaderboards can only be enabled on E_SPORTS events'
      )
    }
  }

  const newDay = input.day_of_event !== undefined ? input.day_of_event : event.day_of_event
  const dayChanged = newDay !== event.day_of_event

  let newStartsAt = input.starts_at !== undefined ? input.starts_at : event.starts_at
  let newEndsAt = input.ends_at !== undefined ? input.ends_at : event.ends_at

  const statements: D1PreparedStatement[] = []

  // If day changed, fetch new fest day validity and update active tickets
  if (dayChanged) {
    const festDay = await db
      .prepare('SELECT starts_at, ends_at FROM fest_days WHERE day_number = ?')
      .bind(newDay)
      .first<{ starts_at: number; ends_at: number }>()

    if (!festDay) {
      throw new AppError(400, 'VALIDATION_ERROR', `Fest day ${newDay} does not exist`)
    }

    if (input.starts_at === undefined) newStartsAt = festDay.starts_at
    if (input.ends_at === undefined) newEndsAt = festDay.ends_at

    // Atomically update active tickets for this event
    const ticketUpdateStmt = db
      .prepare(
        `UPDATE tickets SET
          valid_from = ?,
          valid_to = ?,
          updated_at = ?
        WHERE event_id = ? AND status = 'ACTIVE'`
      )
      .bind(festDay.starts_at, festDay.ends_at, now, event.id)

    statements.push(ticketUpdateStmt)
  }

  const updatedEvent: Event = {
    ...event,
    title: input.title !== undefined ? input.title.trim() : event.title,
    category: effectiveCategory,
    description: input.description !== undefined ? input.description?.trim() || null : event.description,
    venue: input.venue !== undefined ? input.venue?.trim() || null : event.venue,
    day_of_event: newDay,
    starts_at: newStartsAt,
    ends_at: newEndsAt,
    registration_closes_at:
      input.registration_closes_at !== undefined
        ? input.registration_closes_at
        : event.registration_closes_at,
    status: input.status !== undefined ? input.status : event.status,
    is_team_event: input.is_team_event !== undefined ? (input.is_team_event ? 1 : 0) : event.is_team_event,
    min_team_size: input.min_team_size !== undefined ? input.min_team_size : event.min_team_size,
    max_team_size: input.max_team_size !== undefined ? input.max_team_size : event.max_team_size,
    price_model: input.price_model !== undefined ? input.price_model : event.price_model,
    price_paise: input.price_paise !== undefined ? input.price_paise : event.price_paise,
    student_price_paise:
      input.student_price_paise !== undefined ? input.student_price_paise : event.student_price_paise,
    capacity: input.capacity !== undefined ? input.capacity : event.capacity,
    capacity_unit: input.capacity_unit !== undefined ? input.capacity_unit : event.capacity_unit,
    scoring_enabled:
      input.scoring_enabled !== undefined ? (input.scoring_enabled ? 1 : 0) : event.scoring_enabled,
    scoring_status: input.scoring_status !== undefined ? input.scoring_status : event.scoring_status,
    max_rounds: input.max_rounds !== undefined ? input.max_rounds : event.max_rounds,
    volunteers_can_score:
      input.volunteers_can_score !== undefined
        ? (input.volunteers_can_score ? 1 : 0)
        : event.volunteers_can_score,
    leaderboard_public:
      input.leaderboard_public !== undefined
        ? (input.leaderboard_public ? 1 : 0)
        : event.leaderboard_public,
    metadata:
      input.metadata !== undefined ? input.metadata?.trim() || null : (event.metadata ?? null),
    form_schema:
      input.form_schema !== undefined
        ? input.form_schema?.trim() || null
        : (event.form_schema ?? null),
    updated_at: now,
  }

  const updateStmt = db
    .prepare(
      `UPDATE events SET
        title = ?, category = ?, description = ?, venue = ?, day_of_event = ?,
        starts_at = ?, ends_at = ?, registration_closes_at = ?, status = ?,
        is_team_event = ?, min_team_size = ?, max_team_size = ?, price_model = ?,
        price_paise = ?, student_price_paise = ?, capacity = ?, capacity_unit = ?,
        scoring_enabled = ?, scoring_status = ?, max_rounds = ?, volunteers_can_score = ?,
        leaderboard_public = ?, metadata = ?, form_schema = ?, updated_at = ?
      WHERE id = ?`
    )
    .bind(
      updatedEvent.title,
      updatedEvent.category,
      updatedEvent.description,
      updatedEvent.venue,
      updatedEvent.day_of_event,
      updatedEvent.starts_at,
      updatedEvent.ends_at,
      updatedEvent.registration_closes_at,
      updatedEvent.status,
      updatedEvent.is_team_event,
      updatedEvent.min_team_size,
      updatedEvent.max_team_size,
      updatedEvent.price_model,
      updatedEvent.price_paise,
      updatedEvent.student_price_paise,
      updatedEvent.capacity,
      updatedEvent.capacity_unit,
      updatedEvent.scoring_enabled,
      updatedEvent.scoring_status,
      updatedEvent.max_rounds,
      updatedEvent.volunteers_can_score,
      updatedEvent.leaderboard_public,
      updatedEvent.metadata || null,
      updatedEvent.form_schema || null,
      updatedEvent.updated_at,
      event.id
    )

  statements.push(updateStmt)

  const auditStmt = createAuditStatement(db, {
    actorId: actor.id,
    action: dayChanged ? 'EVENT_UPDATED_WITH_DAY_CHANGE' : 'EVENT_UPDATED',
    targetType: 'EVENT',
    targetId: event.id,
    beforeJson: event,
    afterJson: updatedEvent,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  statements.push(auditStmt)

  await executeBatch(db, statements)

  return updatedEvent
}

export async function deleteEventByAdmin(
  db: D1Database,
  eventId: string,
  actor: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ deleted: boolean; status: 'DELETED' | 'CANCELLED'; message: string }> {
  const now = meta?.now || Date.now()
  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  // Check if any tickets or active registrations exist
  const activeReg = await db
    .prepare(
      "SELECT count(*) as count FROM registrations WHERE event_id = ? AND status IN ('RESERVED', 'CONFIRMED')"
    )
    .bind(eventId)
    .first<{ count: number }>()

  const totalTickets = await db
    .prepare('SELECT count(*) as count FROM tickets WHERE event_id = ?')
    .bind(eventId)
    .first<{ count: number }>()

  const hasRegistrations = (activeReg?.count || 0) > 0 || (totalTickets?.count || 0) > 0

  if (hasRegistrations) {
    // Cannot hard-delete due to foreign key integrity and attendee records.
    // Instead, safely cancel the event and release remaining capacity.
    const cancelStmt = db
      .prepare("UPDATE events SET status = 'CANCELLED', updated_at = ? WHERE id = ?")
      .bind(now, eventId)

    const auditStmt = createAuditStatement(db, {
      actorId: actor.id,
      action: 'EVENT_CANCELLED',
      targetType: 'EVENT',
      targetId: eventId,
      beforeJson: event,
      afterJson: { ...event, status: 'CANCELLED' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      now,
    })

    await executeBatch(db, [cancelStmt, auditStmt])
    return {
      deleted: false,
      status: 'CANCELLED',
      message:
        'Event has active registrations/tickets; status was transitioned to CANCELLED to preserve attendee records.',
    }
  }

  // Hard delete event and its staff assignments
  const deleteStaffStmt = db.prepare('DELETE FROM event_staff WHERE event_id = ?').bind(eventId)
  const deleteEventStmt = db.prepare('DELETE FROM events WHERE id = ?').bind(eventId)

  const auditStmt = createAuditStatement(db, {
    actorId: actor.id,
    action: 'EVENT_DELETED',
    targetType: 'EVENT',
    targetId: eventId,
    beforeJson: event,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [deleteStaffStmt, deleteEventStmt, auditStmt])
  return {
    deleted: true,
    status: 'DELETED',
    message: 'Event successfully deleted.',
  }
}

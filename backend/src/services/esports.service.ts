import { AppError } from '../common/errors'
import { generateId } from '../common/utils'
import { executeBatch, guardVerifyRow } from '../db/batch'
import { createAuditStatement } from './audit.service'
import type {
  User,
  Event,
  Registration,
  EsportsScore,
  EsportsScoreHistory,
} from '../types'

export interface UpsertScoreInput {
  registration_id: string
  round_no: number
  score: number
  expected_version?: number
  reason?: string
}

export interface LeaderboardEntry {
  rank: number
  registration_id: string
  display_name: string
  team_name: string | null
  participant_name: string
  total_score: number
  round_scores: Record<number, number>
}

export interface LeaderboardResponse {
  event: {
    id: string
    title: string
    slug: string
    category: string
    max_rounds: number
    scoring_status: string
    leaderboard_public: boolean
  }
  leaderboard: LeaderboardEntry[]
}

/**
 * Authorize whether a user has permission to score an event.
 * LEAD of the event may score.
 * VOLUNTEER may score only when volunteers_can_score === 1.
 * SUPER_ADMIN may score.
 */
export async function assertCanScoreEvent(
  db: D1Database,
  event: Event,
  user: User
): Promise<void> {
  if (user.role === 'SUPER_ADMIN') {
    return
  }

  const assignment = await db
    .prepare('SELECT role FROM event_staff WHERE event_id = ? AND user_id = ?')
    .bind(event.id, user.id)
    .first<{ role: 'LEAD' | 'VOLUNTEER' }>()

  if (!assignment) {
    throw new AppError(403, 'FORBIDDEN', 'You are not assigned as staff for this event')
  }

  if (assignment.role === 'LEAD') {
    return
  }

  if (assignment.role === 'VOLUNTEER') {
    if (event.volunteers_can_score !== 1) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Volunteers are not permitted to enter scores for this event'
      )
    }
    return
  }

  throw new AppError(403, 'FORBIDDEN', 'Unauthorized to score this event')
}

/**
 * Authorize staff viewer for an event (LEAD, VOLUNTEER, or SUPER_ADMIN).
 */
export async function assertStaffViewerForEvent(
  db: D1Database,
  event: Event,
  user: User
): Promise<void> {
  if (user.role === 'SUPER_ADMIN') {
    return
  }

  const assignment = await db
    .prepare('SELECT role FROM event_staff WHERE event_id = ? AND user_id = ?')
    .bind(event.id, user.id)
    .first<{ role: string }>()

  if (!assignment) {
    throw new AppError(403, 'FORBIDDEN', 'You are not assigned as staff for this event')
  }
}

/**
 * Create or update a score for an E_SPORTS event round.
 * Optimistic concurrency: updates require expected_version and reason.
 * Append-only history record created in the same batch.
 */
export async function upsertScore(
  db: D1Database,
  eventId: string,
  actor: User,
  input: UpsertScoreInput,
  options?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<EsportsScore> {
  const now = options?.now || Date.now()

  // 1. Fetch and validate event
  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  if (event.category !== 'E_SPORTS') {
    throw new AppError(400, 'INVALID_CATEGORY', 'Scoring is only supported for E_SPORTS events')
  }

  if (event.scoring_enabled !== 1) {
    throw new AppError(400, 'SCORING_DISABLED', 'Scoring is not enabled for this event')
  }

  if (event.scoring_status !== 'OPEN') {
    throw new AppError(
      409,
      'SCORING_NOT_OPEN',
      `Scoring is ${event.scoring_status.toLowerCase()} and cannot be modified`
    )
  }

  if (input.round_no < 1 || input.round_no > event.max_rounds) {
    throw new AppError(
      400,
      'INVALID_ROUND',
      `round_no must be between 1 and ${event.max_rounds}`
    )
  }

  // 2. Authorize actor
  await assertCanScoreEvent(db, event, actor)

  // 3. Score validation: finite, bounded -1,000,000 to 1,000,000, rounded to 2 decimals
  if (
    typeof input.score !== 'number' ||
    !Number.isFinite(input.score) ||
    Number.isNaN(input.score)
  ) {
    throw new AppError(400, 'INVALID_SCORE', 'Score must be a finite number')
  }

  if (input.score < -1000000 || input.score > 1000000) {
    throw new AppError(400, 'INVALID_SCORE', 'Score must be between -1,000,000 and 1,000,000')
  }

  const roundedScore = Math.round(input.score * 100) / 100

  // 4. Verify confirmed registration for this event
  const registration = await db
    .prepare('SELECT * FROM registrations WHERE id = ? AND event_id = ?')
    .bind(input.registration_id, event.id)
    .first<Registration>()

  if (!registration) {
    throw new AppError(404, 'NOT_FOUND', 'Registration not found for this event')
  }

  if (registration.status !== 'CONFIRMED') {
    throw new AppError(
      400,
      'REGISTRATION_NOT_CONFIRMED',
      'Only confirmed registrations can receive scores'
    )
  }

  // 5. Check if score already exists for (event_id, registration_id, round_no)
  const existingScore = await db
    .prepare(
      'SELECT * FROM esports_scores WHERE event_id = ? AND registration_id = ? AND round_no = ?'
    )
    .bind(event.id, registration.id, input.round_no)
    .first<EsportsScore>()

  const statements: D1PreparedStatement[] = []

  if (existingScore) {
    // Score update requires expected_version and non-empty reason
    if (input.expected_version === undefined) {
      throw new AppError(
        400,
        'EXPECTED_VERSION_REQUIRED',
        'expected_version is required when updating an existing score'
      )
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new AppError(
        400,
        'REASON_REQUIRED',
        'A correction reason is required when modifying an existing score'
      )
    }

    if (existingScore.version !== input.expected_version) {
      throw new AppError(
        409,
        'SCORE_VERSION_CONFLICT',
        'Score has been modified concurrently',
        { current_score: existingScore }
      )
    }

    const nextVersion = existingScore.version + 1
    const historyId = generateId()

    // 1. Update score row conditionally on version
    statements.push(
      db
        .prepare(
          `UPDATE esports_scores SET
            score = ?,
            version = ?,
            updated_by = ?,
            updated_at = ?
          WHERE id = ? AND version = ?`
        )
        .bind(
          roundedScore,
          nextVersion,
          actor.id,
          now,
          existingScore.id,
          existingScore.version
        )
    )

    // 2. Guard verify row updated
    statements.push(
      guardVerifyRow(
        db,
        'esports_scores',
        'id = ? AND version = ?',
        [existingScore.id, nextVersion]
      )
    )

    // 3. Append-only score history
    statements.push(
      db
        .prepare(
          `INSERT INTO esports_score_history (
            id, score_id, event_id, registration_id, round_no,
            old_score, new_score, version, action, reason, actor_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          historyId,
          existingScore.id,
          event.id,
          registration.id,
          input.round_no,
          existingScore.score,
          roundedScore,
          nextVersion,
          'UPDATE',
          input.reason.trim(),
          actor.id,
          now
        )
    )

    // 4. Audit statement
    statements.push(
      createAuditStatement(db, {
        actorId: actor.id,
        action: 'ESPORTS_SCORE_UPDATED',
        targetType: 'ESPORTS_SCORE',
        targetId: existingScore.id,
        beforeJson: existingScore,
        afterJson: { score: roundedScore, version: nextVersion, reason: input.reason },
        reason: input.reason,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        now,
      })
    )

    try {
      await executeBatch(db, statements, {
        customGuardMessage: 'Score was modified concurrently by another user',
      })
    } catch {
      // Re-read latest score to return current state with 409
      const latest = await db
        .prepare('SELECT * FROM esports_scores WHERE id = ?')
        .bind(existingScore.id)
        .first<EsportsScore>()

      throw new AppError(
        409,
        'SCORE_VERSION_CONFLICT',
        'Score was modified concurrently by another user',
        { current_score: latest }
      )
    }

    return {
      ...existingScore,
      score: roundedScore,
      version: nextVersion,
      updated_by: actor.id,
      updated_at: now,
    }
  }

  // Create new score (version 1)
  const scoreId = generateId()
  const historyId = generateId()

  const newScore: EsportsScore = {
    id: scoreId,
    event_id: event.id,
    registration_id: registration.id,
    round_no: input.round_no,
    score: roundedScore,
    version: 1,
    created_by: actor.id,
    updated_by: actor.id,
    created_at: now,
    updated_at: now,
  }

  // 1. Insert score
  statements.push(
    db
      .prepare(
        `INSERT INTO esports_scores (
          id, event_id, registration_id, round_no, score,
          version, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
      )
      .bind(
        newScore.id,
        newScore.event_id,
        newScore.registration_id,
        newScore.round_no,
        newScore.score,
        actor.id,
        actor.id,
        now,
        now
      )
  )

  // 2. Append-only score history
  statements.push(
    db
      .prepare(
        `INSERT INTO esports_score_history (
          id, score_id, event_id, registration_id, round_no,
          old_score, new_score, version, action, reason, actor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        historyId,
        newScore.id,
        event.id,
        registration.id,
        input.round_no,
        null,
        roundedScore,
        1,
        'CREATE',
        input.reason ? input.reason.trim() : 'Initial round score entry',
        actor.id,
        now
      )
  )

  // 3. Audit statement
  statements.push(
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'ESPORTS_SCORE_CREATED',
      targetType: 'ESPORTS_SCORE',
      targetId: newScore.id,
      afterJson: newScore,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      now,
    })
  )

  await executeBatch(db, statements, {
    customGuardMessage: 'Score creation failed: score already exists for this round or condition changed',
  })

  return newScore
}

/**
 * Delete a score entry.
 * Requires LEAD of the event or SUPER_ADMIN, plus a reason.
 * Records immutable DELETE history and audit row before deleting.
 */
export async function deleteScore(
  db: D1Database,
  eventId: string,
  scoreId: string,
  actor: User,
  reason: string,
  options?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<{ deleted: boolean; score_id: string }> {
  const now = options?.now || Date.now()

  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  // Deleting score requires LEAD or SUPER_ADMIN
  if (actor.role !== 'SUPER_ADMIN') {
    const assignment = await db
      .prepare('SELECT role FROM event_staff WHERE event_id = ? AND user_id = ?')
      .bind(event.id, actor.id)
      .first<{ role: string }>()

    if (!assignment || assignment.role !== 'LEAD') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only event leads and super administrators can delete scores'
      )
    }
  }

  if (event.scoring_status !== 'OPEN') {
    throw new AppError(
      409,
      'SCORING_NOT_OPEN',
      `Cannot delete score when scoring is ${event.scoring_status.toLowerCase()}`
    )
  }

  const boundedReason = reason.trim().slice(0, 500)
  if (!boundedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to delete a score entry')
  }

  const score = await db
    .prepare('SELECT * FROM esports_scores WHERE id = ? AND event_id = ?')
    .bind(scoreId, event.id)
    .first<EsportsScore>()

  if (!score) {
    throw new AppError(404, 'NOT_FOUND', 'Score entry not found')
  }

  const historyId = generateId()
  const statements: D1PreparedStatement[] = []

  // 1. Insert DELETE history entry before row deletion
  statements.push(
    db
      .prepare(
        `INSERT INTO esports_score_history (
          id, score_id, event_id, registration_id, round_no,
          old_score, new_score, version, action, reason, actor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        historyId,
        score.id,
        event.id,
        score.registration_id,
        score.round_no,
        score.score,
        null,
        score.version,
        'DELETE',
        boundedReason,
        actor.id,
        now
      )
  )

  // 2. Audit statement
  statements.push(
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'ESPORTS_SCORE_DELETED',
      targetType: 'ESPORTS_SCORE',
      targetId: score.id,
      beforeJson: score,
      reason: boundedReason,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      now,
    })
  )

  // 3. Delete score entry
  statements.push(
    db.prepare('DELETE FROM esports_scores WHERE id = ?').bind(score.id)
  )

  await executeBatch(db, statements)

  return { deleted: true, score_id: score.id }
}

/**
 * Finalize event scoring: guarded transition from OPEN -> FINALIZED.
 * Requires LEAD of event or SUPER_ADMIN.
 */
export async function finalizeScores(
  db: D1Database,
  eventId: string,
  actor: User,
  options?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<Event> {
  const now = options?.now || Date.now()

  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  if (actor.role !== 'SUPER_ADMIN') {
    const assignment = await db
      .prepare('SELECT role FROM event_staff WHERE event_id = ? AND user_id = ?')
      .bind(event.id, actor.id)
      .first<{ role: string }>()

    if (!assignment || assignment.role !== 'LEAD') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only event leads and super administrators can finalize scoring'
      )
    }
  }

  if (event.category !== 'E_SPORTS' || event.scoring_enabled !== 1) {
    throw new AppError(400, 'BAD_REQUEST', 'Event does not support scoring finalization')
  }

  if (event.scoring_status !== 'OPEN') {
    throw new AppError(
      409,
      'CONFLICT',
      `Scoring is already in ${event.scoring_status} status`
    )
  }

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "UPDATE events SET scoring_status = ?, updated_at = ? WHERE id = ? AND scoring_status = 'OPEN'"
      )
      .bind('FINALIZED', now, event.id),
    guardVerifyRow(db, 'events', "id = ? AND scoring_status = 'FINALIZED'", [event.id]),
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'ESPORTS_SCORES_FINALIZED',
      targetType: 'EVENT',
      targetId: event.id,
      beforeJson: { scoring_status: event.scoring_status },
      afterJson: { scoring_status: 'FINALIZED' },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      now,
    }),
  ]

  await executeBatch(db, statements, {
    customGuardMessage: 'Failed to finalize scores: status was modified concurrently',
  })

  return {
    ...event,
    scoring_status: 'FINALIZED',
    updated_at: now,
  }
}

/**
 * Reopen event scoring: transition from FINALIZED -> OPEN.
 * SUPER_ADMIN only. Requires non-empty reason.
 */
export async function reopenScores(
  db: D1Database,
  eventId: string,
  actor: User,
  reason: string,
  options?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<Event> {
  const now = options?.now || Date.now()

  if (actor.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only super administrators can reopen finalized scores')
  }

  const boundedReason = reason.trim().slice(0, 500)
  if (!boundedReason) {
    throw new AppError(400, 'REASON_REQUIRED', 'A reason is required to reopen finalized scores')
  }

  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  if (event.scoring_status !== 'FINALIZED') {
    throw new AppError(
      409,
      'CONFLICT',
      `Cannot reopen scoring when status is ${event.scoring_status}`
    )
  }

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "UPDATE events SET scoring_status = ?, updated_at = ? WHERE id = ? AND scoring_status = 'FINALIZED'"
      )
      .bind('OPEN', now, event.id),
    guardVerifyRow(db, 'events', "id = ? AND scoring_status = 'OPEN'", [event.id]),
    createAuditStatement(db, {
      actorId: actor.id,
      action: 'ESPORTS_SCORES_REOPENED',
      targetType: 'EVENT',
      targetId: event.id,
      beforeJson: { scoring_status: event.scoring_status },
      afterJson: { scoring_status: 'OPEN', reason: boundedReason },
      reason: boundedReason,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      now,
    }),
  ]

  await executeBatch(db, statements, {
    customGuardMessage: 'Failed to reopen scores: status was modified concurrently',
  })

  return {
    ...event,
    scoring_status: 'OPEN',
    updated_at: now,
  }
}

/**
 * Retrieve scores and audit history for staff.
 */
export async function getStaffScoresView(
  db: D1Database,
  eventId: string,
  actor: User
): Promise<{
  event: Event
  scores: any[]
  history: any[]
}> {
  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  await assertStaffViewerForEvent(db, event, actor)

  const scoresResult = await db
    .prepare(
      `SELECT s.*, u.name as participant_name, t.name as team_name
       FROM esports_scores s
       JOIN registrations r ON s.registration_id = r.id
       LEFT JOIN teams t ON r.team_id = t.id
       JOIN users u ON r.participant_id = u.id
       WHERE s.event_id = ?
       ORDER BY s.round_no ASC, s.score DESC`
    )
    .bind(event.id)
    .all<any>()

  const historyResult = await db
    .prepare(
      `SELECT h.*, u.name as actor_name
       FROM esports_score_history h
       JOIN users u ON h.actor_id = u.id
       WHERE h.event_id = ?
       ORDER BY h.created_at DESC`
    )
    .bind(event.id)
    .all<any>()

  return {
    event,
    scores: scoresResult.results || [],
    history: historyResult.results || [],
  }
}

/**
 * Computes public / participant event leaderboard.
 * Excludes unconfirmed registrations.
 * Computes RANK() with shared ranks for ties and stable display ordering.
 * Never exposes phone, email, or institution ID.
 */
export async function getLeaderboard(
  db: D1Database,
  eventId: string,
  viewer?: User | null
): Promise<LeaderboardResponse> {
  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Leaderboard not found')
  }

  if (event.category !== 'E_SPORTS' || event.scoring_enabled !== 1) {
    throw new AppError(404, 'NOT_FOUND', 'Leaderboard not found')
  }

  // Non-public boards: 404 for public / unassigned users; accessible only to assigned staff or super admins
  if (event.leaderboard_public !== 1) {
    if (!viewer) {
      throw new AppError(404, 'NOT_FOUND', 'Leaderboard not found')
    }

    if (viewer.role !== 'SUPER_ADMIN') {
      const assignment = await db
        .prepare('SELECT 1 FROM event_staff WHERE event_id = ? AND user_id = ?')
        .bind(event.id, viewer.id)
        .first()

      if (!assignment) {
        throw new AppError(404, 'NOT_FOUND', 'Leaderboard not found')
      }
    }
  }

  // 1. Fetch only CONFIRMED registrations for this event
  const registrationsResult = await db
    .prepare(
      `SELECT r.id as registration_id, r.participant_id, r.team_id,
              t.name as team_name, u.name as participant_name
       FROM registrations r
       LEFT JOIN teams t ON r.team_id = t.id
       JOIN users u ON r.participant_id = u.id
       WHERE r.event_id = ? AND r.status = 'CONFIRMED'`
    )
    .bind(event.id)
    .all<any>()

  const confirmedRegistrations = registrationsResult.results || []

  // 2. Fetch all scores for this event
  const scoresResult = await db
    .prepare(
      'SELECT registration_id, round_no, score FROM esports_scores WHERE event_id = ?'
    )
    .bind(event.id)
    .all<{ registration_id: string; round_no: number; score: number }>()

  const scoresByRegistration = new Map<string, { round_no: number; score: number }[]>()
  for (const s of scoresResult.results || []) {
    const list = scoresByRegistration.get(s.registration_id) || []
    list.push(s)
    scoresByRegistration.set(s.registration_id, list)
  }

  // 3. Build registration entries with summed round scores
  const rawEntries: Omit<LeaderboardEntry, 'rank'>[] = []

  for (const reg of confirmedRegistrations) {
    const roundList = scoresByRegistration.get(reg.registration_id) || []
    const roundScores: Record<number, number> = {}
    let total = 0

    for (const r of roundList) {
      roundScores[r.round_no] = r.score
      total += r.score
    }

    const displayName = reg.team_name || reg.participant_name || 'Participant'

    rawEntries.push({
      registration_id: reg.registration_id,
      display_name: displayName,
      team_name: reg.team_name || null,
      participant_name: reg.participant_name,
      total_score: Math.round(total * 100) / 100,
      round_scores: roundScores,
    })
  }

  // 4. Sort entries: total_score DESC, secondary stable ordering: display_name ASC, registration_id ASC
  rawEntries.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score
    }
    const nameDiff = a.display_name.localeCompare(b.display_name)
    if (nameDiff !== 0) return nameDiff
    return a.registration_id.localeCompare(b.registration_id)
  })

  // 5. Compute RANK() (ties share rank, next rank jumps: 1, 2, 2, 4)
  const rankedEntries: LeaderboardEntry[] = []
  for (let i = 0; i < rawEntries.length; i++) {
    let rank = 1
    if (i > 0) {
      if (rawEntries[i].total_score === rawEntries[i - 1].total_score) {
        rank = rankedEntries[i - 1].rank
      } else {
        rank = i + 1
      }
    }
    rankedEntries.push({
      rank,
      ...rawEntries[i],
    })
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      category: event.category,
      max_rounds: event.max_rounds,
      scoring_status: event.scoring_status,
      leaderboard_public: event.leaderboard_public === 1,
    },
    leaderboard: rankedEntries,
  }
}

/**
 * List all events with public leaderboards.
 */
export async function listPublicLeaderboards(db: D1Database): Promise<any[]> {
  const result = await db
    .prepare(
      `SELECT id, slug, title, category, max_rounds, scoring_status
       FROM events
       WHERE category = 'E_SPORTS' AND scoring_enabled = 1 AND leaderboard_public = 1
       ORDER BY title ASC`
    )
    .all<any>()

  return result.results || []
}

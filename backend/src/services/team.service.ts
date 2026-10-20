import { AppError } from '../common/errors'
import { generateId, normalizeEmail } from '../common/utils'
import { executeBatch, guardUnless, guardWhen, guardVerifyRow } from '../db/batch'
import { createAuditStatement } from './audit.service'
import { isSuperAdmin, isEventStaff } from './authz.service'
import type { Team, TeamMember, User, Event } from '../types'

export interface CreateTeamInput {
  event_id: string
  name: string
}

export interface TeamWithMembers extends Team {
  members: (TeamMember & {
    user?: {
      id: string
      name: string
      email: string
      avatar_url: string | null
      is_student: boolean
      institution_name: string | null
      institution_id: string | null
      profile_completed_at: number | null
    } | null
  })[]
}

export async function createTeam(
  db: D1Database,
  input: CreateTeamInput,
  user: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<TeamWithMembers> {
  const now = meta?.now || Date.now()
  const trimmedName = input.name.trim()

  if (trimmedName.length < 2 || trimmedName.length > 50) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Team name must be between 2 and 50 characters')
  }

  // 1. Validate event exists, is open, and is a team event
  const event = await db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(input.event_id)
    .first<Event>()

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found')
  }

  if (event.is_team_event !== 1) {
    throw new AppError(400, 'BAD_REQUEST', 'Cannot create a team for an individual/solo event')
  }

  if (event.status !== 'OPEN') {
    throw new AppError(400, 'BAD_REQUEST', 'Event is not currently open for registration')
  }

  if (event.registration_closes_at && event.registration_closes_at <= now) {
    throw new AppError(400, 'BAD_REQUEST', 'Registration deadline for this event has passed')
  }

  // 2. Preflight check: Leader already leading an active team for this event?
  const existingActiveLeader = await db
    .prepare(
      "SELECT 1 FROM teams WHERE event_id = ? AND leader_id = ? AND status != 'CANCELLED' LIMIT 1"
    )
    .bind(event.id, user.id)
    .first()

  if (existingActiveLeader) {
    throw new AppError(409, 'ALREADY_LEADER', 'You are already leading an active team for this event')
  }

  // 3. Preflight check: Team name already taken for this event?
  const existingName = await db
    .prepare(
      "SELECT 1 FROM teams WHERE event_id = ? AND lower(name) = lower(?) AND status != 'CANCELLED' LIMIT 1"
    )
    .bind(event.id, trimmedName)
    .first()

  if (existingName) {
    throw new AppError(409, 'TEAM_NAME_TAKEN', 'A team with this name already exists for this event')
  }

  // 4. Preflight check: Leader already accepted into another active team for this event?
  const existingMembership = await db
    .prepare(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE t.event_id = ? AND tm.user_id = ? AND tm.status = 'ACCEPTED' AND t.status != 'CANCELLED'
       LIMIT 1`
    )
    .bind(event.id, user.id)
    .first()

  if (existingMembership) {
    throw new AppError(409, 'MEMBER_ALREADY_IN_TEAM', 'You are already a member of an active team for this event')
  }

  const teamId = generateId()
  const memberId = generateId()

  const newTeam: Team = {
    id: teamId,
    event_id: event.id,
    name: trimmedName,
    leader_id: user.id,
    status: 'DRAFT',
    created_at: now,
    updated_at: now,
  }

  const leaderMember: TeamMember = {
    id: memberId,
    team_id: teamId,
    user_id: user.id,
    invited_email: user.email,
    role: 'LEADER',
    status: 'ACCEPTED',
    invited_at: now,
    responded_at: now,
  }

  // Atomic batch: insert team + insert leader member + audit row
  const insertTeamStmt = db
    .prepare(
      'INSERT INTO teams (id, event_id, name, leader_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(newTeam.id, newTeam.event_id, newTeam.name, newTeam.leader_id, newTeam.status, now, now)

  const insertMemberStmt = db
    .prepare(
      `INSERT INTO team_members (id, team_id, user_id, invited_email, role, status, invited_at, responded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      leaderMember.id,
      leaderMember.team_id,
      leaderMember.user_id,
      leaderMember.invited_email,
      leaderMember.role,
      leaderMember.status,
      now,
      now
    )

  const auditStmt = createAuditStatement(db, {
    actorId: user.id,
    action: 'TEAM_CREATED',
    targetType: 'TEAM',
    targetId: teamId,
    afterJson: { team: newTeam, leader: leaderMember },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [insertTeamStmt, insertMemberStmt, auditStmt])

  return {
    ...newTeam,
    members: [
      {
        ...leaderMember,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          is_student: Boolean(user.is_student),
          institution_name: user.institution_name,
          institution_id: user.institution_id,
          profile_completed_at: user.profile_completed_at,
        },
      },
    ],
  }
}

export async function getTeamWithMembers(
  db: D1Database,
  teamId: string,
  currentUser?: User | null
): Promise<TeamWithMembers> {
  const team = await db
    .prepare('SELECT * FROM teams WHERE id = ?')
    .bind(teamId)
    .first<Team>()

  if (!team) {
    throw new AppError(404, 'NOT_FOUND', 'Team not found')
  }

  const memberRows = await db
    .prepare(
      `SELECT tm.*,
        u.name as u_name, u.email as u_email, u.avatar_url as u_avatar_url,
        u.is_student as u_is_student, u.institution_name as u_institution_name,
        u.institution_id as u_institution_id, u.profile_completed_at as u_profile_completed_at
       FROM team_members tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?
       ORDER BY tm.role DESC, tm.invited_at ASC`
    )
    .bind(teamId)
    .all<any>()

  const members = (memberRows.results || []).map((row) => ({
    id: row.id,
    team_id: row.team_id,
    user_id: row.user_id,
    invited_email: row.invited_email,
    role: row.role,
    status: row.status,
    invited_at: row.invited_at,
    responded_at: row.responded_at,
    user: row.user_id
      ? {
          id: row.user_id,
          name: row.u_name || '',
          email: row.u_email || row.invited_email,
          avatar_url: row.u_avatar_url,
          is_student: Boolean(row.u_is_student),
          institution_name: row.u_institution_name,
          institution_id: row.u_institution_id,
          profile_completed_at: row.u_profile_completed_at,
        }
      : null,
  }))

  // Authorization / Existence Hiding check
  if (currentUser) {
    const isMember = members.some(
      (m) =>
        (m.user_id === currentUser.id || m.invited_email === currentUser.email) &&
        (m.status === 'ACCEPTED' || m.status === 'INVITED')
    )
    if (!isMember && !isSuperAdmin(currentUser)) {
      const isStaff = await isEventStaff(db, team.event_id, currentUser.id)
      if (!isStaff) {
        throw new AppError(404, 'NOT_FOUND', 'Team not found')
      }
    }
  } else {
    throw new AppError(404, 'NOT_FOUND', 'Team not found')
  }

  return {
    ...team,
    members,
  }
}

export async function getUserTeams(db: D1Database, userId: string, userEmail: string): Promise<TeamWithMembers[]> {
  const teamRows = await db
    .prepare(
      `SELECT DISTINCT t.* FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE (tm.user_id = ? OR tm.invited_email = ?)
         AND tm.status IN ('ACCEPTED', 'INVITED')
         AND t.status != 'CANCELLED'
       ORDER BY t.created_at DESC`
    )
    .bind(userId, userEmail)
    .all<Team>()

  const teams: TeamWithMembers[] = []
  for (const t of teamRows.results || []) {
    const full = await getTeamWithMembers(db, t.id, { id: userId, email: userEmail, role: 'PARTICIPANT' } as User)
    teams.push(full)
  }
  return teams
}

export async function inviteTeamMember(
  db: D1Database,
  teamId: string,
  rawEmail: string,
  currentUser: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<TeamMember> {
  const now = meta?.now || Date.now()
  const email = normalizeEmail(rawEmail)

  if (!email || !email.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A valid email address is required')
  }

  // 1. Fetch team and check leader status
  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(teamId).first<Team>()
  if (!team) {
    throw new AppError(404, 'NOT_FOUND', 'Team not found')
  }

  if (team.leader_id !== currentUser.id && !isSuperAdmin(currentUser)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the team leader can invite members')
  }

  if (team.status !== 'DRAFT') {
    throw new AppError(409, 'CONFLICT', `Cannot invite members to a team in ${team.status} status`)
  }

  if (email === currentUser.email) {
    throw new AppError(400, 'BAD_REQUEST', 'Cannot invite yourself to your own team')
  }

  // 2. Fetch event to verify event is still open and check max_team_size
  const event = await db.prepare('SELECT * FROM events WHERE id = ?').bind(team.event_id).first<Event>()
  if (!event || event.status !== 'OPEN') {
    throw new AppError(400, 'BAD_REQUEST', 'Event is not currently open for registration')
  }

  if (event.registration_closes_at && event.registration_closes_at <= now) {
    throw new AppError(400, 'BAD_REQUEST', 'Event registration deadline has passed')
  }

  // 3. Count current INVITED + ACCEPTED members
  const countRow = await db
    .prepare(
      "SELECT count(*) as total FROM team_members WHERE team_id = ? AND status IN ('INVITED', 'ACCEPTED')"
    )
    .bind(team.id)
    .first<{ total: number }>()

  const currentCount = countRow?.total || 0
  if (currentCount >= event.max_team_size) {
    throw new AppError(
      409,
      'CONFLICT',
      `Cannot invite more members. Team capacity limit of ${event.max_team_size} reached.`
    )
  }

  // 4. Check if invited user is already in this team
  const existingInTeam = await db
    .prepare(
      "SELECT 1 FROM team_members WHERE team_id = ? AND invited_email = ? AND status IN ('INVITED', 'ACCEPTED')"
    )
    .bind(team.id, email)
    .first()

  if (existingInTeam) {
    throw new AppError(409, 'MEMBER_ALREADY_INVITED', 'User is already invited or a member of this team')
  }

  // 5. Check if invited user is already in another active team for this event
  const existingInOtherTeam = await db
    .prepare(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE t.event_id = ? AND tm.invited_email = ? AND tm.status IN ('INVITED', 'ACCEPTED') AND t.status != 'CANCELLED'
       LIMIT 1`
    )
    .bind(event.id, email)
    .first()

  if (existingInOtherTeam) {
    throw new AppError(
      409,
      'CONFLICT',
      'This user already has an active invitation or membership in another team for this event'
    )
  }

  // Check if a registered user exists with this email to link user_id
  const targetUser = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>()

  const memberId = generateId()
  const member: TeamMember = {
    id: memberId,
    team_id: team.id,
    user_id: targetUser?.id || null,
    invited_email: email,
    role: 'MEMBER',
    status: 'INVITED',
    invited_at: now,
    responded_at: null,
  }

  const insertStmt = db
    .prepare(
      `INSERT INTO team_members (id, team_id, user_id, invited_email, role, status, invited_at, responded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      member.id,
      member.team_id,
      member.user_id,
      member.invited_email,
      member.role,
      member.status,
      now,
      null
    )

  const auditStmt = createAuditStatement(db, {
    actorId: currentUser.id,
    action: 'TEAM_MEMBER_INVITED',
    targetType: 'TEAM_MEMBER',
    targetId: member.id,
    afterJson: member,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [insertStmt, auditStmt])
  return member
}

export async function getUserPendingInvites(
  db: D1Database,
  userId: string,
  userEmail: string
): Promise<any[]> {
  const rows = await db
    .prepare(
      `SELECT tm.*, t.name as team_name, t.event_id, e.title as event_title, e.max_team_size,
        u.name as leader_name, u.email as leader_email
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN events e ON t.event_id = e.id
       JOIN users u ON t.leader_id = u.id
       WHERE (tm.user_id = ? OR tm.invited_email = ?)
         AND tm.status = 'INVITED'
         AND t.status = 'DRAFT'
       ORDER BY tm.invited_at DESC`
    )
    .bind(userId, userEmail)
    .all()

  return rows.results || []
}

export async function acceptTeamInvite(
  db: D1Database,
  memberId: string,
  currentUser: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<TeamMember> {
  const now = meta?.now || Date.now()

  // 1. Fetch invitation record
  const member = await db
    .prepare('SELECT * FROM team_members WHERE id = ?')
    .bind(memberId)
    .first<TeamMember>()

  if (!member) {
    throw new AppError(404, 'NOT_FOUND', 'Invitation not found')
  }

  // 2. Restrict accept to the exact invitee (existence hiding if someone else tries)
  if (member.invited_email !== currentUser.email && member.user_id !== currentUser.id) {
    throw new AppError(404, 'NOT_FOUND', 'Invitation not found')
  }

  if (member.status !== 'INVITED') {
    throw new AppError(409, 'CONFLICT', `Invitation is already in ${member.status} status`)
  }

  // 3. Fetch team and event
  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(member.team_id).first<Team>()
  if (!team || team.status !== 'DRAFT') {
    throw new AppError(409, 'CONFLICT', 'Team is no longer accepting new members')
  }

  const event = await db.prepare('SELECT * FROM events WHERE id = ?').bind(team.event_id).first<Event>()
  if (!event || event.status !== 'OPEN') {
    throw new AppError(400, 'BAD_REQUEST', 'Event is not open for registration')
  }

  // 4. Guard against exceeding max_team_size concurrently
  const capacityGuard = guardUnless(
    db,
    `(SELECT count(*) FROM team_members WHERE team_id = ? AND status = 'ACCEPTED') < ?`,
    [team.id, event.max_team_size]
  )

  // 5. Guard against user concurrently joining another active team for the same event
  const oneTeamGuard = guardWhen(
    db,
    `EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE t.event_id = ? AND tm.user_id = ? AND tm.status = 'ACCEPTED' AND t.status != 'CANCELLED'
    )`,
    [event.id, currentUser.id]
  )

  // 6. Update statement with verify-after-write
  const updateStmt = db
    .prepare(
      `UPDATE team_members SET
        status = 'ACCEPTED',
        user_id = ?,
        responded_at = ?
      WHERE id = ? AND status = 'INVITED'`
    )
    .bind(currentUser.id, now, member.id)

  const verifyStmt = guardVerifyRow(
    db,
    'team_members',
    `id = ? AND status = 'ACCEPTED'`,
    [member.id]
  )

  const auditStmt = createAuditStatement(db, {
    actorId: currentUser.id,
    action: 'TEAM_INVITE_ACCEPTED',
    targetType: 'TEAM_MEMBER',
    targetId: member.id,
    beforeJson: member,
    afterJson: { ...member, status: 'ACCEPTED', user_id: currentUser.id, responded_at: now },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [capacityGuard, oneTeamGuard, updateStmt, verifyStmt, auditStmt], {
    customGuardMessage: 'Cannot accept invitation: team is full or you are already in another team for this event',
  })

  return {
    ...member,
    user_id: currentUser.id,
    status: 'ACCEPTED',
    responded_at: now,
  }
}

export async function declineTeamInvite(
  db: D1Database,
  memberId: string,
  currentUser: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<TeamMember> {
  const now = meta?.now || Date.now()

  const member = await db.prepare('SELECT * FROM team_members WHERE id = ?').bind(memberId).first<TeamMember>()
  if (!member) {
    throw new AppError(404, 'NOT_FOUND', 'Invitation not found')
  }

  if (member.invited_email !== currentUser.email && member.user_id !== currentUser.id) {
    throw new AppError(404, 'NOT_FOUND', 'Invitation not found')
  }

  if (member.status !== 'INVITED') {
    throw new AppError(409, 'CONFLICT', `Invitation is already in ${member.status} status`)
  }

  const updateStmt = db
    .prepare("UPDATE team_members SET status = 'DECLINED', responded_at = ? WHERE id = ? AND status = 'INVITED'")
    .bind(now, member.id)

  const verifyStmt = guardVerifyRow(db, 'team_members', `id = ? AND status = 'DECLINED'`, [member.id])

  const auditStmt = createAuditStatement(db, {
    actorId: currentUser.id,
    action: 'TEAM_INVITE_DECLINED',
    targetType: 'TEAM_MEMBER',
    targetId: member.id,
    beforeJson: member,
    afterJson: { ...member, status: 'DECLINED', responded_at: now },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [updateStmt, verifyStmt, auditStmt])

  return {
    ...member,
    status: 'DECLINED',
    responded_at: now,
  }
}

export async function removeTeamMember(
  db: D1Database,
  teamId: string,
  memberId: string,
  currentUser: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<void> {
  const now = meta?.now || Date.now()

  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(teamId).first<Team>()
  if (!team) {
    throw new AppError(404, 'NOT_FOUND', 'Team not found')
  }

  if (team.status !== 'DRAFT') {
    throw new AppError(409, 'CONFLICT', 'Team roster is locked and members cannot be removed or leave')
  }

  const member = await db.prepare('SELECT * FROM team_members WHERE id = ? AND team_id = ?').bind(memberId, team.id).first<TeamMember>()
  if (!member) {
    throw new AppError(404, 'NOT_FOUND', 'Team member not found')
  }

  // The leader cannot be removed
  if (member.role === 'LEADER') {
    throw new AppError(400, 'BAD_REQUEST', 'The team leader cannot be removed. To abandon the team, cancel the team.')
  }

  // Must be either the team leader or the member themselves
  const isLeader = team.leader_id === currentUser.id
  const isSelf = member.user_id === currentUser.id || member.invited_email === currentUser.email
  if (!isLeader && !isSelf && !isSuperAdmin(currentUser)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the team leader or the member themselves can perform this action')
  }

  const updateStmt = db
    .prepare("UPDATE team_members SET status = 'REMOVED', responded_at = ? WHERE id = ?")
    .bind(now, member.id)

  const auditStmt = createAuditStatement(db, {
    actorId: currentUser.id,
    action: isLeader ? 'TEAM_MEMBER_REMOVED' : 'TEAM_MEMBER_LEFT',
    targetType: 'TEAM_MEMBER',
    targetId: member.id,
    beforeJson: member,
    afterJson: { ...member, status: 'REMOVED', responded_at: now },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [updateStmt, auditStmt])
}

export async function cancelTeam(
  db: D1Database,
  teamId: string,
  currentUser: User,
  meta?: { ipAddress?: string; userAgent?: string; now?: number }
): Promise<void> {
  const now = meta?.now || Date.now()

  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(teamId).first<Team>()
  if (!team) {
    throw new AppError(404, 'NOT_FOUND', 'Team not found')
  }

  if (team.leader_id !== currentUser.id && !isSuperAdmin(currentUser)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the team leader can cancel the team')
  }

  if (team.status !== 'DRAFT') {
    throw new AppError(409, 'CONFLICT', `Cannot cancel a team in ${team.status} status`)
  }

  // Atomic batch: mark team CANCELLED and mark all active/invited members REMOVED
  const cancelTeamStmt = db
    .prepare("UPDATE teams SET status = 'CANCELLED', updated_at = ? WHERE id = ? AND status = 'DRAFT'")
    .bind(now, team.id)

  const verifyStmt = guardVerifyRow(db, 'teams', `id = ? AND status = 'CANCELLED'`, [team.id])

  const removeMembersStmt = db
    .prepare("UPDATE team_members SET status = 'REMOVED', responded_at = ? WHERE team_id = ? AND status IN ('INVITED', 'ACCEPTED')")
    .bind(now, team.id)

  const auditStmt = createAuditStatement(db, {
    actorId: currentUser.id,
    action: 'TEAM_CANCELLED',
    targetType: 'TEAM',
    targetId: team.id,
    beforeJson: team,
    afterJson: { ...team, status: 'CANCELLED', updated_at: now },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    now,
  })

  await executeBatch(db, [cancelTeamStmt, verifyStmt, removeMembersStmt, auditStmt])
}

/**
 * Shared service helper for purchases (Task 05) to validate team preconditions.
 */
export async function validateTeamForPurchase(
  db: D1Database,
  teamId: string,
  buyerId: string
): Promise<{ team: Team; event: Event; acceptedMembers: (TeamMember & { user: User })[] }> {
  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(teamId).first<Team>()
  if (!team) {
    throw new AppError(404, 'NOT_FOUND', 'Team not found')
  }

  if (team.leader_id !== buyerId) {
    throw new AppError(403, 'FORBIDDEN', 'Only the team leader can purchase registrations for the team')
  }

  if (team.status !== 'DRAFT') {
    throw new AppError(409, 'CONFLICT', `Team must be in DRAFT status to purchase (current: ${team.status})`)
  }

  const event = await db.prepare('SELECT * FROM events WHERE id = ?').bind(team.event_id).first<Event>()
  if (!event || event.status !== 'OPEN') {
    throw new AppError(400, 'BAD_REQUEST', 'Event is not open for registration')
  }

  // Check no pending invitations
  const pendingCount = await db
    .prepare("SELECT count(*) as count FROM team_members WHERE team_id = ? AND status = 'INVITED'")
    .bind(team.id)
    .first<{ count: number }>()

  if (pendingCount && pendingCount.count > 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Team has pending invitations. All members must accept or be removed before purchase.'
    )
  }

  // Load all accepted members with their user details
  const acceptedRows = await db
    .prepare(
      `SELECT tm.*, u.*
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ? AND tm.status = 'ACCEPTED'`
    )
    .bind(team.id)
    .all<any>()

  const acceptedMembers = (acceptedRows.results || []).map((row) => ({
    id: row.id,
    team_id: row.team_id,
    user_id: row.user_id,
    invited_email: row.invited_email,
    role: row.role,
    status: row.status,
    invited_at: row.invited_at,
    responded_at: row.responded_at,
    user: {
      id: row.user_id,
      google_sub: row.google_sub,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      is_student: row.is_student,
      institution_name: row.institution_name,
      institution_id: row.institution_id,
      student_fields_locked: row.student_fields_locked,
      role: row.role,
      can_review_payments: row.can_review_payments,
      is_active: row.is_active,
      profile_completed_at: row.profile_completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as User,
  }))

  const memberCount = acceptedMembers.length
  if (memberCount < event.min_team_size || memberCount > event.max_team_size) {
    throw new AppError(
      409,
      'CONFLICT',
      `Team has ${memberCount} accepted member(s). Event requires between ${event.min_team_size} and ${event.max_team_size} members.`
    )
  }

  // Ensure every accepted member has a completed profile
  for (const m of acceptedMembers) {
    if (!m.user.profile_completed_at) {
      throw new AppError(
        403,
        'PROFILE_INCOMPLETE',
        `Team member ${m.user.name || m.invited_email} has not completed their profile`
      )
    }
  }

  return { team, event, acceptedMembers }
}

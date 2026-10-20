import { AppError } from '../common/errors'

export interface ConstraintMapping {
  match: RegExp | string
  status: number
  code: string
  message: string
}

export const CONSTRAINT_MAPPINGS: ConstraintMapping[] = [
  // D1 batch guard failure
  {
    match: '_guard',
    status: 409,
    code: 'GUARD_VIOLATION',
    message: 'Precondition or guard assertion failed',
  },
  // Capacity and seat constraints
  {
    match: 'ck_events_capacity',
    status: 409,
    code: 'CAPACITY_FULL',
    message: 'Event capacity has been reached',
  },
  {
    match: 'ck_events_seats_positive',
    status: 400,
    code: 'INVALID_SEAT_COUNT',
    message: 'Seats taken cannot be negative',
  },
  {
    match: 'ck_events_team_size',
    status: 400,
    code: 'INVALID_TEAM_SIZE',
    message: 'Invalid event team size constraints',
  },
  {
    match: 'ck_events_esports_scoring',
    status: 400,
    code: 'INVALID_SCORING_CATEGORY',
    message: 'Scoring is only allowed on E_SPORTS events',
  },
  // Teams and members
  {
    match: 'ux_teams_event_name_active',
    status: 409,
    code: 'TEAM_NAME_TAKEN',
    message: 'A team with this name already exists for this event',
  },
  {
    match: 'ux_teams_event_leader_active',
    status: 409,
    code: 'ALREADY_LEADER',
    message: 'User is already leading an active team for this event',
  },
  {
    match: 'ux_team_members_team_email_active',
    status: 409,
    code: 'MEMBER_ALREADY_INVITED',
    message: 'User is already invited or a member of this team',
  },
  {
    match: 'ux_team_members_team_user_active',
    status: 409,
    code: 'MEMBER_ALREADY_IN_TEAM',
    message: 'User is already an accepted member of this team',
  },
  // Registrations
  {
    match: 'ux_registrations_event_participant',
    status: 409,
    code: 'ALREADY_REGISTERED',
    message: 'Participant is already registered for this event',
  },
  // Payments
  {
    match: 'ux_payments_active_utr',
    status: 409,
    code: 'UTR_ALREADY_USED',
    message: 'This transaction ID has already been submitted for another active payment',
  },
  {
    match: 'ux_payments_active_purchase',
    status: 409,
    code: 'PAYMENT_ALREADY_SUBMITTED',
    message: 'A payment attempt is already pending for this purchase',
  },
  // Tickets & Check-in
  {
    match: 'ux_tickets_item_active',
    status: 409,
    code: 'TICKET_ALREADY_FULFILLED',
    message: 'Active ticket already exists for this purchase item',
  },
  {
    match: 'ux_checkin_event_once',
    status: 409,
    code: 'ALREADY_CHECKED_IN',
    message: 'Ticket has already been admitted to this event',
  },
  {
    match: 'ux_checkin_client_scan_id',
    status: 409,
    code: 'DUPLICATE_SCAN_ID',
    message: 'Duplicate scan request ID',
  },
  // Users & Auth
  {
    match: 'users.email',
    status: 409,
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'An account with this email already exists',
  },
  {
    match: 'users.google_sub',
    status: 409,
    code: 'ACCOUNT_CONFLICT',
    message: 'A conflicting account is already linked to this Google profile',
  },
  // Foreign Keys
  {
    match: 'FOREIGN KEY constraint failed',
    status: 400,
    code: 'INVALID_REFERENCE',
    message: 'Referenced entity does not exist',
  },
  // Append-only triggers
  {
    match: 'append-only',
    status: 403,
    code: 'IMMUTABLE_RECORD',
    message: 'This log or history table is append-only and cannot be modified or deleted',
  },
]

export function mapDatabaseError(err: unknown, customGuardMessage?: string): AppError | null {
  if (!err) return null

  const errString =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === 'string'
      ? err
      : JSON.stringify(err)

  // Check custom guard failure
  if (errString.includes('_guard')) {
    return new AppError(
      409,
      'GUARD_VIOLATION',
      customGuardMessage || 'Condition check or state transition failed'
    )
  }

  for (const mapping of CONSTRAINT_MAPPINGS) {
    if (typeof mapping.match === 'string') {
      if (errString.includes(mapping.match)) {
        return new AppError(mapping.status, mapping.code, mapping.message)
      }
    } else if (mapping.match instanceof RegExp) {
      if (mapping.match.test(errString)) {
        return new AppError(mapping.status, mapping.code, mapping.message)
      }
    }
  }

  return null
}

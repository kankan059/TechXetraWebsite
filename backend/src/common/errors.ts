export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'INVALID_PHONE'
  | 'INVALID_UTR'
  | 'INVALID_PRICE'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'ACCOUNT_DISABLED'
  | 'CSRF_ORIGIN_INVALID'
  | 'PROFILE_INCOMPLETE'
  | 'STUDENT_FIELDS_LOCKED'
  | 'NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'GUARD_VIOLATION'
  | 'CAPACITY_FULL'
  | 'CAPACITY_BELOW_TAKEN'
  | 'TEAM_NAME_TAKEN'
  | 'ALREADY_LEADER'
  | 'MEMBER_ALREADY_INVITED'
  | 'MEMBER_ALREADY_IN_TEAM'
  | 'ALREADY_REGISTERED'
  | 'UTR_ALREADY_USED'
  | 'PAYMENT_ALREADY_SUBMITTED'
  | 'TICKET_ALREADY_FULFILLED'
  | 'ALREADY_CHECKED_IN'
  | 'DUPLICATE_SCAN_ID'
  | 'ACCOUNT_CONFLICT'
  | 'EMAIL_ALREADY_EXISTS'
  | 'SCORE_VERSION_CONFLICT'
  | 'IMMUTABLE_RECORD'
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_MISMATCH'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'

export class AppError extends Error {
  public readonly status: number
  public readonly code: ErrorCode | string
  public readonly details?: unknown
  public readonly isOperational: boolean

  constructor(
    status: number,
    code: ErrorCode | string,
    message: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
    this.isOperational = isOperational
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

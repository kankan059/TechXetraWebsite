export type UserRole = 'PARTICIPANT' | 'VOLUNTEER' | 'LEAD' | 'SUPER_ADMIN'

export interface User {
  id: string
  google_sub: string | null
  email: string
  password_hash?: string | null
  name: string
  avatar_url: string | null
  phone: string | null
  is_student: number
  institution_name: string | null
  institution_id: string | null
  student_fields_locked: number
  role: UserRole
  can_review_payments: number
  is_active: number
  profile_completed_at: number | null
  created_at: number
  updated_at: number
}

export interface Session {
  id: string
  user_id: string
  expires_at: number
  revoked_at: number | null
  ip_address: string | null
  user_agent: string | null
  created_at: number
  last_active_at: number
}

export interface FestDay {
  day_number: 1 | 2 | 3
  date: string
  starts_at: number
  ends_at: number
  description: string | null
}

export type EventCategory =
  | 'CULTURAL'
  | 'TECHNICAL'
  | 'E_SPORTS'
  | 'SPORTS'
  | 'MANAGEMENT'
  | 'LITERARY'
  | 'WORKSHOP'
  | 'INTERACTIVE'
  | 'RECREATIONAL'
  | 'SHOWCASE'
  | 'OTHER'

export type EventStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
export type PriceModel = 'FREE' | 'PER_PARTICIPANT' | 'PER_TEAM'
export type CapacityUnit = 'SEATS' | 'TEAMS'
export type ScoringStatus = 'NOT_APPLICABLE' | 'OPEN' | 'FINALIZED'

export interface Event {
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
  is_team_event: number
  min_team_size: number
  max_team_size: number
  price_model: PriceModel
  price_paise: number
  student_price_paise: number | null
  capacity: number | null
  seats_taken: number
  capacity_unit: CapacityUnit
  scoring_enabled: number
  scoring_status: ScoringStatus
  max_rounds: number
  volunteers_can_score: number
  leaderboard_public: number
  metadata?: string | null
  form_schema?: string | null
  created_at: number
  updated_at: number
}

export type TeamStatus = 'DRAFT' | 'LOCKED' | 'CONFIRMED' | 'CANCELLED'
export type TeamMemberRole = 'LEADER' | 'MEMBER'
export type TeamMemberStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'REMOVED'

export interface Team {
  id: string
  event_id: string
  name: string
  leader_id: string
  status: TeamStatus
  created_at: number
  updated_at: number
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string | null
  invited_email: string
  role: TeamMemberRole
  status: TeamMemberStatus
  invited_at: number
  responded_at: number | null
}

export type PurchaseStatus =
  | 'AWAITING_PAYMENT'
  | 'PENDING_VERIFICATION'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'

export type PaymentMethod = 'UPI' | 'FREE' | null
export type FulfillmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
export type ItemType = 'GATE_PASS' | 'EVENT_PASS'
export type PriceTier = 'GENERAL' | 'STUDENT'

export interface Purchase {
  id: string
  buyer_id: string
  total_amount_paise: number
  status: PurchaseStatus
  payment_method: PaymentMethod
  reservation_expires_at: number | null
  fulfillment_status: FulfillmentStatus
  fulfillment_attempts: number
  fulfillment_last_error: string | null
  idempotency_key: string | null
  idempotency_request_hash: string | null
  student_policy_acknowledged_at: number | null
  created_at: number
  updated_at: number
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  item_type: ItemType
  event_id: string | null
  team_id: string | null
  beneficiary_id: string
  tier: PriceTier
  unit_price_paise: number
  registration_id: string | null
  holds_slot: number
  created_at: number
}

export type RegistrationStatus = 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'

export interface Registration {
  id: string
  event_id: string
  team_id: string | null
  participant_id: string
  status: RegistrationStatus
  seat_count: number
  form_responses?: string | null
  created_at: number
  updated_at: number
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ON_HOLD' | 'WITHDRAWN'

export interface Payment {
  id: string
  purchase_id: string
  expected_amount_paise: number
  transaction_id: string
  status: PaymentStatus
  reviewer_id: string | null
  reviewed_at: number | null
  rejection_reason: string | null
  internal_note: string | null
  resubmitted_from_payment_id: string | null
  created_at: number
  updated_at: number
}

export type TicketStatus = 'ACTIVE' | 'REVOKED' | 'REPLACED'

export interface Ticket {
  id: string
  purchase_item_id: string
  purchase_id: string
  ticket_type: ItemType
  beneficiary_id: string
  event_id: string | null
  tier: PriceTier
  valid_from: number
  valid_to: number
  qr_version: number
  status: TicketStatus
  event_checked_in_at: number | null
  replaces_ticket_id: string | null
  created_at: number
  updated_at: number
}

export type CheckInContext = 'GATE' | 'EVENT'
export type CheckInVerdict = 'ADMITTED' | 'DENIED' | 'OVERRIDDEN'

export interface CheckInLog {
  id: string
  ticket_id: string
  context: CheckInContext
  event_id: string | null
  scanner_id: string
  verdict: CheckInVerdict
  reason: string | null
  student_id_checked: number
  client_scan_id: string | null
  created_at: number
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  target_type: string
  target_id: string
  before_json: string | null
  after_json: string | null
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: number
}

export interface EsportsScore {
  id: string
  event_id: string
  registration_id: string
  round_no: number
  score: number
  version: number
  created_by: string
  updated_by: string
  created_at: number
  updated_at: number
}

export interface EsportsScoreHistory {
  id: string
  score_id: string
  event_id: string
  registration_id: string
  round_no: number
  old_score: number | null
  new_score: number | null
  version: number
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  reason: string | null
  actor_id: string
  created_at: number
}

export * from './env'

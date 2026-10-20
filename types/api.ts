// types/api.ts
// Complete domain types for TechXetra API

export type UserRole = 'PARTICIPANT' | 'VOLUNTEER' | 'LEAD' | 'SUPER_ADMIN'

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  phone: string | null
  is_student: boolean
  institution_name: string | null
  institution_id: string | null
  student_fields_locked: boolean
  role: UserRole
  can_review_payments: boolean
  profile_complete: boolean
  missing_fields: string[]
}

export interface FestDay {
  day_number: 1 | 2 | 3
  date: string // YYYY-MM-DD
  starts_at: number // UTC ms
  ends_at: number // UTC ms
  description: string | null
}

export interface FestCatalog {
  gate_pass: {
    price_paise: number
    student_price_paise: number | null
    validity: string
  }
  fest_days: FestDay[]
  purchases_enabled: string
  student_id_warning_text: string
  support_contact: string
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

export interface ApiEventItem {
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
  capacity_unit: CapacityUnit
  is_sold_out: boolean
  leaderboard_public: boolean
  metadata?: string | null
}

export type TeamStatus = 'DRAFT' | 'LOCKED' | 'CONFIRMED' | 'CANCELLED'
export type TeamMemberRole = 'LEADER' | 'MEMBER'
export type TeamMemberStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'REMOVED'

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

export interface TeamDetail {
  id: string
  event_id: string
  name: string
  leader_id: string
  status: TeamStatus
  created_at: number
  updated_at: number
  event_title: string
  min_team_size: number
  max_team_size: number
  members: TeamMember[]
}

export type PurchaseStatus =
  | 'AWAITING_PAYMENT'
  | 'PENDING_VERIFICATION'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'

export type ItemType = 'GATE_PASS' | 'EVENT_PASS'
export type PriceTier = 'GENERAL' | 'STUDENT'

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
}

export interface PurchaseDetail {
  id: string
  buyer_id: string
  total_amount_paise: number
  status: PurchaseStatus
  payment_method: 'UPI' | 'FREE' | null
  reservation_expires_at: number | null
  fulfillment_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  student_policy_acknowledged_at: number | null
  created_at: number
  updated_at: number
  items: PurchaseItem[]
}

export interface PaymentInstructions {
  purchase_id: string
  expected_amount_paise: number
  formatted_amount: string
  upi_vpa: string
  payee_name: string
  upi_intent_uri: string
  reservation_expires_at: number
  instructions: string[]
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ON_HOLD' | 'WITHDRAWN'

export interface PaymentRecord {
  id: string
  purchase_id: string
  expected_amount_paise: number
  transaction_id: string
  status: PaymentStatus
  reviewed_at: number | null
  rejection_reason: string | null
  created_at: number
}

export interface DigitalTicket {
  id: string
  purchase_item_id: string
  ticket_type: ItemType
  tier: PriceTier
  valid_from: number
  valid_to: number
  status: 'ACTIVE' | 'REVOKED' | 'REPLACED'
  event: {
    id: string
    title: string
    category: string
    day_of_event: number
  } | null
  physical_id_required: boolean
  qr_token: string // e.g. tx1.tkt_abc.1.7Xy9...
}

export interface ScanLookupResult {
  verdict:
    | 'VALID'
    | 'ALREADY_USED'
    | 'EXPIRED'
    | 'NOT_YET_VALID'
    | 'REVOKED'
    | 'PAYMENT_NOT_APPROVED'
    | 'WRONG_EVENT'
    | 'WRONG_TICKET_TYPE'
    | 'INVALID'
  reason: string | null
  ticket: {
    id: string
    ticket_type: ItemType
    tier: PriceTier
    beneficiary_name: string
    requires_id_check: boolean
    institution_name: string | null
    institution_id: string | null
    event: {
      id: string
      title: string
      category: string
      day_of_event: number
    } | null
    validity: {
      valid_from: number
      valid_to: number
      is_currently_valid: boolean
    }
    event_checked_in_at: number | null
  } | null
  recent_gate_entry_at: number | null
  recent_gate_entry_warning: string | null
}

export interface ScanAdmitResult {
  success: boolean
  verdict: 'ADMITTED'
  ticket_id: string
  log_id: string
  context: 'GATE' | 'EVENT'
  student_id_checked: boolean
  admitted_at: number
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
    scoring_status: 'OPEN' | 'FINALIZED'
    leaderboard_public: boolean
  }
  leaderboard: LeaderboardEntry[]
}

// Standard API envelope types
export interface ApiResponse<T> {
  success: true
  data: T
  request_id: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  request_id: string
}

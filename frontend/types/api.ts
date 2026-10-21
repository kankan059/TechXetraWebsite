// Complete TechXetra API domain types

export type UserRole = "PARTICIPANT" | "VOLUNTEER" | "LEAD" | "SUPER_ADMIN";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  is_student: boolean;
  institution_name: string | null;
  institution_id: string | null;
  student_fields_locked: boolean;
  role: UserRole;
  can_review_payments: boolean;
  profile_complete: boolean;
  missing_fields: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  id_token: string;
}

export interface FestDay {
  day_number: 1 | 2 | 3;
  date: string; // YYYY-MM-DD
  starts_at: number; // UTC ms
  ends_at: number; // UTC ms
  description: string | null;
}

export interface FestCatalog {
  gate_pass: {
    price_paise: number;
    student_price_paise: number;
    validity: string;
  };
  fest_days: FestDay[];
  purchases_enabled: boolean;
  student_id_warning_text: string;
  support_contact: string;
}

export type EventCategory =
  | "CULTURAL"
  | "TECHNICAL"
  | "E_SPORTS"
  | "SPORTS"
  | "MANAGEMENT"
  | "LITERARY"
  | "WORKSHOP"
  | "INTERACTIVE"
  | "RECREATIONAL"
  | "SHOWCASE"
  | "OTHER";

export type EventStatus = "DRAFT" | "OPEN" | "CLOSED" | "COMPLETED" | "CANCELLED";
export type PriceModel = "FREE" | "PER_PARTICIPANT" | "PER_TEAM";
export type CapacityUnit = "SEATS" | "TEAMS";
export type ScoringStatus = "NOT_APPLICABLE" | "OPEN" | "FINALIZED";

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  description: string | null;
  venue: string | null;
  day_of_event: number;
  starts_at: number;
  ends_at: number;
  registration_closes_at: number | null;
  status: EventStatus;
  is_team_event: boolean;
  min_team_size: number;
  max_team_size: number;
  price_model: PriceModel;
  price_paise: number;
  student_price_paise: number | null;
  capacity: number | null;
  seats_taken: number;
  seats_remaining: number | null;
  capacity_unit: CapacityUnit;
  registration_open: boolean;
  scoring_enabled: boolean;
  leaderboard_public: boolean;
  metadata?: string | null;
}

export type TeamStatus = "DRAFT" | "LOCKED" | "CONFIRMED" | "CANCELLED";
export type TeamMemberRole = "LEADER" | "MEMBER";
export type TeamMemberStatus = "INVITED" | "ACCEPTED" | "DECLINED" | "REMOVED";

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string | null;
  invited_email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  invited_at: number;
  responded_at: number | null;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    is_student: boolean;
    institution_name: string | null;
    institution_id: string | null;
    profile_completed_at: number | null;
  } | null;
}

export interface TeamDetail {
  id: string;
  event_id: string;
  name: string;
  leader_id: string;
  status: TeamStatus;
  created_at: number;
  updated_at: number;
  members: TeamMember[];
  event?: {
    id: string;
    title: string;
    slug: string;
    category: EventCategory;
    min_team_size: number;
    max_team_size: number;
    price_model: PriceModel;
    price_paise: number;
    student_price_paise: number | null;
  };
}

export type PurchaseStatus =
  | "AWAITING_PAYMENT"
  | "PENDING_VERIFICATION"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED";

export type ItemType = "GATE_PASS" | "EVENT_PASS";
export type PriceTier = "GENERAL" | "STUDENT";

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  item_type: ItemType;
  event_id: string | null;
  team_id: string | null;
  beneficiary_id: string;
  tier: PriceTier;
  unit_price_paise: number;
  registration_id: string | null;
  holds_slot: number;
  created_at: number;
}

export interface Registration {
  id: string;
  event_id: string;
  team_id: string | null;
  participant_id: string;
  status: "RESERVED" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  seat_count: number;
  created_at: number;
  updated_at: number;
  event_title?: string;
  event_category?: string;
  day_of_event?: number;
  event_venue?: string | null;
  team_name?: string | null;
}

export interface PurchaseDetail {
  id: string;
  buyer_id: string;
  total_amount_paise: number;
  status: PurchaseStatus;
  payment_method: "UPI" | "FREE" | null;
  reservation_expires_at: number | null;
  fulfillment_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  fulfillment_attempts: number;
  fulfillment_last_error: string | null;
  idempotency_key: string | null;
  student_policy_acknowledged_at: number | null;
  created_at: number;
  updated_at: number;
  items: PurchaseItem[];
  registrations: Registration[];
}

export interface PaymentInstructions {
  purchase_id: string;
  amount_paise: number;
  amount_rupees: string;
  payee_vpa: string;
  payee_name: string;
  upi_uri: string;
  reservation_expires_at: number | null;
}

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "ON_HOLD" | "WITHDRAWN";

export interface PaymentRecord {
  id: string;
  purchase_id: string;
  expected_amount_paise: number;
  transaction_id: string;
  status: PaymentStatus;
  reviewer_id: string | null;
  reviewed_at: number | null;
  rejection_reason: string | null;
  internal_note: string | null;
  resubmitted_from_payment_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface DerivedTicketValidity {
  valid_from: number;
  valid_to: number;
  state: "VALID" | "UPCOMING" | "EXPIRED" | "REVOKED" | "REPLACED";
  is_currently_valid: boolean;
}

export interface DigitalTicket {
  id: string;
  purchase_item_id: string;
  purchase_id: string;
  ticket_type: ItemType;
  tier: PriceTier;
  status: "ACTIVE" | "REVOKED" | "REPLACED";
  validity: DerivedTicketValidity;
  qr_token: string; // Format: tx1.<ticket_id>.<qr_version>.<hmac_signature>
  qr_version: number;
  event_checked_in_at: number | null;
  purchase: {
    id: string;
    payment_status: PurchaseStatus;
    total_amount_paise: number;
  };
  event: {
    id: string;
    title: string;
    category: string;
    venue: string | null;
    day_of_event: number;
    starts_at: number;
    ends_at: number;
  } | null;
  student_id_warning: string | null;
  created_at: number;
  updated_at: number;
}

export interface PreparingTicket {
  purchase_id: string;
  status: "PREPARING" | "FAILED";
  fulfillment_status: string;
  message: string;
  can_retry: boolean;
  retry_endpoint: string;
  attempts: number;
  last_error: string | null;
}

export interface UserTicketsResponse {
  tickets: DigitalTicket[];
  preparing_tickets: PreparingTicket[];
}

export type ScanVerdict =
  | "VALID"
  | "ALREADY_USED"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "REVOKED"
  | "PAYMENT_NOT_APPROVED"
  | "WRONG_EVENT"
  | "WRONG_TICKET_TYPE"
  | "INVALID";

export interface ScanLookupResult {
  verdict: ScanVerdict;
  reason: string | null;
  ticket: {
    id: string;
    ticket_type: ItemType;
    tier: PriceTier;
    beneficiary_name: string;
    requires_id_check: boolean;
    institution_name: string | null;
    institution_id: string | null;
    event: {
      id: string;
      title: string;
      category: string;
      day_of_event: number;
    } | null;
    validity: {
      valid_from: number;
      valid_to: number;
      is_currently_valid: boolean;
    };
    event_checked_in_at: number | null;
  } | null;
  recent_gate_entry_at: number | null;
  recent_gate_entry_warning: string | null;
}

export interface ScanAdmitResult {
  success: boolean;
  verdict: "ADMITTED";
  ticket_id: string;
  log_id: string;
  context: "GATE" | "EVENT";
  event_id: string | null;
  student_id_checked: boolean;
  admitted_at: number;
  idempotent_replay?: boolean;
}

export interface ScanDenyResult {
  success: boolean;
  verdict: "DENIED";
  ticket_id: string;
  log_id: string;
  context: "GATE" | "EVENT";
  reason: string;
  denied_at: number;
  idempotent_replay?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  registration_id: string;
  display_name: string;
  team_name: string | null;
  participant_name: string;
  total_score: number;
  round_scores: Record<number, number>;
}

export interface LeaderboardResponse {
  event: {
    id: string;
    title: string;
    slug: string;
    category: string;
    max_rounds: number;
    scoring_status: string;
    leaderboard_public: boolean;
  };
  leaderboard: LeaderboardEntry[];
}

export interface EsportsScore {
  id: string;
  event_id: string;
  registration_id: string;
  round_no: number;
  score: number;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: number;
  updated_at: number;
  participant_name?: string;
  team_name?: string | null;
}

// Reports & Admin Types
export type SalesReport = {
  totals_by_status: {
    status: string;
    count: number;
    total_amount_paise: number;
  }[];
  paid_total_amount_paise: number;
  paid_count: number;
  items_breakdown: {
    item_type: string;
    tier: string;
    count: number;
    total_amount_paise: number;
  }[];
};

export type PendingVerificationReport = {
  pending_count: number;
  oldest_timestamp: number | null;
  oldest_age_ms: number | null;
  overdue_count: number;
  items: {
    payment_id: string;
    purchase_id: string;
    expected_amount_paise: number;
    transaction_id: string | null;
    status: string;
    created_at: number;
    buyer_id: string;
    buyer_name: string;
    buyer_email: string;
    age_ms: number;
    is_overdue: boolean;
  }[];
};

export type EventRegistrationsReport = {
  event_id: string;
  slug: string;
  title: string;
  category: string;
  day_of_event: number;
  capacity: number;
  seats_taken: number;
  confirmed_registrations_count: number;
  confirmed_seats_count: number;
  reserved_registrations_count: number;
  reserved_seats_count: number;
}[];

export type AttendanceReport = {
  gate_admissions_by_day: {
    day_number: number;
    date: string;
    admissions_count: number;
  }[];
  event_admissions: {
    event_id: string;
    event_title: string;
    day_of_event: number;
    admissions_count: number;
  }[];
  unique_gate_attendees_count: number;
};

export type DashboardSalesReport = SalesReport;
export type DashboardRegistrationReport = EventRegistrationsReport;
export type DashboardPaymentReport = PendingVerificationReport;
export type DashboardAttendanceReport = AttendanceReport;

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: number | boolean;
  can_review_payments: boolean;
  phone: string | null;
  is_student: boolean;
  institution_name: string | null;
  institution_id: string | null;
  profile_complete: boolean;
  created_at: number;
  [key: string]: unknown;
};

export type AdminEvent = EventItem & {
  staff?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }[];
};

export type AdminPayment = {
  id: string;
  purchase_id: string;
  expected_amount_paise: number;
  transaction_id: string | null;
  status: PaymentStatus;
  reviewer_id: string | null;
  reviewed_at: number | null;
  rejection_reason: string | null;
  internal_note: string | null;
  created_at: number;
  updated_at?: number;
  buyer_id?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string | null;
  buyer?: UserProfile;
  purchase?: PurchaseDetail;
};

export type AdminTicket = DigitalTicket & {
  beneficiary?: UserProfile;
  check_in_logs?: {
    id: string;
    context: "GATE" | "EVENT";
    verdict: string;
    admitted_at: number;
    staff_name?: string;
  }[];
};

export type AdminRegistration = Registration & {
  participant?: UserProfile;
  team?: TeamDetail;
};

export type AdminAuditLog = {
  id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: string | null;
  created_at: number;
};

export type AdminSettings = Record<string, string | number | boolean>;

// Complete TechXetra API domain types

export type UserRole = "PARTICIPANT" | "VOLUNTEER" | "LEAD" | "SUPER_ADMIN";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  phone: string | null;
  is_student?: boolean;
  isStudent?: boolean;
  institution_name?: string | null;
  institutionName?: string | null;
  institution_id?: string | null;
  institutionId?: string | null;
  student_fields_locked?: boolean;
  studentFieldsLocked?: boolean;
  role: UserRole;
  can_review_payments?: boolean;
  canReviewPayments?: boolean;
  profile_complete?: boolean;
  profileComplete?: boolean;
  missing_fields?: string[];
  missingFields?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface SessionResponse {
  authenticated: boolean;
  user: UserProfile | null;
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
  dayNumber: number;
  date: string;
  validFrom: string | null;
  validTo: string | null;
  description: string | null;
}

export interface FestCatalog {
  purchasesEnabled: boolean;
  supportEmail: string;
  gatePassPricePaise: number;
  gatePassStudentPricePaise: number;
  festDays: FestDay[];
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

export type FormFieldType =
  | "shortText" | "longText" | "number" | "singleChoice"
  | "multipleChoice" | "checkbox" | "date" | "email" | "phone";

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];          // was FormFieldOption[]
  helperText?: string;         // was description
  scope?: "PARTICIPANT" | "TEAM";
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  imageURL?: string | null;
  imageUrl?: string | null;
  rawMetadata?: unknown;
  category: EventCategory;
  shortDescription?: string | null;
  description: string | null;
  venue: string | null;
  organizer?: string | null;
  eligibility?: string | null;
  format?: string;
  day_of_event: number;
  festDay?: number;
  starts_at: number;
  startsAt?: number | null;
  ends_at: number;
  endsAt?: number | null;
  registration_closes_at: number | null;
  registrationClosesAt?: number | null;
  registrationOpensAt?: number | null;
  status: EventStatus;
  is_team_event: boolean;
  isTeamEvent?: boolean;
  isTeam?: boolean;
  min_team_size: number;
  minTeamSize?: number;
  max_team_size: number;
  maxTeamSize?: number;
  price_model: PriceModel;
  priceModel?: PriceModel;
  price_paise?: number;
  pricePaise?: number;
  student_price_paise?: number | null;
  studentPricePaise?: number | null;
  capacity: number | null;
  availableCapacity?: number | null;
  seats_taken: number;
  seatsTaken?: number;
  seats_remaining: number | null;
  seatsRemaining?: number | null;
  capacity_unit: CapacityUnit;
  capacityUnit?: CapacityUnit;
  registration_open: boolean;
  registrationOpen?: boolean;
  scoring_enabled: boolean;
  scoringEnabled?: boolean;
  scoringStatus?: ScoringStatus;
  leaderboard_public: boolean;
  leaderboardPublic?: boolean;
  metadata?: string | null;
  form_schema?: string | null;
  formSchema?: string | null;
  rules?: string | string[] | null;
  timeline?: unknown[];
  prizes?: unknown[];
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
  leader_id: string | null;
  leaderId: string | null;
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
  form_responses?: string | Record<string, any> | null;
}

export interface PurchaseItemInput {
  item_type: "GATE_PASS" | "EVENT_PASS";
  event_id?: string;
  team_id?: string;
  form_responses?: Record<string, any>;
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


export interface CreatedPurchase {
  id: string;
  publicId: string;
  status: PurchaseStatus;
  currency: string;
  totalAmountPaise: number;
  totalAmountInr: number;
  paymentMethod: "UPI" | "FREE" | null;
  reservationExpiresAt: number | null;
  createdAt: number;
}

export interface CreatePurchaseResponse {
  purchase: CreatedPurchase;
  items: Array<{
    id: string;
    purchaseId: string;
    itemType: ItemType;
    eventId: string | null;
    teamId: string | null;
    beneficiaryId: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
    tier: PriceTier;
    descriptionSnapshot: {
      tier: PriceTier;
      title: string;
    };
    holdsSlot: number;
    createdAt: number;
  }>;
  tickets: DigitalTicket[];
  isFreeOrder: boolean;
  upiInstructions: {
    vpa: string;
    payeeName: string;
    amountPaise: number;
    orderRef: string;
  } | null;
}

// export interface PaymentInstructions {
//   purchase_id?: string;
//   purchaseId?: string;
//   amount_paise?: number;
//   amountPaise?: number;
//   amount_rupees?: string;
//   amountRupees?: string;
//   payee_vpa?: string;
//   payeeVpa?: string;
//   payee_name?: string;
//   payeeName?: string;
//   upi_uri?: string;
//   upiUri?: string;
//   reservation_expires_at?: number | null;
//   reservationExpiresAt?: number | null;
// }


export interface PaymentInstructions {
  purchaseId: string;
  publicId: string;
  status: PurchaseStatus;
  totalAmountPaise: number;
  totalAmountInr: number;
  currency: string;
  reservationExpiresAt: number | null;
  upi: {
    vpa: string;
    payeeName: string;
    amountPaise: number;
    orderRef: string;
  } | null;
}

export interface PaymentDecisionBody {
  decision: "APPROVE" | "APPROVED" | "REJECT" | "REJECTED" | "HOLD" | "ON_HOLD" | "UNHOLD";
  rejectionReason?: string;
  reasonCode?: string;
  internalNote?: string;
  privateNote?: string;
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
  ticketType?: ItemType;
  tier: PriceTier;
  status: "ACTIVE" | "REVOKED" | "REPLACED";
  validity: DerivedTicketValidity;
  qr_token: string; // Format: tx1.<ticket_id>.<qr_version>.<hmac_signature>
  qrToken?: string;
  qr_version: number;
  qrVersion?: number;
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
  event_staff_assignments?: Array<{ role: "LEAD" | "VOLUNTEER"; event_id: string; event_title: string }>;
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

export interface StaffEventSummary {
  id: string;
  slug: string;
  title: string;
  imageURL?: string | null;
  category: EventCategory;
  role: "LEAD" | "VOLUNTEER" | "SUPER_ADMIN";
  day_of_event: number;
  venue: string | null;
  status: EventStatus;
  capacity: number | null;
  seats_taken: number;
  seats_remaining: number | null;
  confirmed_registrations_count: number;
  reserved_registrations_count: number;
  pending_payments_count: number;
}

export interface EventStaffMember {
  role: "LEAD" | "VOLUNTEER";
  assigned_at: number;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface StaffEventDashboard {
  event: EventItem;
  metrics: {
    confirmed_count: number;
    reserved_count: number;
    checked_in_count: number;
    pending_payments_count: number;
    seats_remaining: number | null;
  };
  staff: EventStaffMember[];
}

export interface EventRegistrationDetail {
  registration_id: string;
  status: "RESERVED" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  seat_count: number;
  registered_at: number;
  participant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    institution_name: string | null;
    institution_id: string | null;
  };
  team: {
    id: string;
    name: string;
  } | null;
  ticket: {
    id: string;
    status: string;
    checked_in: boolean;
    checked_in_at: number | null;
  } | null;
  form_responses: Record<string, any> | null;
}

export interface StaffEventPayment {
  payment_id: string;
  purchase_id: string;
  transaction_id: string;
  expected_amount_paise: number;
  payment_status: "PENDING" | "SUCCESS" | "FAILED" | "ON_HOLD" | "WITHDRAWN";
  rejection_reason: string | null;
  submitted_at: number;
  reviewed_at: number | null;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  total_amount_paise: number;
  purchase_status: string;
}

export interface ReviewStaffPaymentBody {
  action: "APPROVE" | "REJECT" | "HOLD";
  reason?: string;
}

export interface LeadUpdateEventBody {
  description?: string | null;
  venue?: string | null;
  imageURL?: string | null;
  metadata?: string | null;
  form_schema?: string | FormFieldDefinition[] | null;
  formSchema?: FormFieldDefinition[] | null;
  registration_closes_at?: number | null;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isStudent: boolean;
  institutionName: string | null;
  institutionId: string | null;
  isActive: boolean;
  events: Array<{
    registrationId: string;
    registrationStatus: "CONFIRMED" | "RESERVED";
    registeredAt: number;
    event: {
      id: string;
      slug: string;
      title: string;
      category: string;
      format: string;
      venue: string;
      festDay: number;
      isTeam: boolean;
    };
    team: { id: string; name: string } | null;
    ticket: { publicId: string; status: string; checkedInAt: number | null } | null;
  }>;
  teams: Array<{
    id: string;
    name: string;
    eventId: string;
    eventTitle: string;
    isLeader: boolean;
    role: "LEADER" | "MEMBER";
    status: "ACCEPTED" | "INVITED";
  }>;
  staffAssignments: Array<{
    eventId: string;
    eventTitle: string;
    role: "EVENT_LEAD" | "VOLUNTEER";
  }>;
}
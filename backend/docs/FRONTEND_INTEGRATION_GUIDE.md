# TechXetra — Complete Frontend Specification & Integration Guide

> **Agent & Developer Directive**: This document is the master engineering specification designed for frontend engineers and AI coding agents building the web application for **TechXetra** (the annual technical fest of Tezpur University). It provides global architecture, complete TypeScript schemas, a turnkey API client, UI/UX state machines, and a comprehensive directory linking to modular endpoint documentation.

---

## 1. System Architecture & Portal Modules

The TechXetra frontend web application comprises three integrated portals:

```
TechXetra Web Application
├── 1. Participant Portal (Public & Authenticated)
│   ├── Event Catalog & Search (Category, Day, Solo/Team filters)
│   ├── Google Sign-In & Email/Password Authentication
│   ├── Profile & Student Verification (Institutional ID lock)
│   ├── Team Management (Creation, email invites, roster lock)
│   ├── 15-Minute Reservation Checkout (Atomic inventory hold)
│   ├── Manual UPI Payment Flow (VPA QR Code, deep link, UTR submission)
│   └── Digital Pass Presentation (Tamper-proof HMAC QR codes)
│
├── 2. Staff Scanner PWA (Volunteers & Leads)
│   ├── Camera Barcode Reader (html5-qrcode)
│   ├── Gate Check-in (Multi-entry across Fest Days 1–3)
│   ├── Event Check-in (Atomic single-use check-in)
│   └── Physical College ID Verification Enforcement
│
└── 3. Admin & Reviewer Portal (Super Admins & Reviewers)
    ├── Manual UPI Verification Queue (Approve, Reject, Hold, Resubmit)
    ├── E-Sports Tournament Scoring (Optimistic concurrency, round-by-round)
    ├── Event & Staff Management (Role assignments, capacity overrides)
    ├── Ticket & Registration Controls (Revoke, Reissue, Rotate QR, Undo Check-in)
    ├── Festival Settings & Day Scheduling
    └── Business Intelligence Reports & Immutable Audit Logs
```

### Recommended Frontend Tech Stack
- **Framework**: Next.js 14/15 (App Router) or Vite + React 18+ (SPA)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + Shadcn UI / Radix UI primitives
- **Icons**: Lucide React
- **Server Cache & State**: `@tanstack/react-query` (TanStack Query v5)
- **Form Validation**: `react-hook-form` + `zod`
- **QR Utilities**:
  - Generator: `qrcode.react` (SVG/Canvas rendering)
  - Scanner: `html5-qrcode` (PWA camera reader)

---

## 2. Global Communication & API Client

### 2.1 Protocol Rules

> [!IMPORTANT]
> **CRITICAL RULE: MANDATORY SESSION COOKIES (`credentials: 'include'`)**
> 
> The backend does **NOT** use Bearer tokens in headers. Authentication is handled exclusively through secure HttpOnly session cookies (`__Host-session` in production, `session` in local development).
> 
> **Every single HTTP request (`fetch`, Axios, or React Query mutation/query) MUST specify `credentials: 'include'`.**
> 
> If you omit `credentials: 'include'`, the browser will not send the session cookie and all authenticated endpoints (`/api/me`, `/api/purchases`, `/api/teams`, etc.) will fail with **HTTP 401 Unauthorized**.

- **Base URL**: Default to `http://localhost:8787` in development, or `NEXT_PUBLIC_API_URL` / `VITE_API_URL`.
- **Credentials**: **MANDATORY** `credentials: 'include'` on all HTTP requests. The backend uses secure HttpOnly session cookies (`__Host-session` in production, `session` in local dev).
- **CORS & CSRF**: All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the browser's standard `Origin` header matching `FRONTEND_ORIGIN` (default: `http://localhost:3000`).
- **Idempotency**: All purchase creations and payment submissions support and recommend sending an `Idempotency-Key: <uuid-v4>` header.
- **Request Tracing**: All responses include a `request_id` header and payload field for distributed log correlation.

### 2.2 Standard API Envelopes
Every backend response strictly adheres to this envelope:

```ts
// Success Response (HTTP 200, 201)
export interface ApiResponse<T> {
  success: true
  data: T
  request_id: string
}

// Error Response (HTTP 400, 401, 403, 404, 409, 429, 500)
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  request_id: string
}
```

### 2.3 Ready-to-Use Frontend API Client (`lib/api-client.ts`)
Copy-paste this turnkey client directly into your project:

```ts
// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { idempotencyKey, headers = {}, ...rest } = options

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (idempotencyKey) {
    defaultHeaders['Idempotency-Key'] = idempotencyKey
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include', // Mandates HttpOnly session cookies
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
    ...rest,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload.success) {
    const error = payload.error || {}
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred',
      error.details,
      payload.request_id
    )
  }

  return payload.data as T
}
```

---

## 3. Complete Domain Types (`types/api.ts`)

Copy-paste these exact TypeScript types into your frontend (`types/api.ts`):

```ts
// types/api.ts

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

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface GoogleLoginRequest {
  id_token: string
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
    student_price_paise: number
    validity: string
  }
  fest_days: FestDay[]
  purchases_enabled: boolean
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
export type ScoringStatus = 'NOT_APPLICABLE' | 'OPEN' | 'FINALIZED'

export interface EventItem {
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
}

export interface TeamDetail {
  id: string
  event_id: string
  name: string
  leader_id: string
  status: TeamStatus
  created_at: number
  updated_at: number
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
  created_at: number
}

export interface Registration {
  id: string
  event_id: string
  team_id: string | null
  participant_id: string
  status: 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
  seat_count: number
  created_at: number
  updated_at: number
  event_title?: string
  event_category?: string
  day_of_event?: number
  event_venue?: string | null
  team_name?: string | null
}

export interface PurchaseDetail {
  id: string
  buyer_id: string
  total_amount_paise: number
  status: PurchaseStatus
  payment_method: 'UPI' | 'FREE' | null
  reservation_expires_at: number | null
  fulfillment_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  fulfillment_attempts: number
  fulfillment_last_error: string | null
  idempotency_key: string | null
  student_policy_acknowledged_at: number | null
  created_at: number
  updated_at: number
  items: PurchaseItem[]
  registrations: Registration[]
}

export interface PaymentInstructions {
  purchase_id: string
  amount_paise: number
  amount_rupees: string
  payee_vpa: string
  payee_name: string
  upi_uri: string
  reservation_expires_at: number | null
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ON_HOLD' | 'WITHDRAWN'

export interface PaymentRecord {
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

export interface DerivedTicketValidity {
  valid_from: number
  valid_to: number
  state: 'VALID' | 'UPCOMING' | 'EXPIRED' | 'REVOKED' | 'REPLACED'
  is_currently_valid: boolean
}

export interface DigitalTicket {
  id: string
  purchase_item_id: string
  purchase_id: string
  ticket_type: ItemType
  tier: PriceTier
  status: 'ACTIVE' | 'REVOKED' | 'REPLACED'
  validity: DerivedTicketValidity
  qr_token: string // Format: tx1.<ticket_id>.<qr_version>.<hmac_signature>
  qr_version: number
  event_checked_in_at: number | null
  purchase: {
    id: string
    payment_status: PurchaseStatus
    total_amount_paise: number
  }
  event: {
    id: string
    title: string
    category: string
    venue: string | null
    day_of_event: number
    starts_at: number
    ends_at: number
  } | null
  student_id_warning: string | null
  created_at: number
  updated_at: number
}

export interface PreparingTicket {
  purchase_id: string
  status: 'PREPARING' | 'FAILED'
  fulfillment_status: string
  message: string
  can_retry: boolean
  retry_endpoint: string
  attempts: number
  last_error: string | null
}

export interface UserTicketsResponse {
  tickets: DigitalTicket[]
  preparing_tickets: PreparingTicket[]
}

export type ScanVerdict =
  | 'VALID'
  | 'ALREADY_USED'
  | 'EXPIRED'
  | 'NOT_YET_VALID'
  | 'REVOKED'
  | 'PAYMENT_NOT_APPROVED'
  | 'WRONG_EVENT'
  | 'WRONG_TICKET_TYPE'
  | 'INVALID'

export interface ScanLookupResult {
  verdict: ScanVerdict
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
  event_id: string | null
  student_id_checked: boolean
  admitted_at: number
  idempotent_replay?: boolean
}

export interface ScanDenyResult {
  success: boolean
  verdict: 'DENIED'
  ticket_id: string
  log_id: string
  context: 'GATE' | 'EVENT'
  reason: string
  denied_at: number
  idempotent_replay?: boolean
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
```

---

## 4. Master API Route Directory

All 35+ backend routes are documented with full request/response schemas in the modular API guides:

| Module | Endpoints Covered | Documentation Guide |
|---|---|---|
| **01. Auth & Profile** | `/health`, `/ready`, `/api/auth/register`, `/login`, `/google`, `/logout`, `/api/me`, `/api/me/profile` | [📘 Module 01 Guide](./api/01-auth-and-profile.md) |
| **02. Catalog & Events** | `/api/catalog/passes`, `/api/events` (List, Detail, Update), `/api/leaderboards`, `/api/events/:id/leaderboard` | [📘 Module 02 Guide](./api/02-catalog-events-leaderboards.md) |
| **03. Teams & Invites** | `/api/teams` (Create, Detail, Cancel), `/api/teams/:id/invites`, `/api/teams/:id/members/:mId`, `/api/me/teams`, `/api/me/team-invites`, `/api/team-invites/:mId/accept`, `/decline` | [📘 Module 03 Guide](./api/03-teams-and-invitations.md) |
| **04. Purchases & Tickets**| `/api/purchases` (Create, List, Detail, Cancel, Retry), `/api/purchases/:id/payment-instructions`, `/payment`, `/api/payments/:id/withdraw`, `/api/registrations`, `/api/tickets/me`, `/api/tickets/:id` | [📘 Module 04 Guide](./api/04-purchases-payments-tickets.md) |
| **05. Staff Scanner & Scoring** | `/api/staff/scan/lookup`, `/admit`, `/deny`, `/api/staff/events/:id/scores` (GET, PUT, POST, DELETE), `/finalize` | [📘 Module 05 Guide](./api/05-staff-portal.md) |
| **06. Admin & Reviewers** | `/api/admin/payments` (Queue, Detail, Approve, Reject, Hold, Unhold, Resubmit), `/api/admin/users`, `/api/admin/events`, `/api/admin/purchases`, `/api/admin/tickets`, `/api/admin/registrations`, `/api/admin/settings`, `/api/admin/fest-days`, `/api/admin/reports/*`, `/api/admin/audit-logs` | [📘 Module 06 Guide](./api/06-admin-portal.md) |

### Master Route Index Table

| HTTP Method | Route Endpoint | Permission / Role Required | Description & Link |
|---|---|---|---|
| `GET` | `/health` / `/api/health` | Public | [Runtime health check](./api/01-auth-and-profile.md#21-health-check) |
| `GET` | `/ready` / `/api/ready` | Public | [Database ping readiness check](./api/01-auth-and-profile.md#22-readiness-check-database-ping) |
| `POST` | `/api/auth/google` | Public | [Google ID token sign-in/up](./api/01-auth-and-profile.md#31-google-one-tap--sign-in-with-google) |
| `POST` | `/api/auth/register` | Public | [Email/password account creation](./api/01-auth-and-profile.md#32-register-with-email--password) |
| `POST` | `/api/auth/login` | Public | [Email/password authentication](./api/01-auth-and-profile.md#33-login-with-email--password) |
| `POST` | `/api/auth/logout` | Session Required | [Session revocation & cookie clearance](./api/01-auth-and-profile.md#34-logout) |
| `GET` | `/api/me` | Session Required | [Current user profile & completeness status](./api/01-auth-and-profile.md#41-get-current-user-profile) |
| `PATCH`| `/api/me/profile` | Session Required | [Update profile details & student info](./api/01-auth-and-profile.md#42-update-user-profile) |
| `GET` | `/api/catalog/passes` | Public | [Festival catalog, gate pass pricing & days](./api/02-catalog-events-leaderboards.md#21-get-festival-passes--configuration) |
| `GET` | `/api/events` | Optional Session | [List events with category/day/team search](./api/02-catalog-events-leaderboards.md#31-list-events-search-filter--pagination) |
| `GET` | `/api/events/:idOrSlug` | Optional Session | [Single event details by ID or slug](./api/02-catalog-events-leaderboards.md#32-get-single-event-details) |
| `PATCH`| `/api/events/:id` | Staff Lead / Super Admin | [Update event venue, description, or capacity](./api/02-catalog-events-leaderboards.md#33-update-event-staff-lead--admin) |
| `GET` | `/api/leaderboards` | Public | [List public esports leaderboards](./api/02-catalog-events-leaderboards.md#41-list-public-leaderboards) |
| `GET` | `/api/events/:id/leaderboard` | Optional Session | [Real-time event scoreboard (with tie ranks)](./api/02-catalog-events-leaderboards.md#42-get-event-public-leaderboard) |
| `POST` | `/api/teams` | Profile Complete | [Create a team for an event](./api/03-teams-and-invitations.md#21-create-team) |
| `GET` | `/api/teams/:id` | Team Member / Staff | [Get team roster and member statuses](./api/03-teams-and-invitations.md#22-get-team-details--roster) |
| `DELETE`| `/api/teams/:id` | Team Leader / Super Admin | [Disband / cancel draft team](./api/03-teams-and-invitations.md#23-disband--cancel-team) |
| `POST` | `/api/teams/:id/invites` | Team Leader | [Invite member by email](./api/03-teams-and-invitations.md#31-invite-teammate-by-email) |
| `DELETE`| `/api/teams/:id/members/:mId` | Leader or Self | [Remove member or leave team](./api/03-teams-and-invitations.md#32-remove-member-or-cancel-invitation) |
| `POST` | `/api/team-invites/:mId/accept` | Profile Complete | [Accept team invitation](./api/03-teams-and-invitations.md#41-accept-team-invitation) |
| `POST` | `/api/team-invites/:mId/decline` | Session Required | [Decline team invitation](./api/03-teams-and-invitations.md#42-decline-team-invitation) |
| `GET` | `/api/me/teams` | Session Required | [List current user's active teams](./api/03-teams-and-invitations.md#51-get-my-teams) |
| `GET` | `/api/me/team-invites` | Session Required | [List pending invitations waiting for response](./api/03-teams-and-invitations.md#52-get-my-pending-team-invitations) |
| `POST` | `/api/purchases` | Profile Complete | [Create 15-min pass reservation hold](./api/04-purchases-payments-tickets.md#21-create-purchase-reservation) |
| `GET` | `/api/purchases` | Session Required | [List all purchases made by user](./api/04-purchases-payments-tickets.md#22-list-users-purchases) |
| `GET` | `/api/purchases/:id` | Buyer / Super Admin | [Get detailed purchase status & items](./api/04-purchases-payments-tickets.md#23-get-purchase-details) |
| `POST` | `/api/purchases/:id/cancel`| Buyer / Super Admin | [Release reservation slots and cancel](./api/04-purchases-payments-tickets.md#24-cancel-purchase-reservation) |
| `POST` | `/api/purchases/:id/retry-fulfillment` | Buyer / Super Admin | [Retry ticket generation for paid purchase](./api/04-purchases-payments-tickets.md#25-retry-ticket-fulfillment) |
| `GET` | `/api/purchases/:id/payment-instructions` | Buyer / Super Admin | [Fetch UPI VPA, QR URI, and amount](./api/04-purchases-payments-tickets.md#31-get-payment-instructions--upi-deep-link) |
| `POST` | `/api/purchases/:id/payment` | Profile Complete | [Submit 12-digit UPI UTR for verification](./api/04-purchases-payments-tickets.md#32-submit-upi-transaction-id-utr) |
| `POST` | `/api/payments/:id/withdraw`| Buyer Only | [Withdraw submitted UTR to correct it](./api/04-purchases-payments-tickets.md#33-withdraw-payment-submission) |
| `GET` | `/api/registrations` | Session Required | [List user's solo and team registrations](./api/04-purchases-payments-tickets.md#41-get-my-event-registrations) |
| `GET` | `/api/tickets/me` / `/api/me/tickets` | Session Required | [Fetch owned tickets with signed QR tokens](./api/04-purchases-payments-tickets.md#42-get-my-digital-tickets) |
| `GET` | `/api/tickets/:id` | Beneficiary / Admin | [Get single ticket details and validity](./api/04-purchases-payments-tickets.md#43-get-single-ticket-details) |
| `POST` | `/api/staff/scan/lookup` | Staff / Volunteer | [Inspect ticket validity before admitting](./api/05-staff-portal.md#12-lookup-ticket-pre-admit-inspection) |
| `POST` | `/api/staff/scan/admit` | Staff / Volunteer | [Admit attendee at Gate or Event](./api/05-staff-portal.md#13-admit-attendee) |
| `POST` | `/api/staff/scan/deny` | Staff / Volunteer | [Record denial log with reason](./api/05-staff-portal.md#14-deny-entry) |
| `GET` | `/api/staff/events/:id/scores` | Staff / Super Admin | [View full score matrix and edit history](./api/05-staff-portal.md#22-get-staff-scores--audit-history) |
| `PUT` | `/api/staff/events/:id/scores` | Staff / Super Admin | [Upsert round score with optimistic lock](./api/05-staff-portal.md#23-create-or-update-score-upsert) |
| `DELETE`| `/api/staff/events/:id/scores/:eId` | Staff Lead / Admin | [Delete score entry with mandatory reason](./api/05-staff-portal.md#24-delete-score-entry) |
| `POST` | `/api/staff/events/:id/scores/finalize` | Staff Lead / Admin | [Finalize and lock event tournament scoring](./api/05-staff-portal.md#25-finalize-event-scoring) |
| `GET` | `/api/admin/payments` | Payment Reviewer | [Manual UPI verification review queue](./api/06-admin-portal.md#21-get-review-queue) |
| `GET` | `/api/admin/payments/:id` | Payment Reviewer | [Get payment detail and purchase breakdown](./api/06-admin-portal.md#22-get-payment-detail) |
| `POST` | `/api/admin/payments/:id/approve` | Payment Reviewer | [Approve payment & issue tickets](./api/06-admin-portal.md#23-approve-payment) |
| `POST` | `/api/admin/payments/:id/reject` | Payment Reviewer | [Reject payment with reason](./api/06-admin-portal.md#24-reject-payment) |
| `POST` | `/api/admin/payments/:id/hold` | Payment Reviewer | [Put payment on hold](./api/06-admin-portal.md#25-put-payment-on-hold) |
| `POST` | `/api/admin/payments/:id/unhold` | Payment Reviewer | [Return on-hold payment to active queue](./api/06-admin-portal.md#26-unhold-payment) |
| `POST` | `/api/admin/payments/:id/resubmit` | Payment Reviewer | [Resubmit corrected UTR on attendee behalf](./api/06-admin-portal.md#27-resubmit-payment-staff-assisted) |
| `POST` | `/api/admin/users/pre-register` | Super Admin | [Pre-register staff roles before Google login](./api/06-admin-portal.md#31-pre-register-staff-member) |
| `GET` | `/api/admin/users` | Super Admin | [List users with search and role filters](./api/06-admin-portal.md#32-list-users) |
| `GET` | `/api/admin/users/:id` | Super Admin | [Get user details and staff assignments](./api/06-admin-portal.md#33-get-user-detail) |
| `PATCH`| `/api/admin/users/:id` | Super Admin | [Update role, active status, or permissions](./api/06-admin-portal.md#34-update-user-role-permissions-active-status) |
| `POST` | `/api/admin/events` | Super Admin | [Create new festival event](./api/06-admin-portal.md#41-create-event) |
| `POST` | `/api/admin/events/:id/staff` | Super Admin | [Assign lead or volunteer to event](./api/06-admin-portal.md#42-assign-staff-to-event) |
| `DELETE`| `/api/admin/events/:id/staff/:uId` | Super Admin | [Remove staff assignment from event](./api/06-admin-portal.md#43-remove-staff-from-event) |
| `GET` | `/api/admin/events/:id/staff` | Super Admin | [List staff assigned to event](./api/06-admin-portal.md#44-list-staff-assigned-to-event) |
| `POST` | `/api/admin/events/:id/scores/reopen` | Super Admin | [Reopen finalized scores for dispute fix](./api/06-admin-portal.md#45-reopen-finalized-e-sports-scores) |
| `GET` | `/api/admin/purchases` | Payment Reviewer | [List all festival purchases](./api/06-admin-portal.md#51-list-all-festival-purchases) |
| `POST` | `/api/admin/purchases/:id/retry-fulfillment` | Payment Reviewer | [Force retry ticket generation for paid order](./api/06-admin-portal.md#52-force-ticket-fulfillment-retry) |
| `GET` | `/api/admin/tickets/:id` | Super Admin | [Get ticket details with full scan history](./api/06-admin-portal.md#61-get-ticket-detail--full-check-in-log-history) |
| `POST` | `/api/admin/tickets/:id/revoke` | Super Admin | [Revoke ticket](./api/06-admin-portal.md#62-revoke-ticket) |
| `POST` | `/api/admin/tickets/:id/reissue` | Super Admin | [Reissue ticket or transfer ownership](./api/06-admin-portal.md#63-reissue-ticket-or-transfer-to-new-beneficiary) |
| `POST` | `/api/admin/tickets/:id/rotate-qr` | Super Admin | [Rotate QR code version](./api/06-admin-portal.md#64-rotate-ticket-qr-code) |
| `POST` | `/api/admin/tickets/:id/undo-checkin` | Super Admin | [Undo accidental event admission](./api/06-admin-portal.md#65-undo-event-check-in-check-in-override) |
| `POST` | `/api/admin/registrations/:id/cancel` | Super Admin | [Cancel registration and release seats](./api/06-admin-portal.md#71-cancel-registration) |
| `POST` | `/api/admin/registrations/:id/replace-member` | Super Admin | [Substitute a team registration member](./api/06-admin-portal.md#72-replace-registration-member) |
| `GET` | `/api/admin/settings` | Super Admin | [Get festival configuration map](./api/06-admin-portal.md#81-get-global-settings) |
| `PATCH`| `/api/admin/settings` | Super Admin | [Update festival configuration](./api/06-admin-portal.md#82-update-global-settings) |
| `GET` | `/api/admin/fest-days` | Super Admin | [Get festival days schedule](./api/06-admin-portal.md#83-get--update-fest-days) |
| `PATCH`| `/api/admin/fest-days/:dNo` | Super Admin | [Update single festival day schedule](./api/06-admin-portal.md#83-get--update-fest-days) |
| `GET` | `/api/admin/gate-staff` | Super Admin | [List assigned gate staff](./api/06-admin-portal.md#84-gate-staff-assignments) |
| `POST` | `/api/admin/gate-staff` | Super Admin | [Assign gate staff volunteer](./api/06-admin-portal.md#84-gate-staff-assignments) |
| `DELETE`| `/api/admin/gate-staff/:uId` | Super Admin | [Remove gate staff assignment](./api/06-admin-portal.md#84-gate-staff-assignments) |
| `GET` | `/api/admin/reports/sales` | Super Admin | [Revenue and pass sales metrics](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/reports/pending-verification` | Super Admin | [Review queue backlog and overdue alerts](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/reports/registrations` | Super Admin | [Seat counts per event report](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/reports/reconciliation` | Super Admin | [Capacity discrepancy audit report](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `POST` | `/api/admin/reports/reconciliation/:id/fix`| Super Admin | [Recount and reset event seats_taken](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/reports/attendance` | Super Admin | [Gate & event physical attendance counts](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/reports/failed-fulfillment` | Super Admin | [Orders with failed ticket preparation](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/reports/student-tier` | Super Admin | [Student vs general demographic report](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/reports/duplicate-institutions` | Super Admin | [Suspected duplicate student roll numbers](./api/06-admin-portal.md#9-business-intelligence-reports-apiadminreports) |
| `GET` | `/api/admin/audit-logs` | Super Admin | [Immutable system audit trail](./api/06-admin-portal.md#10-immutable-audit-logs-apiadminaudit-logs) |

---

## 5. Error Handling & User Notification Matrix

When `response.success === false`, inspect `error.code` to show targeted UI alerts:

| Error Code | HTTP Status | Recommended UI Notification & Action |
|---|---|---|
| `UNAUTHORIZED` | 401 | Open Sign-In Dialog: *"Your session has expired. Please sign in."* |
| `INVALID_QR_SIGNATURE`| 401 | **Scanner Red Banner**: *"FAKE OR TAMPERED QR CODE! Signature verification failed."* |
| `PROFILE_INCOMPLETE` | 403 | Open Profile Completion Modal: *"Please complete your profile to continue."* |
| `STUDENT_FIELDS_LOCKED`| 403 | Warning Toast: *"Student details are verified and locked. Contact support for changes."* |
| `ACCOUNT_DISABLED` | 403 | Full Screen Alert: *"Your account has been deactivated. Contact administration."* |
| `CSRF_ORIGIN_INVALID` | 403 | Toast: *"Request rejected due to invalid origin header."* |
| `FORBIDDEN` | 403 | Toast: *"You do not have permission to perform this action."* |
| `NOT_FOUND` | 404 | Empty state or 404 page: *"The requested resource was not found."* |
| `CAPACITY_FULL` | 409 | Error Banner: *"Sorry! This event or pass is completely sold out."* |
| `ALREADY_LEADER` | 409 | Toast: *"You are already leading an active team for this event."* |
| `TEAM_NAME_TAKEN` | 409 | Form Error under Name: *"This team name is already taken for this event."* |
| `MEMBER_ALREADY_IN_TEAM`| 409 | Form Error: *"This user is already in an active team for this event."* |
| `MEMBER_ALREADY_INVITED`| 409 | Toast: *"This user is already invited or a member of your team."* |
| `ALREADY_REGISTERED` | 409 | Toast: *"User is already registered for this event."* |
| `UTR_ALREADY_USED` | 409 | Form Error: *"This transaction ID has already been submitted for another payment."* |
| `PAYMENT_ALREADY_SUBMITTED`| 409| Toast: *"A payment submission is already under review for this purchase."* |
| `ALREADY_CHECKED_IN` | 409 | **Scanner Red Screen**: *"TICKET ALREADY USED! Admitted earlier."* |
| `SCORE_VERSION_CONFLICT`| 409 | Modal: *"This score was modified by another referee concurrently. Reloading data..."* |
| `RATE_LIMITED` | 429 | Toast: *"Too many requests. Please wait a few seconds before trying again."* |
| `DATABASE_UNAVAILABLE`| 500 | Error Screen: *"Service temporarily unavailable. Please try again shortly."* |

---

## 6. Frontend Coding Agent Implementation Checklist

When instructing an AI coding agent or engineering team to build the frontend, execute in this order:

1. **Bootstrap & Project Core**:
   - Initialize Next.js 14/15 App Router or Vite + React with TypeScript strict mode and Tailwind CSS.
   - Install dependencies: `@tanstack/react-query`, `lucide-react`, `react-hook-form`, `zod`, `qrcode.react`, `html5-qrcode`.
   - Copy domain types into `types/api.ts` from Section 3.
   - Copy `lib/api-client.ts` from Section 2.3.
2. **Auth & Profile Layer**:
   - Build Google Sign-in component (`/login`, `/register`) using Google Identity Services SDK.
   - Implement Auth Provider using `GET /api/me` with React Query (`staleTime: 5 * 60 * 1000`).
   - Implement Profile Completion Modal triggered whenever `user.profile_complete === false` during checkout/registration attempts.
   - Implement student verification toggle with ID field disabling when `student_fields_locked === true`.
3. **Public Catalog & Events**:
   - Build Fest Landing Page with Festival Day timeline and Gate Pass CTA card (`GET /api/catalog/passes`).
   - Build Events Directory with Category pills, Day filters, Solo/Team toggle, and instant search (`GET /api/events`).
   - Build Event Detail page (`/events/[slug]`) with dynamic CTA (Solo Register vs Create Team).
   - Build Public E-Sports Leaderboard screen (`/leaderboards` & `/events/[id]/leaderboard`).
4. **Teams & Invitations**:
   - Build Team Management view (`/me/teams` and `/teams/[id]`).
   - Build Team Invites inbox (`/me/team-invites`) with Accept / Decline actions.
   - Display roster status and readiness indicators (highlighting members with incomplete profiles).
5. **Checkout & Manual UPI Payments**:
   - Build Checkout flow (`/checkout`) validating 0 pending invites and team size boundaries.
   - Build Pay screen (`/checkout/[id]/pay`) with active 15-minute countdown timer, UPI QR code, mobile intent deep link, and 12-digit UTR submission form.
   - Build Status screen (`/checkout/[id]/status`) polling purchase status until approved.
6. **Digital Pass Presentation**:
   - Build My Tickets screen (`/me/tickets`) rendering high-contrast QR codes (`ticket.qr_token`).
   - Render physical college ID check reminder banner for student tier tickets.
   - Support retry button if any ticket preparation is in `FAILED` status.
7. **Staff Scanner PWA**:
   - Build Scanner camera view (`/staff/scan`) using `html5-qrcode`.
   - Implement toggle for **GATE Entry** (multi-entry) vs **EVENT Entry** (single-use).
   - Implement lookup modal showing verdict, attendee name, and mandatory **"Physically verified student ID card"** confirmation checkbox for student tier passes.
8. **Staff E-Sports Scoring**:
   - Build round-by-round score matrix table (`/staff/events/[id]/scores`) with optimistic concurrency handling.
   - Implement score edit dialog requiring reason and tracking `expected_version`.
   - Implement tournament scoring finalization.
9. **Admin & Reviewer Portal**:
   - Build Payment Verification Queue (`/admin/payments`) with quick Approve / Reject / Hold modal actions.
   - Build Event Management dashboard (`/admin/events`) for creating events and assigning staff.
   - Build Attendance and Financial Sales report dashboards (`/admin/reports/*`).

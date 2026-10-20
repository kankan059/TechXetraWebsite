# TechXetra — Complete Frontend Specification & Agent Prompt Guide

> **Agent Directive**: This document is a complete, self-contained specification designed to be fed directly into an AI coding agent (e.g. Antigravity, Cursor, Claude, Devin) to build the entire frontend web application for **TechXetra** from scratch. It contains the application architecture, complete TypeScript schemas, API client implementation, full endpoint specifications, UX state flows, and error handling.

---

## 1. System & Project Architecture

### 1.1 Application Overview
**TechXetra** is the annual technical fest of Tezpur University. The frontend consists of three interconnected modules in a single responsive web application:
1. **Participant Portal**: Public event discovery, Google Sign-in, user profile management (with student ID verification lock), team formation/invitations, pass checkout (15-min atomic reservation), manual UPI payment submission (UTR), and digital ticket presentation (signed QR codes).
2. **Staff Scanner PWA**: High-throughput gate and event check-in scanner for volunteers and leads with instant camera scanning, physical student ID checking, and double-scan prevention.
3. **Admin & Staff Portal**: Reviewer dashboard for manual UPI payment verification (approving/rejecting UTR submissions), e-sports round-by-round tournament scorekeeping, event management, and audit reports.

### 1.2 Recommended Frontend Tech Stack
- **Framework**: Next.js 14/15 (App Router) or Vite + React 18+ (SPA)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS + Shadcn UI (or Radix UI primitives)
- **Icons**: Lucide React
- **State & Server Cache**: `@tanstack/react-query` (TanStack Query v5) for all API queries/mutations
- **Form Validation**: `react-hook-form` + `zod`
- **QR Utilities**:
  - Generator: `qrcode.react` (SVG/Canvas rendering for tickets and UPI intents)
  - Scanner: `html5-qrcode` (webcam/PWA camera barcode reader)

---

## 2. Global Communication & API Client

### 2.1 Protocol Rules
- **Base URL**: Default to `http://localhost:8787` in development, or `NEXT_PUBLIC_API_URL` / `VITE_API_URL`.
- **Credentials**: **MANDATORY** `credentials: 'include'` on all HTTP requests. The backend uses secure HttpOnly session cookies (`__Host-session` in production, `session` in dev).
- **CORS & CSRF**: All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the browser's standard `Origin` header matching `FRONTEND_ORIGIN` (default: `http://localhost:3000`).
- **Idempotency**: All purchase and payment submission mutations support and recommend sending an `Idempotency-Key: <uuid-v4>` header.

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
  verdict: 'VALID' | 'ALREADY_USED' | 'EXPIRED' | 'NOT_YET_VALID' | 'REVOKED' | 'PAYMENT_NOT_APPROVED' | 'WRONG_EVENT' | 'WRONG_TICKET_TYPE' | 'INVALID'
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
```

---

## 4. Frontend Route Map & Page Structure

Build the application with the following pages:

```
src/app/ (or src/pages/)
├── (public)/
│   ├── page.tsx                     # Landing page with Fest Hero, Day timeline & Pass CTA
│   ├── catalog/page.tsx             # Gate Pass pricing & festival overview
│   ├── events/page.tsx              # Event directory with Category filters & search
│   ├── events/[slug]/page.tsx       # Event detail, solo register / create team button
│   └── leaderboards/page.tsx        # Public E-Sports live scoreboards
│
├── (participant)/                   # Protected: requires active session
│   ├── me/page.tsx                  # Profile overview & completeness check
│   ├── me/profile/page.tsx          # Edit profile (handles student lock logic)
│   ├── me/teams/page.tsx            # My teams & pending invites (accept/decline)
│   ├── me/tickets/page.tsx          # My passes & QR code modal
│   │
│   └── checkout/                    # 15-minute checkout reservation flow
│       ├── page.tsx                 # Cart / Pass selection review
│       ├── [id]/pay/page.tsx        # UPI QR Code, intent link, timer & UTR entry
│       └── [id]/status/page.tsx     # Payment pending review / ticket ready confirmation
│
├── (staff)/                         # Protected: role in ['VOLUNTEER', 'LEAD', 'SUPER_ADMIN']
│   ├── staff/scan/page.tsx          # QR Scanner PWA (camera view, lookup modal, Admit)
│   └── staff/events/[id]/scores/page.tsx # E-Sports round score entry & leaderboard finalize
│
└── (admin)/                         # Protected: role === 'SUPER_ADMIN' or can_review_payments
    ├── admin/payments/page.tsx      # Manual UPI verification queue (Approve/Reject/Hold)
    ├── admin/events/page.tsx        # Event creator & capacity editor
    └── admin/reports/page.tsx       # Sales, attendance & audit reports
```

---

## 5. Step-by-Step Feature Specifications

### 5.1 Authentication & Profile Setup
1. **Google Login**:
   - Render the Google Sign-In button using Google Identity Services SDK (`window.google.accounts.id`).
   - On credential response, post token to `POST /api/auth/google` with `{ id_token: credential }`.
   - On success, query `GET /api/me`.
2. **Profile Completion Gate**:
   - Inspect `profile.profile_complete`.
   - If `false`, intercept navigation to `/checkout` or `/events` registration with a modal prompting for:
     - Name (2–100 chars)
     - Phone: 10-digit Indian number (`/^[6-9]\d{9}$/`)
     - Is Student? Toggle checkbox:
       - If checked: `institution_name` (2–100 chars) and `institution_id` (1–40 chars)
   - Save via `PATCH /api/me/profile`.
3. **Student Fields Lock Rule**:
   - If `user.student_fields_locked === true`, disable the student toggle, institution name, and institution ID inputs.
   - Display a badge: *"Student status verified & locked. To update, contact festival administration."*

### 5.2 Purchasing & 15-Minute Reservation Timer
1. **Creating the Purchase**:
   - Call `POST /api/purchases` with:
     ```json
     {
       "items": [{ "item_type": "GATE_PASS" }],
       "acknowledge_student_id_policy": true
     }
     ```
   - Send an `Idempotency-Key` header with a generated UUID.
   - If successful, backend returns `status: 'AWAITING_PAYMENT'` and `reservation_expires_at` (15 minutes from creation).
2. **Payment Page (`/checkout/[id]/pay`)**:
   - Fetch `GET /api/purchases/:id/payment-instructions`.
   - **Start Countdown Timer**: Compare `reservation_expires_at` to `Date.now()`. Display active MM:SS timer.
   - If timer hits 00:00: Disable inputs, display *"Reservation Expired. Slots have been released"*, and offer a *"Start Over"* button.
   - **Render UPI QR Code**: Render `upi_intent_uri` using `QRCode` component.
   - **Mobile Deep Link**: Provide a button `<a href={upi_intent_uri}>Pay with UPI App</a>`.
   - **UTR Form**: Input for 12-digit transaction ID. Submit to `POST /api/purchases/:id/payment`.
   - Redirect to `/checkout/[id]/status` upon submission.

### 5.3 Presenting Digital Tickets (`/me/tickets`)
1. Fetch `GET /api/tickets/me`.
2. Display ticket cards with:
   - Pass Title ("Gate Pass — 3 Day" or Event Title).
   - Validity dates (e.g. "Nov 6 - Nov 8, 2026").
   - Large, high-contrast QR Code containing `ticket.qr_token`.
   - If `ticket.physical_id_required === true`, render an alert banner:
     > ⚠️ **Physical ID Required**: You must present your original college ID card at the gate along with this QR code.

### 5.4 Staff Scanner PWA (`/staff/scan`)
Designed for mobile phones using `html5-qrcode`:
1. **Scanner View**:
   - Toggle context: **GATE Entry** (multi-entry) vs **EVENT Entry** (single-use).
   - If EVENT entry: dropdown selector for event.
2. **Scan Event Flow**:
   - When camera detects a QR code token (starts with `tx1.`):
     - Trigger haptic feedback (vibrate 50ms).
     - Call `POST /api/staff/scan/lookup` with `{ token, context, event_id }`.
   - Modal pops up showing:
     - Attendee Name & Status (`VALID`, `ALREADY_USED`, `INVALID`).
     - Student Check Flag: If `requires_id_check: true`, show a large red warning checkbox: **"Physically verified student ID card"**.
   - Scanner presses **"Admit Attendee"**:
     - Call `POST /api/staff/scan/admit` with `{ token, context, event_id, student_id_checked, client_scan_id }`.
     - Play success audio chime & flash green.
   - If attendee is denied:
     - Call `POST /api/staff/scan/deny` with `{ token, context, reason }`.
     - Flash red.

### 5.5 Reviewer Dashboard (`/admin/payments`)
For staff with `can_review_payments: true`:
1. Fetch `GET /api/admin/payments?status=PENDING`.
2. Table shows: Buyer name, email, amount (₹), submitted UTR, submission timestamp.
3. Reviewer checks bank statement:
   - **Approve**: `POST /api/admin/payments/:id/approve` -> instantly fulfills tickets.
   - **Reject**: `POST /api/admin/payments/:id/reject` -> modal asking for rejection reason and whether to cancel the reservation or let participant retry UTR.
   - **Hold**: `POST /api/admin/payments/:id/hold`.

---

## 6. Complete API Endpoint Reference Table

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/health` | None | API health check |
| `POST` | `/api/auth/google` | None | Exchange Google ID token for session cookie |
| `POST` | `/api/auth/logout` | Session | Revoke session and clear cookie |
| `GET` | `/api/me` | Session | Fetch user profile & completeness status |
| `PATCH` | `/api/me/profile` | Session | Update profile (name, phone, student fields) |
| `GET` | `/api/catalog/passes` | None | Gate pass prices, festival dates, policy notes |
| `GET` | `/api/events` | None | List events (filterable by category, day, team) |
| `GET` | `/api/events/:idOrSlug` | None | Single event details |
| `GET` | `/api/events/:id/leaderboard` | None | Live public esports tournament leaderboard |
| `POST` | `/api/teams` | Profile Complete | Create team for an event |
| `GET` | `/api/teams/:id` | Session | Get team info and roster |
| `POST` | `/api/teams/:id/invites` | Profile Complete | Invite teammate by email |
| `DELETE` | `/api/teams/:id/members/:mId`| Session | Remove team member or cancel invite |
| `DELETE` | `/api/teams/:id` | Session | Disband/cancel draft team |
| `GET` | `/api/me/teams` | Session | List teams user is part of |
| `GET` | `/api/me/team-invites` | Session | List pending team invitations |
| `POST` | `/api/team-invites/:mId/accept`| Profile Complete | Accept team invite |
| `POST` | `/api/team-invites/:mId/decline`| Session | Decline team invite |
| `POST` | `/api/purchases` | Profile Complete | Create purchase reservation (15m timer) |
| `GET` | `/api/purchases` | Session | List current user's purchases |
| `GET` | `/api/purchases/:id` | Session | Get detailed purchase status & items |
| `POST` | `/api/purchases/:id/cancel`| Session | Release reservation & cancel purchase |
| `GET` | `/api/purchases/:id/payment-instructions` | Session | Get UPI VPA, QR URI, and instructions |
| `POST` | `/api/purchases/:id/payment` | Profile Complete | Submit 12-digit UPI UTR |
| `POST` | `/api/payments/:id/withdraw` | Session | Withdraw pending UTR submission |
| `GET` | `/api/tickets/me` | Session | Fetch all owned tickets with signed QR tokens |
| `GET` | `/api/tickets/:id` | Session | Fetch single ticket details |
| `POST` | `/api/staff/scan/lookup` | Staff | Look up ticket details by QR token |
| `POST` | `/api/staff/scan/admit` | Staff | Admit attendee at Gate or Event |
| `POST` | `/api/staff/scan/deny` | Staff | Deny entry and record audit reason |
| `GET` | `/api/staff/events/:id/scores` | Staff | Fetch round scores & audit trail |
| `PUT` | `/api/staff/events/:id/scores` | Staff | Upsert round score with optimistic version |
| `POST` | `/api/staff/events/:id/scores/finalize` | Staff Lead | Finalize esports scoring |
| `GET` | `/api/admin/payments` | Reviewer | Review queue for manual UPI payments |
| `POST` | `/api/admin/payments/:id/approve` | Reviewer | Approve payment & fulfill tickets |
| `POST` | `/api/admin/payments/:id/reject` | Reviewer | Reject payment with reason |
| `GET` | `/api/admin/reports/sales` | Super Admin | Sales & revenue metrics |
| `GET` | `/api/admin/reports/attendance` | Super Admin | Gate & event attendance log metrics |

---

## 7. Error Handling & User Notification Matrix

Inspect `error.code` when `response.success === false`:

| Error Code | HTTP Status | Recommended UI Notification |
|---|---|---|
| `UNAUTHORIZED` | 401 | Open Google Login Modal: *"Your session has expired. Please sign in."* |
| `PROFILE_INCOMPLETE` | 403 | Open Profile Completion Modal: *"Please complete your profile to continue."* |
| `STUDENT_FIELDS_LOCKED`| 403 | Warning Toast: *"Student details are verified and locked. Contact support for changes."* |
| `CAPACITY_FULL` | 409 | Error Banner: *"Sorry! This event or pass is completely sold out."* |
| `ALREADY_LEADER` | 409 | Toast: *"You are already leading an active team for this event."* |
| `TEAM_NAME_TAKEN` | 409 | Form Error: *"This team name is already taken. Please choose another."* |
| `MEMBER_ALREADY_IN_TEAM` | 409 | Form Error: *"This user is already in a team for this event."* |
| `UTR_ALREADY_USED` | 409 | Form Error: *"This transaction ID has already been submitted for another payment."* |
| `ALREADY_CHECKED_IN` | 409 | **Scanner Red Screen**: *"TICKET ALREADY USED! Admitted earlier."* |
| `INVALID_QR_SIGNATURE`| 401 | **Scanner Red Screen**: *"FAKE OR TAMPERED QR CODE! Signature verification failed."* |
| `RATE_LIMITED` | 429 | Toast: *"Too many scans. Please wait 5 seconds before trying again."* |

---

## 8. Frontend Coding Agent Implementation Checklist

When you give this document to a coding agent, instruct it to:
1. Initialize the project with Next.js App Router, Tailwind CSS, and TanStack Query.
2. Create `types/api.ts` with all types from Section 3.
3. Create `lib/api-client.ts` with the turnkey client from Section 2.3.
4. Build the Auth Provider and Google Sign-in component.
5. Build the Checkout Page with the dynamic 15-minute reservation timer and UPI QR display.
6. Build the My Tickets screen with the signed QR code viewer.
7. Build the Staff Scanner PWA screen using `html5-qrcode`.
8. Build the Reviewer Dashboard for approving/rejecting manual UPI payments.

# TechXetra — Frontend Audit & Backend Handoff Specification

> **Status**: Verified Frontend Baseline (`tsc`: 0 errors, `eslint`: 0 errors, `next build`: 18/18 routes passed).

---

## 1. Executive Summary & Verification Baseline

This document provides the definitive integration contract, architectural audit, and security boundary specification for backend developers implementing APIs for **TechXetra 2026**.

### 1.1 Baseline Health Checks

| Check                | Tool / Command               | Exit Code | Diagnostic Result                                              |
| -------------------- | ---------------------------- | --------- | -------------------------------------------------------------- |
| **Type Validation**  | `npx tsc --noEmit`           | `0`       | Clean — 0 TypeScript diagnostic errors.                        |
| **Linting**          | `npm run lint` (`eslint`)    | `0`       | Clean — 0 errors (13 warnings in legacy canvas/carousel code). |
| **Production Build** | `npx next build` (Turbopack) | `0`       | All 18 application routes compiled and prerendered cleanly.    |

---

## 2. Feature Implementation Audit

Each feature has been audited against the codebase with concrete file references and evidence.

| Feature Area                      | Status                           | Relevant Files                                                                             | Frontend Evidence & Notes                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public Event Discovery**        | **Implemented & Verified**       | `components/sections/events/*`, `app/events/*`                                             | Hero cards, GSAP horizontal scroll, and technical event listings render static data from `data/info/event.ts`. Dynamic event catalog API (`GET /api/events`) is proposed below.                                                   |
| **Google Authentication**         | **Implemented & Verified**       | `components/auth/GoogleSignInButton.tsx`, `lib/auth-context.tsx`                           | Google Identity Services (GSI) script mounts official Google Sign-In button when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is present. Token exchanged via `POST /api/auth/google`.                                                          |
| **Session Restoration**           | **Implemented & Verified**       | `lib/auth-context.tsx:43-85`                                                               | On application mount, frontend calls `GET /api/me` with `credentials: 'include'`. 401s default to guest mode; server 5xx errors record state and do not silently mask outages.                                                    |
| **User Profile Management**       | **Implemented & Verified**       | `components/auth/ProfileCompletionModal.tsx`, `app/me/page.tsx`, `app/me/profile/page.tsx` | Profile completeness evaluated client-side. Updates submitted via `PUT /api/me/profile` with Zod validation. Institution fields locked if `student_fields_locked === true`.                                                       |
| **Gate Pass Selection & Pricing** | **Implemented & Verified**       | `app/checkout/page.tsx`                                                                    | Queries `GET /api/catalog/passes`. Evaluates `user.is_student` to display standard vs. student pricing. Enforces physical student ID policy acknowledgement checkbox.                                                             |
| **15-Min Atomic Reservation**     | **Implemented & Verified**       | `app/checkout/page.tsx:36-62`                                                              | Sends `POST /api/purchases` with UUIDv4 `Idempotency-Key`. Redirects to `/checkout/[id]/pay` on success. Catches `PROFILE_INCOMPLETE` (opens modal) and `CAPACITY_FULL` (disables checkout).                                      |
| **UPI QR & UTR Submission**       | **Implemented & Verified**       | `app/checkout/[id]/pay/page.tsx`                                                           | Fetches `GET /api/purchases/:id/payment-instructions`. Renders high-contrast SVG QR code via `QRCodeSVG`, countdown timer (MM:SS), and validates 12-digit numeric UTR before calling `POST /api/purchases/:id/payment`.           |
| **Payment Status Polling**        | **Implemented & Verified**       | `app/checkout/[id]/status/page.tsx`                                                        | Polls `GET /api/purchases/:id` every 10 seconds while `status === 'PENDING_VERIFICATION'`. Automatically transitions to verified (link to tickets) or expired/rejected state.                                                     |
| **Digital Ticket Presentation**   | **Implemented & Verified**       | `app/me/tickets/page.tsx`                                                                  | Fetches `GET /api/tickets/me`. Renders ticket cards with validity date ranges, physical college ID requirements, and high-contrast signed QR token modal (`tx1.xxx`).                                                             |
| **Staff Scanner PWA**             | **Implemented & Verified**       | `app/staff/scan/page.tsx`                                                                  | Back-facing camera scanner using `html5-qrcode` at 10 FPS with haptic feedback. Calls `POST /api/staff/scan/lookup`, parses color-coded verdict, checks physical ID toggle, and executes `POST /api/staff/scan/admit` or `/deny`. |
| **Admin Payment Review**          | **Implemented & Verified**       | `app/admin/payments/page.tsx`                                                              | Auto-refreshes pending submissions (`GET /api/admin/payments?status=PENDING`) every 30s. Implements single-click `Approve`, `Hold`, and `Reject` (with modal for reason and slot cancellation toggle).                            |
| **Team Formation & Invitations**  | **Missing / Blocked by Backend** | N/A                                                                                        | Feature mentioned in high-level fest concept, but no frontend team invitation pages or endpoints exist yet. Requires backend team data model first.                                                                               |
| **Tournament Scoring & Brackets** | **Missing / Not in Scope**       | N/A                                                                                        | No active scoring or esports bracket components exist in the repository.                                                                                                                                                          |

---

## 3. Comprehensive API Integration Contract

All frontend requests use the unified fetch wrapper [lib/api-client.ts](file:///d:/VS%20Code/TechXetra/TechXetraWebsite/lib/api-client.ts) pointing to `NEXT_PUBLIC_API_URL` (default: `http://localhost:8787`).

### Standard Response Envelopes

#### Success Envelope (`HTTP 200 / 201`)

```json
{
  "success": true,
  "data": { ... },
  "request_id": "req_abc123"
}
```

#### Error Envelope (`HTTP 4xx / 5xx`)

```json
{
  "success": false,
  "error": {
    "code": "CAPACITY_FULL",
    "message": "Gate passes are completely sold out.",
    "details": null
  },
  "request_id": "req_abc123"
}
```

---

### Endpoint Specifications

#### 1. Session & Identity

##### `GET /api/me`

- **Call Site**: `lib/auth-context.tsx:46`
- **Auth**: Required (`Cookie: techxetra_session=<token>`).
- **Response `data`**:
  ```ts
  interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    phone: string | null;
    is_student: boolean;
    institution_name: string | null;
    institution_id: string | null;
    student_fields_locked: boolean;
    role: "PARTICIPANT" | "VOLUNTEER" | "LEAD" | "SUPER_ADMIN";
    can_review_payments: boolean;
    profile_complete: boolean;
    missing_fields: string[];
  }
  ```
- **Error Handling**: `401 Unauthorized` transitions frontend to unauthenticated guest mode without error banners. `5xx` sets error state.

##### `POST /api/auth/google`

- **Call Site**: `lib/auth-context.tsx:142`
- **Auth**: Public.
- **Request Body**:
  ```json
  { "id_token": "<google_jwt_credential>" }
  ```
- **Expected Behavior**: Backend verifies Google ID token, provisions/updates user record, sets `HttpOnly`, `SameSite=Lax`, `Secure` session cookie `techxetra_session`.
- **Response `data`**: `{ "user": UserProfile }`

##### `POST /api/auth/logout`

- **Call Site**: `lib/auth-context.tsx:164`
- **Auth**: Required.
- **Response**: `HTTP 200` with `{ "success": true }` or `HTTP 204 No Content`. Backend clears session cookie.

##### `PUT /api/me/profile`

- **Call Site**: `components/auth/ProfileCompletionModal.tsx:121`
- **Auth**: Required.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "phone": "+919876543210",
    "is_student": true,
    "institution_name": "Tezpur University",
    "institution_id": "CSB22001"
  }
  ```
- **Response `data`**: `UserProfile`

---

#### 2. Catalog & Purchases

##### `GET /api/catalog/passes`

- **Call Site**: `app/checkout/page.tsx:28`
- **Auth**: Public or Optional.
- **Response `data`**:
  ```ts
  interface FestCatalog {
    gate_pass: {
      price_paise: number; // e.g. 49900 (₹499)
      student_price_paise: number | null; // e.g. 29900 (₹299)
      validity: string; // "3-Day Festival Pass"
    };
    fest_days: Array<{
      day_number: 1 | 2 | 3;
      date: string; // "2026-11-06"
      starts_at: number; // Unix timestamp ms
      ends_at: number; // Unix timestamp ms
      description: string | null;
    }>;
    purchases_enabled: boolean | string;
    student_id_warning_text: string;
    support_contact: string;
  }
  ```

##### `POST /api/purchases`

- **Call Site**: `app/checkout/page.tsx:39`
- **Auth**: Required.
- **Headers**: `Idempotency-Key: <UUIDv4>`
- **Request Body**:
  ```json
  {
    "items": [{ "item_type": "GATE_PASS" }],
    "acknowledge_student_id_policy": true
  }
  ```
- **Backend Responsibility**: Atomically decrements available capacity and holds an unconfirmed purchase slot for 15 minutes.
- **Response `data`**:
  ```ts
  interface PurchaseDetail {
    id: string;
    user_id: string;
    status:
      | "INITIATED"
      | "PENDING_VERIFICATION"
      | "VERIFIED"
      | "CANCELLED"
      | "EXPIRED";
    total_amount_paise: number;
    items: Array<{ item_type: string; price_paise: number }>;
    expires_at: number; // UTC ms (current_time + 15 min)
    created_at: number;
  }
  ```
- **Known Error Codes**:
  - `PROFILE_INCOMPLETE`: Frontend automatically intercepts and opens the profile completion modal.
  - `CAPACITY_FULL`: Displays sold-out notice.
  - `STUDENT_ID_POLICY_UNACKNOWLEDGED`: Rejection if policy flag is missing.

##### `GET /api/purchases/:id/payment-instructions`

- **Call Site**: `app/checkout/[id]/pay/page.tsx:50`
- **Auth**: Required (User must own purchase).
- **Response `data`**:
  ```ts
  interface PaymentInstructions {
    purchase_id: string;
    amount_paise: number;
    formatted_amount: string; // "₹299"
    payee_name: string; // "TechXetra 2026"
    upi_vpa: string; // "techxetra@upi"
    upi_intent_uri: string; // "upi://pay?pa=techxetra@upi&pn=TechXetra&am=299&cu=INR"
    expires_at_ms: number; // Timestamp when countdown reaches 00:00
    instructions: string[];
  }
  ```

##### `POST /api/purchases/:id/payment`

- **Call Site**: `app/checkout/[id]/pay/page.tsx:78`
- **Auth**: Required.
- **Headers**: `Idempotency-Key: <UUIDv4>`
- **Request Body**:
  ```json
  { "transaction_id": "123456789012" }
  ```
- **Validation**: Frontend guarantees 12 numeric digits (`/^\d{12}$/`). Backend must enforce uniqueness to prevent duplicate UTR claims.
- **Response `data`**:
  ```ts
  interface PaymentRecord {
    id: string;
    purchase_id: string;
    transaction_id: string;
    status: "SUBMITTED" | "UNDER_REVIEW";
    submitted_at: number;
  }
  ```
- **Known Error Codes**: `DUPLICATE_TRANSACTION_ID`, `RESERVATION_EXPIRED`.

##### `GET /api/purchases/:id`

- **Call Site**: `app/checkout/[id]/status/page.tsx:18`
- **Auth**: Required.
- **Polling Frequency**: Frontend polls every 10 seconds while `status === 'PENDING_VERIFICATION'`.
- **Response `data`**: `PurchaseDetail`

---

#### 3. Tickets

##### `GET /api/tickets/me`

- **Call Site**: `app/me/tickets/page.tsx:226`
- **Auth**: Required.
- **Response `data`**:
  ```ts
  interface DigitalTicket {
    id: string;
    ticket_type: "GATE_PASS" | "EVENT_PASS";
    qr_token: string; // "tx1.e30.jwt_signature"
    valid_from: number; // Unix ms
    valid_to: number; // Unix ms
    physical_id_required: boolean;
    status: "ACTIVE" | "USED" | "REVOKED";
    event?: {
      id: string;
      title: string;
      category: string;
      venue: string;
    };
  }
  ```

---

#### 4. Staff Scanner PWA

##### `POST /api/staff/scan/lookup`

- **Call Site**: `app/staff/scan/page.tsx:350`
- **Auth**: Required (`role: VOLUNTEER | LEAD | SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "token": "tx1.abc123signedtoken",
    "context": {
      "scan_type": "GATE",
      "event_id": null,
      "fest_day": 1
    }
  }
  ```
- **Response `data`**:
  ```ts
  interface ScanLookupResult {
    verdict:
      | "VALID"
      | "ALREADY_USED"
      | "EXPIRED"
      | "NOT_YET_VALID"
      | "REVOKED"
      | "PAYMENT_NOT_APPROVED"
      | "WRONG_EVENT"
      | "WRONG_TICKET_TYPE";
    message: string;
    attendee: {
      name: string;
      email: string;
      phone: string | null;
      institution_name: string | null;
      institution_id: string | null;
      physical_id_required: boolean;
    };
    ticket: {
      id: string;
      ticket_type: "GATE_PASS" | "EVENT_PASS";
      last_scanned_at: number | null;
      scan_count: number;
    };
  }
  ```

##### `POST /api/staff/scan/admit`

- **Call Site**: `app/staff/scan/page.tsx:162`
- **Auth**: Required (`role: VOLUNTEER | LEAD | SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "token": "tx1.abc123signedtoken",
    "context": { "scan_type": "GATE", "fest_day": 1 }
  }
  ```
- **Response `data`**:
  ```json
  {
    "admitted": true,
    "timestamp": 1792485000000,
    "scan_count": 1
  }
  ```

##### `POST /api/staff/scan/deny`

- **Call Site**: `app/staff/scan/page.tsx:200`
- **Auth**: Required (`role: VOLUNTEER | LEAD | SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "token": "tx1.abc123signedtoken",
    "reason": "Physical student ID card does not match name"
  }
  ```
- **Response**: `{ "success": true }`

---

#### 5. Admin Payments Queue

##### `GET /api/admin/payments?status=PENDING`

- **Call Site**: `app/admin/payments/page.tsx:191`
- **Auth**: Required (`can_review_payments === true`).
- **Polling Frequency**: Auto-refetches every 30 seconds.
- **Response `data`**:
  ```ts
  interface AdminPaymentQueueItem {
    id: string;
    purchase_id: string;
    buyer_name: string;
    buyer_email: string;
    expected_amount_paise: number;
    transaction_id: string; // 12-digit UTR
    created_at: number; // Unix ms
    status: "PENDING" | "HELD" | "APPROVED" | "REJECTED";
  }
  ```

##### `POST /api/admin/payments/:id/approve`

- **Call Site**: `app/admin/payments/page.tsx:201`
- **Auth**: Required (`can_review_payments === true`).
- **Backend Action**: Transitions purchase to `VERIFIED`, provisions digital ticket with cryptographic QR token, and invalidates attendee's pending status.
- **Response**: `{ "success": true }`

##### `POST /api/admin/payments/:id/hold`

- **Call Site**: `app/admin/payments/page.tsx:210`
- **Auth**: Required (`can_review_payments === true`).
- **Response**: `{ "success": true }`

##### `POST /api/admin/payments/:id/reject`

- **Call Site**: `app/admin/payments/page.tsx:227`
- **Auth**: Required (`can_review_payments === true`).
- **Request Body**:
  ```json
  {
    "reason": "UTR not found in bank statement",
    "cancel_reservation": true
  }
  ```
- **Response**: `{ "success": true }`

---

## 4. Security & Transaction Boundaries

### 4.1 Authorization & Role Boundaries

- **UI Role Checks Are Advisory Only**: Client-side gates (e.g. `user?.can_review_payments` or `isStaff`) are purely for navigation and component visibility. The backend **must** validate the session cookie on every single request to `/api/staff/*` and `/api/admin/*`.
- **Production Guard on Development Role Override**:
  - `NEXT_PUBLIC_DEV_USER_ROLE` and `signInWithMock()` are strictly guarded:
    ```ts
    if (process.env.NODE_ENV === "production") {
      console.warn("Mock login is disabled in production builds.");
      return;
    }
    ```
  - In production builds (`NODE_ENV === 'production'`), mock logins are disabled and role assignments are exclusively derived from server-side database records.

### 4.2 Financial & Capacity Integrity

- **Zero Client Price Trust**: The frontend does not send `price_paise` in `POST /api/purchases`. The backend must look up the canonical price in the database based on the authenticated user's `is_student` status.
- **Atomic 15-Minute Reservation Expiry**: When `POST /api/purchases` succeeds, the backend must increment a reserved counter or set a row lock with a 15-minute TTL. If `POST /api/purchases/:id/payment` is not submitted before `expires_at`, the slot must be automatically returned to the public pool.
- **Idempotency Protection**: All mutation endpoints accept the `Idempotency-Key` header. Duplicate requests with identical keys must return the original cached response without re-executing reservations or payment submissions.
- **Anti-Fraud UTR Deduplication**: The backend must enforce a unique database constraint on `transaction_id`. Attempting to submit a previously recorded UTR must immediately reject with code `DUPLICATE_TRANSACTION_ID`.
- **QR Token Cryptography**: QR tokens must follow the `tx1.` prefix format and contain an HMAC-SHA256 signature signed with a server-side secret key to prevent counterfeit QR generation.

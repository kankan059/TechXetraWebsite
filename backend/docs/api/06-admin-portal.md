# Module 06: Admin & Reviewer Portal APIs

This document covers all administrative and reviewer endpoints: manual UPI payment verification, user management, event creation & staff assignments, purchase supervision, ticket lifecycle controls (revoke, reissue, QR rotation, undo check-in), registration management, festival settings & days, business intelligence reports, and immutable audit logs.

---

## 1. Access Control & Authorization Roles

The backend provides two levels of administrative privileges:
1. **Payment Reviewer (`can_review_payments === true`)**:
   - Access to manual UPI payment review queue (`/api/admin/payments/*`).
   - Access to purchase supervision and ticket fulfillment retry (`/api/admin/purchases/*`).
   - **Anti-Self-Dealing Invariant**: Reviewers cannot approve, reject, or modify their own payment submissions.
2. **Super Administrator (`role === 'SUPER_ADMIN'`)**:
   - Complete festival management: user promotion/demotion/deactivation, event creation, capacity adjustments, ticket revocation/reissuance, check-in overrides, fest settings, financial & attendance reports, and audit logs.

---

## 2. Manual Payment Verification (`/api/admin/payments`)

### 2.1 Get Review Queue
Lists payment submissions with filtering by status and text search (buyer name, email, UTR).

- **Method**: `GET`
- **Path**: `/api/admin/payments`
- **Authentication**: Payment Reviewer or Super Admin Session Required

#### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | `string` | No | Filter by payment status: `'PENDING'`, `'ON_HOLD'`, `'SUCCESS'`, `'FAILED'`, `'WITHDRAWN'` (default: all) |
| `search` | `string` | No | Search query matching UTR transaction ID, buyer name, or email |
| `cursor` | `string` | No | Cursor for pagination |
| `limit` | `integer` | No | 1 to 50 items per page (default: `20`) |

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pay_01j8n25p8x40cd",
        "purchase_id": "pur_01j8n12k5m30ab",
        "expected_amount_paise": 20000,
        "transaction_id": "429812345678",
        "status": "PENDING",
        "reviewer_id": null,
        "reviewed_at": null,
        "rejection_reason": null,
        "created_at": 1729433800000,
        "buyer_id": "usr_01j8k92b4m10ac",
        "buyer_name": "Priyanku Sharma",
        "buyer_email": "student@tezu.ac.in",
        "buyer_phone": "9876543210"
      }
    ],
    "next_cursor": null
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 2.2 Get Payment Detail
Fetches complete details for a single payment, including the full purchase breakdown, items, registrations, and reviewer notes.

- **Method**: `GET`
- **Path**: `/api/admin/payments/:id`
- **Authentication**: Payment Reviewer Session Required
- **Path Parameters**:
  - `id`: Payment UUID (`pay_...`).

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "pay_01j8n25p8x40cd",
    "purchase_id": "pur_01j8n12k5m30ab",
    "expected_amount_paise": 20000,
    "transaction_id": "429812345678",
    "status": "PENDING",
    "reviewer_id": null,
    "reviewed_at": null,
    "rejection_reason": null,
    "internal_note": null,
    "created_at": 1729433800000,
    "updated_at": 1729433800000,
    "buyer": {
      "id": "usr_01j8k92b4m10ac",
      "name": "Priyanku Sharma",
      "email": "student@tezu.ac.in",
      "phone": "9876543210",
      "is_student": true,
      "institution_name": "Tezpur University",
      "institution_id": "CSB22001"
    },
    "purchase": {
      "id": "pur_01j8n12k5m30ab",
      "total_amount_paise": 20000,
      "status": "PENDING_VERIFICATION",
      "items": [ ... ]
    }
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 2.3 Approve Payment
Approves the payment after the reviewer verifies fund receipt in the festival bank statement.
- **Durable Payment Truth**: Marks payment as `SUCCESS` and purchase as `PAID`.
- **Automatic Ticket Generation**: Instantly prepares and issues signed digital tickets.
- **Student Profile Lock**: If any student tier pass was purchased, locks the buyer's `student_fields_locked` flag to `true`.
- **Self-Review Block**: Reviewers cannot approve their own payments (`403 FORBIDDEN`).

- **Method**: `POST`
- **Path**: `/api/admin/payments/:id/approve`
- **Authentication**: Payment Reviewer Session Required
- **Path Parameters**:
  - `id`: Payment UUID.

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "pay_01j8n25p8x40cd",
    "purchase_id": "pur_01j8n12k5m30ab",
    "expected_amount_paise": 20000,
    "transaction_id": "429812345678",
    "status": "SUCCESS",
    "reviewer_id": "usr_reviewer_01",
    "reviewed_at": 1729434500000,
    "rejection_reason": null,
    "internal_note": null
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `403` | `FORBIDDEN` | Reviewer attempted to approve their own purchase. |
| `404` | `NOT_FOUND` | Payment does not exist. |
| `409` | `CONFLICT` | Payment is already approved (`SUCCESS`) or was withdrawn. |

---

### 2.4 Reject Payment
Rejects a payment submission (e.g. invalid UTR, fake screenshot, incorrect amount).

- **Method**: `POST`
- **Path**: `/api/admin/payments/:id/reject`
- **Authentication**: Payment Reviewer Session Required
- **Path Parameters**:
  - `id`: Payment UUID.

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | `string` | **Yes** | Rejection reason shown to attendee (2 to 500 chars) |
| `internal_note` | `string` | Optional | Internal staff note (max 1000 chars) |
| `cancel_purchase` | `boolean` | Optional | If `true`, cancels purchase and releases held slots. If `false`, allows attendee to retry UTR submission. |

```json
{
  "reason": "UTR not found in festival bank statement. Please verify the 12-digit transaction number.",
  "internal_note": "Checked statement through 11:30 AM, no credit of ₹200.",
  "cancel_purchase": false
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "pay_01j8n25p8x40cd",
    "status": "FAILED",
    "rejection_reason": "UTR not found in festival bank statement. Please verify the 12-digit transaction number.",
    "reviewed_at": 1729434600000
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 2.5 Put Payment on Hold
Places a payment in `ON_HOLD` status (e.g. awaiting inter-bank IMPS settlement).

- **Method**: `POST`
- **Path**: `/api/admin/payments/:id/hold`
- **Authentication**: Payment Reviewer Session Required
- **Request Body**: `{ "reason"?: string, "internal_note"?: string }`

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "pay_01j8n25p8x40cd",
    "status": "ON_HOLD",
    "internal_note": "Pending banking server reconciliation"
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 2.6 Unhold Payment
Returns an on-hold payment back to the active `PENDING` review queue.

- **Method**: `POST`
- **Path**: `/api/admin/payments/:id/unhold`
- **Authentication**: Payment Reviewer Session Required

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "pay_01j8n25p8x40cd",
    "status": "PENDING"
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 2.7 Resubmit Payment (Staff Assisted)
Allows a reviewer to submit a corrected UTR on behalf of an attendee for a failed payment.

- **Method**: `POST`
- **Path**: `/api/admin/payments/:id/resubmit`
- **Authentication**: Payment Reviewer Session Required
- **Request Body**: `{ "transaction_id": "429898765432" }`
- **Status**: `201 Created`

---

## 3. User Management (`/api/admin/users`)

All endpoints in this section require `SUPER_ADMIN` session.

### 3.1 Pre-Register Staff Member
Pre-configures a user role (e.g. creating a `LEAD` or granting `can_review_payments: true`) before the person signs in for the first time with Google. When they log in, their account automatically inherits the pre-assigned role.

- **Method**: `POST`
- **Path**: `/api/admin/users/pre-register`
- **Authentication**: Super Admin Only

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | **Yes** | User's primary email address |
| `name` | `string` | **Yes** | Full name (2 to 100 characters) |
| `role` | `string` | **Yes** | `'PARTICIPANT'`, `'VOLUNTEER'`, `'LEAD'`, `'SUPER_ADMIN'` |
| `can_review_payments` | `boolean` | Optional | Grant manual UPI payment review permissions |

```json
{
  "email": "reviewer@tezu.ac.in",
  "name": "Finance Lead",
  "role": "LEAD",
  "can_review_payments": true
}
```

#### Success Response
- **Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8n90a1b20cd",
    "email": "reviewer@tezu.ac.in",
    "name": "Finance Lead",
    "role": "LEAD",
    "can_review_payments": true,
    "profile_complete": false
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 3.2 List Users
Lists users with search, role filtering, active status filtering, and cursor pagination.

- **Method**: `GET`
- **Path**: `/api/admin/users`
- **Authentication**: Super Admin Only

#### Query Parameters
- `search`: string (matches name, email, institution name, or ID).
- `role`: `'PARTICIPANT' | 'VOLUNTEER' | 'LEAD' | 'SUPER_ADMIN'`.
- `is_active`: boolean (`true` / `false`).
- `can_review_payments`: boolean (`true` / `false`).
- `limit`: integer 1 to 100 (default: 20).
- `cursor`: opaque cursor string.

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "users": [ ... ],
    "next_cursor": "1729433800000:usr_01j8..."
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 3.3 Get User Detail
Fetches detailed info for a single user, including assigned events, gate staff assignment status, and active session count.

- **Method**: `GET`
- **Path**: `/api/admin/users/:id`
- **Authentication**: Super Admin Only

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8k92b4m10ac",
    "email": "student@tezu.ac.in",
    "name": "Priyanku Sharma",
    "role": "LEAD",
    "can_review_payments": false,
    "is_active": 1,
    "event_staff_assignments": [
      {
        "role": "LEAD",
        "assigned_at": 1729432000000,
        "event_id": "evt_01j8k92b4m10ac",
        "event_title": "Robo Wars: Heavyweight Arena",
        "event_category": "TECHNICAL"
      }
    ],
    "is_gate_staff": false,
    "active_sessions_count": 2
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 3.4 Update User (Role, Permissions, Active Status)
Updates a user's role, deactivates an account, or toggles payment review access.
- **Deactivation Cascade**: Setting `is_active: false` immediately revokes all of the user's active sessions in the database.
- **Safety Invariant**: Super admins cannot demote their own role or deactivate their own account.
- **Role Invariant**: Participants cannot be granted `can_review_payments` without elevating their role to `VOLUNTEER`, `LEAD`, or `SUPER_ADMIN`.

- **Method**: `PATCH` (or `POST`)
- **Path**: `/api/admin/users/:id`
- **Authentication**: Super Admin Only

#### Request Body Schema
| Field | Type | Description |
|---|---|---|
| `role` | `string` | `'PARTICIPANT'`, `'VOLUNTEER'`, `'LEAD'`, `'SUPER_ADMIN'` |
| `can_review_payments` | `boolean` | Payment review privilege |
| `is_active` | `boolean` | Set `false` to immediately block login and revoke sessions |
| `reason` | `string` | Optional reason for audit log |

```json
{
  "role": "VOLUNTEER",
  "can_review_payments": false,
  "is_active": true,
  "reason": "Assigned to Gate 1 Scanner crew"
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8k92b4m10ac",
    "role": "VOLUNTEER",
    "can_review_payments": false,
    "is_active": true
  },
  "request_id": "req_01j7xyz..."
}
```

---

## 4. Event Management & Staff Assignment (`/api/admin/events`)

All endpoints in this section require `SUPER_ADMIN` session.

### 4.1 Create Event
Creates a new festival event.

- **Method**: `POST`
- **Path**: `/api/admin/events`
- **Authentication**: Super Admin Only

#### Request Body Schema
| Field | Type | Required | Validation / Description |
|---|---|---|---|
| `slug` | `string` | **Yes** | 3 to 50 chars, lowercase alphanumeric with hyphens (`/^[a-z0-9-]+$/`) |
| `title` | `string` | **Yes** | 3 to 100 characters |
| `category` | `string` | **Yes** | EventCategory enum |
| `day_of_event` | `integer` | **Yes** | 1, 2, or 3 |
| `starts_at` | `integer` | **Yes** | Epoch ms |
| `ends_at` | `integer` | **Yes** | Epoch ms |
| `status` | `string` | Optional | `'DRAFT'` (default), `'OPEN'`, `'CLOSED'`, `'COMPLETED'`, `'CANCELLED'` |
| `is_team_event` | `boolean` | Optional | Default `false` |
| `min_team_size` | `integer` | Optional | Default 1 (1 to 50) |
| `max_team_size` | `integer` | Optional | Default 1 (1 to 50) |
| `price_model` | `string` | Optional | `'FREE'`, `'PER_PARTICIPANT'`, `'PER_TEAM'` |
| `price_paise` | `integer` | Optional | Non-negative integer (default 0) |
| `student_price_paise` | `integer \| null`| Optional| Discounted student price |
| `capacity` | `integer \| null`| Optional| Max capacity or null for unlimited |
| `capacity_unit` | `string` | Optional | `'SEATS'` or `'TEAMS'` |
| `scoring_enabled` | `boolean` | Optional | E-Sports only |
| `scoring_status` | `string` | Optional | `'NOT_APPLICABLE'`, `'OPEN'`, `'FINALIZED'` |
| `max_rounds` | `integer` | Optional | 1 to 20 |
| `volunteers_can_score` | `boolean` | Optional | Whether volunteers may enter scores |
| `leaderboard_public` | `boolean` | Optional | Public scoreboard visibility |
| `metadata` | `string \| null` | Optional | JSON string or rules URL |

#### Success Response
- **Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "evt_01j8k92b4m10ac",
    "slug": "fifa-tournament-2026",
    "title": "EA Sports FC 2026 Championship",
    "category": "E_SPORTS",
    "status": "OPEN",
    "price_model": "FREE",
    "price_paise": 0
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 4.2 Assign Staff to Event
Assigns a user as `LEAD` or `VOLUNTEER` for a specific event.

- **Method**: `POST`
- **Path**: `/api/admin/events/:id/staff`
- **Authentication**: Super Admin Only
- **Request Body**:
  ```json
  {
    "user_id": "usr_01j8k92b4m10ac",
    "role": "LEAD"
  }
  ```
- **Success Status**: `201 Created`

---

### 4.3 Remove Staff from Event
- **Method**: `DELETE`
- **Path**: `/api/admin/events/:id/staff/:userId`
- **Authentication**: Super Admin Only
- **Success Status**: `200 OK` (`{ "removed": true }`)

---

### 4.4 List Staff Assigned to Event
- **Method**: `GET`
- **Path**: `/api/admin/events/:id/staff`
- **Authentication**: Super Admin Only
- **Success Status**: `200 OK`

---

### 4.5 Reopen Finalized E-Sports Scores
If an e-sports tournament was finalized by mistake or an official referee dispute requires score adjustments, Super Administrators can reopen the scoring (`FINALIZED -> OPEN`).

- **Method**: `POST`
- **Path**: `/api/admin/events/:id/scores/reopen`
- **Authentication**: Super Admin Only
- **Request Body**:
  ```json
  {
    "reason": "Referee dispute resolution: official tiebreaker required for 2nd place"
  }
  ```
- **Success Status**: `200 OK`

---

## 5. Purchase Supervision (`/api/admin/purchases`)

All endpoints in this section require `can_review_payments` or `SUPER_ADMIN`.

### 5.1 List All Festival Purchases
- **Method**: `GET`
- **Path**: `/api/admin/purchases`
- **Query Parameters**:
  - `status`: `'AWAITING_PAYMENT'`, `'PENDING_VERIFICATION'`, `'PAID'`, `'CANCELLED'`, `'EXPIRED'`.
  - `fulfillment_status`: `'NOT_STARTED'`, `'IN_PROGRESS'`, `'COMPLETED'`, `'FAILED'`.
  - `buyer_id`: Filter by buyer user UUID.
  - `limit`: 1 to 100.
  - `cursor`: string cursor.

---

### 5.2 Force Ticket Fulfillment Retry
Triggers ticket generation for any `PAID` purchase without owner rate limiting.

- **Method**: `POST`
- **Path**: `/api/admin/purchases/:id/retry-fulfillment`
- **Success Status**: `200 OK`

---

## 6. Ticket Management & Overrides (`/api/admin/tickets`)

All endpoints in this section require `SUPER_ADMIN` session.

### 6.1 Get Ticket Detail & Full Check-in Log History
Fetches complete ticket state, owner details, and the historical log of every scan attempt (Gate & Event) with scanner staff names.

- **Method**: `GET`
- **Path**: `/api/admin/tickets/:id`

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "tkt_01j8n45c2m10ab",
    "status": "ACTIVE",
    "beneficiary_name": "Priyanku Sharma",
    "beneficiary_email": "student@tezu.ac.in",
    "check_in_history": [
      {
        "id": "cil_01j8n60b1x90ab",
        "context": "GATE",
        "verdict": "ADMITTED",
        "student_id_checked": 1,
        "scanner_name": "Volunteer Alpha",
        "created_at": 1729434200000
      }
    ]
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 6.2 Revoke Ticket
Revokes an active ticket with mandatory reason.

- **Method**: `POST`
- **Path**: `/api/admin/tickets/:id/revoke`
- **Request Body**: `{ "reason": "Disciplinary action" }`
- **Success Status**: `200 OK`

---

### 6.3 Reissue Ticket (or Transfer to New Beneficiary)
Marks the old ticket `REPLACED` and issues a brand-new ticket with an updated HMAC QR code. Can optionally transfer ownership to `new_beneficiary_id`.

- **Method**: `POST`
- **Path**: `/api/admin/tickets/:id/reissue`
- **Request Body**:
  ```json
  {
    "reason": "Lost phone / attendee requested credential reset",
    "new_beneficiary_id": "usr_optional_new_owner"
  }
  ```
- **Success Status**: `201 Created`

---

### 6.4 Rotate Ticket QR Code
Increments `qr_version`, instantly invalidating previous screenshots or printed badges while keeping the ticket active.

- **Method**: `POST`
- **Path**: `/api/admin/tickets/:id/rotate-qr`
- **Request Body**: `{ "reason": "Attendee reported screenshot leaked" }`
- **Success Status**: `200 OK`

---

### 6.5 Undo Event Check-In (Check-In Override)
If an attendee was checked into an event by accident (e.g. wrong ticket scanned at the door), this endpoint clears `event_checked_in_at` and sets the check-in log verdict to `OVERRIDDEN`. The ticket can now be scanned and admitted properly.

- **Method**: `POST`
- **Path**: `/api/admin/tickets/:id/undo-checkin`
- **Request Body**: `{ "reason": "Scanned accidentally by door volunteer before bag check" }`
- **Success Status**: `200 OK`

---

## 7. Registration Management (`/api/admin/registrations`)

All endpoints in this section require `SUPER_ADMIN` session.

### 7.1 Cancel Registration
Cancels an event registration, decrements `seats_taken`, revokes active tickets for that registration, and disbands the team if it was a team registration.

- **Method**: `POST`
- **Path**: `/api/admin/registrations/:id/cancel`
- **Request Body**: `{ "reason": "Team withdrew from festival" }`
- **Success Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "cancelled": true,
    "registration_id": "reg_01j8n30a4b10ef",
    "freed_seats": 4
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 7.2 Replace Registration Member
Replaces a team member with a substitute attendee. Reissues the ticket to the substitute.
- **Safety**: Cannot replace a member whose ticket has already been checked into the event.

- **Method**: `POST`
- **Path**: `/api/admin/registrations/:id/replace-member`
- **Request Body**:
  ```json
  {
    "old_user_id": "usr_01j8old",
    "new_user_id": "usr_01j8new",
    "reason": "Medical emergency substitution approved by fest director"
  }
  ```
- **Success Status**: `200 OK`

---

## 8. Festival Settings & Gate Staff (`/api/admin`)

All endpoints in this section require `SUPER_ADMIN` session.

### 8.1 Get Global Settings
- **Method**: `GET`
- **Path**: `/api/admin/settings`

### 8.2 Update Global Settings
- **Method**: `PATCH`
- **Path**: `/api/admin/settings`
- **Request Body**:
  ```json
  {
    "gate_pass_price_paise": "35000",
    "purchases_enabled": "1",
    "support_contact": "help@techxetra.in"
  }
  ```

### 8.3 Get & Update Fest Days
- **`GET /api/admin/fest-days`**: Lists day schedules.
- **`PATCH /api/admin/fest-days/:dayNumber`**: Updates day date (`YYYY-MM-DD`), start/end timestamps, or description.

### 8.4 Gate Staff Assignments
- **`GET /api/admin/gate-staff`**: List assigned gate staff.
- **`POST /api/admin/gate-staff`**: Assign gate staff (`{ "user_id": "usr_..." }`).
- **`DELETE /api/admin/gate-staff/:userId`**: Remove gate staff assignment.

---

## 9. Business Intelligence Reports (`/api/admin/reports`)

All endpoints in this section require `SUPER_ADMIN` session.

| Endpoint | Method | What it Returns |
|---|---|---|
| `/api/admin/reports/sales` | `GET` | Gross revenue, paid totals (paise), items sold by pass type and tier. |
| `/api/admin/reports/pending-verification` | `GET` | Review queue backlog: pending count, oldest pending timestamp, overdue count (>24h). |
| `/api/admin/reports/registrations` | `GET` | Registration counts and confirmed/reserved seat totals per event. |
| `/api/admin/reports/reconciliation` | `GET` | Identifies seat discrepancy between `events.seats_taken` and active registration counts. |
| `/api/admin/reports/reconciliation/:id/fix` | `POST` | Atomically recalculates and resets `events.seats_taken` to match actual registration truth. |
| `/api/admin/reports/attendance` | `GET` | Gate admissions grouped by fest day, event check-in counts, and total unique attendees. |
| `/api/admin/reports/failed-fulfillment` | `GET` | List of paid purchases where ticket generation failed. |
| `/api/admin/reports/student-tier` | `GET` | Breakdown of student vs general users, passes, and items. |
| `/api/admin/reports/duplicate-institutions` | `GET` | Flags student roll numbers/IDs registered under multiple email addresses. |

---

## 10. Immutable Audit Logs (`/api/admin/audit-logs`)

Queries the tamper-proof system audit log.

- **Method**: `GET`
- **Path**: `/api/admin/audit-logs`
- **Authentication**: Super Admin Only

#### Query Parameters
- `actor_id`: User UUID who performed the action.
- `target_type`: Target entity type (e.g. `'PAYMENT'`, `'TICKET'`, `'EVENT'`, `'SETTINGS'`).
- `target_id`: ID of target record.
- `action`: Specific action string (e.g. `'PAYMENT_APPROVED'`, `'TICKET_REVOKED'`).
- `limit`: 1 to 100.
- `cursor`: Opaque pagination cursor.

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "aud_01j8n95c1b10ef",
        "actor_id": "usr_admin_01",
        "action": "PAYMENT_APPROVED",
        "target_type": "PAYMENT",
        "target_id": "pay_01j8n25p8x40cd",
        "before_json": "{\"status\":\"PENDING\"}",
        "after_json": "{\"status\":\"SUCCESS\"}",
        "reason": null,
        "ip_address": "203.0.113.195",
        "user_agent": "Mozilla/5.0 ...",
        "created_at": 1729434500000
      }
    ],
    "next_cursor": null
  },
  "request_id": "req_01j7xyz..."
}
```

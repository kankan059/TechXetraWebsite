# TechXetra 2026 — Frontend API Integration & Developer Guide

> **For the Frontend Team**: This document provides a complete reference of the frontend-to-backend communication architecture, available typed API clients, page routes, security rules, state machines, and error handling for **TechXetra 2026**.

---

## 1. System Architecture & Protocol Invariants

### 1.1 Mandatory Session Cookies (`credentials: 'include'`)
The backend does **NOT** use Bearer tokens in headers. Authentication relies on secure HttpOnly session cookies:
- **Production**: `__Host-session` (`Secure; HttpOnly; SameSite=Lax; Path=/`)
- **Development**: `session`
- **Rule**: Every HTTP request (`fetch`, Axios, or React Query) **must specify `credentials: 'include'`**.
- The turnkey client in `@/lib/api-client` already handles this automatically.

### 1.2 Environment Variables (`frontend/.env.local`)
```bash
# Backend Cloudflare Worker API URL
NEXT_PUBLIC_API_URL=http://localhost:8787

# Google OAuth Client ID for Google Identity Services SDK
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Ready-to-Use Typed API Clients

The frontend codebase provides three typed, plug-and-play service clients under `frontend/services/`:

### 2.1 Participant Client (`@/services/participant-api`)
```ts
import { participantApi } from "@/services/participant-api";

// 1. Auth & Profile
const user = await participantApi.auth.me();
await participantApi.auth.updateProfile({ name: "Jane", phone: "9876543210" });
await participantApi.auth.logout();

// 2. Catalog & Events
const catalog = await participantApi.catalog.passes(); // Fest pricing & dates
const events = await participantApi.events.list({ category: "TECHNICAL", day: 2, is_team: true });
const event = await participantApi.events.get("bgmi-championship-2026");
const leaderboards = await participantApi.events.leaderboards();
const scoreboard = await participantApi.events.eventLeaderboard("bgmi-championship-2026");

// 3. Teams & Invitations
const team = await participantApi.teams.create({ event_id: "evt_...", name: "CyberKnights" });
const teamRoster = await participantApi.teams.get("tm_...");
await participantApi.teams.invite("tm_...", "teammate@tezu.ac.in");
await participantApi.teams.removeMember("tm_...", "mId_...");
await participantApi.teams.disband("tm_...");
const myTeams = await participantApi.teams.myTeams();
const myInvites = await participantApi.teams.myInvites();
await participantApi.teams.acceptInvite("mId_...");
await participantApi.teams.declineInvite("mId_...");

// 4. Purchases, Payments & Tickets
const purchase = await participantApi.purchases.create({
  items: [{ item_type: "GATE_PASS" }],
  acknowledge_student_id_policy: true,
});
const instructions = await participantApi.purchases.paymentInstructions("pur_...");
await participantApi.purchases.submitPayment("pur_...", "429812345678"); // 12-digit UTR
await participantApi.purchases.withdrawPayment("pay_..."); // Pull back mistyped UTR
await participantApi.purchases.cancel("pur_..."); // Release reserved slots
await participantApi.purchases.retryFulfillment("pur_..."); // Retry pass generation
const myTickets = await participantApi.tickets.myTickets();
const myRegistrations = await participantApi.registrations.list();
```

### 2.2 Staff Client (`@/services/staff-api`)
```ts
import { staffApi } from "@/services/staff-api";

// 1. QR Code Ticket Scanner (Gate & Event context)
const lookup = await staffApi.scan.lookup({
  token: "tx1.tkt_01j8n45c2m10ab.1.aB39X_kd92P0kLQz2N",
  context: "GATE", // or "EVENT" with event_id
});

// Admit with mandatory physical student ID verification
await staffApi.scan.admit({
  token: "tx1...",
  context: "GATE",
  student_id_checked: true, // Required for STUDENT tier passes
});

// Deny entry with recorded reason
await staffApi.scan.deny({
  token: "tx1...",
  context: "GATE",
  reason: "Failed to produce physical college institution ID",
});

// 2. E-Sports Tournament Scoring
const scoreData = await staffApi.scores.get("evt_01j8k92b4m10ac");
await staffApi.scores.upsert("evt_...", {
  registration_id: "reg_...",
  round_no: 1,
  score: 35.5,
  expected_version: 1, // Required for updates to prevent concurrent overwrite
  reason: "Verified placement points", // Required for updates
});
await staffApi.scores.delete("evt_...", "scr_...", "Entered by error");
await staffApi.scores.finalize("evt_..."); // Locks scoreboard
```

### 2.3 Admin & Reviewer Client (`@/services/admin-api`)
```ts
import { adminApi } from "@/services/admin-api";

// 1. Manual UPI Review Queue
const queue = await adminApi.payments.list({ status: "PENDING", limit: 50 });
await adminApi.payments.approve("pay_01j8n...", { internal_note: "Verified on bank ledger" });
await adminApi.payments.reject("pay_01j8n...", { reason: "UTR not found in bank statement" });
await adminApi.payments.hold("pay_01j8n...", { reason: "Waiting for bank statement sync" });
await adminApi.payments.unhold("pay_01j8n...");
await adminApi.payments.resubmit("pay_01j8n...", { transaction_id: "429887654321" });

// 2. Users & Staff Management
const users = await adminApi.users.list({ role: "VOLUNTEER" });
await adminApi.users.preRegister({
  email: "volunteer@tezu.ac.in",
  name: "Arun Das",
  role: "VOLUNTEER",
  can_review_payments: false,
});
await adminApi.users.update("usr_...", { role: "LEAD", can_review_payments: true });

// 3. Reports & Analytics
const sales = await adminApi.reports.sales();
const pending = await adminApi.reports.pendingVerification();
const occupancy = await adminApi.reports.registrations();
const attendance = await adminApi.reports.attendance();
```

---

## 3. Frontend Route Map & Backend Endpoints

| Frontend Route | Primary User Role | Backend Endpoints Hooked | Core Functionality |
|---|---|---|---|
| `/` | Public | `GET /api/catalog/passes`, `GET /api/me` | Landing page, fest dates, gate pass pricing CTA |
| `/events` | Public | `GET /api/events`, `GET /api/catalog/passes` | View switcher: Featured 3D Tracks vs All Events Directory |
| `/events/directory` | Public | `GET /api/events`, `GET /api/catalog/passes` | Search bar, category pills, Day 1–3 filter, Solo/Team filter |
| `/events/[slug]` | Participant | `GET /api/events/:idOrSlug`, `POST /api/purchases`, `POST /api/teams` | Live seats remaining, solo registration, team creation modal |
| `/leaderboards` | Public | `GET /api/leaderboards` | Public listing of open esports tournaments |
| `/events/[slug]/leaderboard` | Public | `GET /api/events/:idOrSlug/leaderboard` | Real-time score standings with ties |
| `/teams` (and `/me/teams`) | Team Member | `GET /api/me/teams`, `POST /api/teams` | My Teams index: list active squads, create new team |
| `/teams/[id]` | Team Member | `GET /api/teams/:id`, `POST /invites`, `DELETE /members/:mId`, `DELETE /api/teams/:id` | Team workspace, roster lock status, disband, invite teammate |
| `/me/team-invites` | Participant | `GET /api/me/team-invites`, `POST /team-invites/:mId/accept`, `/decline` | Teammate invitation inbox with live accept/decline feedback |
| `/checkout` | Participant | `GET /api/catalog/passes`, `POST /api/purchases` | Gate pass reservation hold (general vs student pricing) |
| `/checkout/[id]/pay` | Buyer | `GET /api/purchases/:id`, `GET payment-instructions`, `POST /payment`, `POST /payments/:id/withdraw` | 15-min countdown, UPI QR code, deep link, 12-digit UTR, withdrawal |
| `/me/tickets` | Beneficiary | `GET /api/tickets/me`, `POST /api/purchases/:id/retry-fulfillment` | High-contrast QR token pass, student ID alert badge, fulfillment retry |
| `/dashboard` (and `/profile`) | Participant | `GET /api/me`, `GET /api/tickets/me`, `GET /api/me/teams`, `GET /api/purchases` | User profile overview, pass summary, teams, order history |
| `/profile-completion` | Participant | `GET /api/me`, `PATCH /api/me/profile` | Institutional ID, student toggle, phone lock rules |
| `/staff` | Staff / Volunteer | `GET /api/me`, `GET /api/events?category=E_SPORTS` | Staff portal hub: quick launch for scanner and esports tournaments |
| `/staff/scan` | Staff / Volunteer | `POST /api/staff/scan/lookup`, `POST /admit`, `POST /deny` | Gate / Event QR scanner with physical student ID check toggle |
| `/staff/events/[id]/scores` | Event Lead / Staff | `GET /api/staff/events/:id/scores`, `PUT /scores`, `DELETE /scores/:eId`, `POST /scores/finalize` | Round-by-round score matrix, optimistic lock versioning, audit history |
| `/test` | Developer / QA | `GET /api/me`, `POST /api/auth/logout` | Interactive testing hub & launchpad for every route and user role |
| `/admin` | Super Admin | `GET /api/admin/reports/*` | High-level overview: revenue, pending queue backlog, attendance |
| `/admin/payments` | Payment Reviewer | `GET /api/admin/payments`, `POST /approve`, `POST /reject`, `POST /hold`, `POST /resubmit` | Manual UPI review queue with instant modal actions |
| `/admin/users` | Super Admin | `GET /api/admin/users`, `POST /pre-register`, `PATCH /users/:id` | Pre-register staff roles, toggle permissions, deactivate users |
| `/admin/passes` | Super Admin | `GET /api/admin/reports/sales`, `GET /api/admin/purchases` | Pass sales by tier, order fulfillment monitoring |
| `/admin/registrations` | Super Admin | `GET /api/admin/reports/registrations` | Event capacity, confirmed seats, reserved holds |
| `/admin/attendance` | Super Admin | `GET /api/admin/reports/attendance` | Unique gate entries, day-by-day attendance |
| `/admin/compititions` | Super Admin | `GET /api/admin/events`, `POST /api/admin/events` | Event management, capacity overrides, staff assignments |

---

## 4. Key Business Invariants & State Machines

### 4.1 15-Minute Reservation Expiry
- When a user initiates a pass checkout (`POST /api/purchases`), the backend sets `reservation_expires_at = now + 15 minutes`.
- Active reservation holds prevent overselling.
- If the countdown reaches `00:00`, the reservation transitions to `EXPIRED` and seats are automatically released.
- The attendee can cancel the reservation manually (`POST /api/purchases/:id/cancel`).

### 4.2 Profile Completeness Gate
- Actions requiring a complete profile (`POST /api/purchases`, `POST /api/teams`, accepting team invites) will return `403 PROFILE_INCOMPLETE` if any required field is missing.
- Required fields:
  - `name`: $\ge 2$ characters
  - `phone`: 10-digit Indian mobile number (`/^[6-9]\d{9}$/`)
  - If `is_student === true`: `institution_name` and `institution_id` (Roll No).

### 4.3 Student Fields Locking Rule
- Once an attendee has a ticket or purchase approved under a **student discount tier**, the backend sets `student_fields_locked = true`.
- When locked, `PATCH /api/me/profile` rejects edits to `is_student`, `institution_name`, or `institution_id` (`403 STUDENT_FIELDS_LOCKED`). Users can still update their name and phone.

### 4.4 Mandatory Physical Student ID Card Verification
- At the festival gates and event check-in points (`/staff/scan`), if a ticket has `tier === 'STUDENT'`, the volunteer **must check the physical student ID card**.
- The `POST /api/staff/scan/admit` endpoint **strictly enforces `student_id_checked: true`**. Admission will fail if this checkbox is not checked.

### 4.5 E-Sports Scoring Optimistic Concurrency
- In `/staff/events/[id]/scores`, whenever an existing score is updated, the frontend must send `expected_version` and a mandatory `reason`.
- If another referee saved a change concurrently, the backend returns `409 SCORE_VERSION_CONFLICT`. The UI notifies the user and reloads the live matrix.

---

## 5. Backend Error Codes Reference

| Error Code | HTTP Status | Meaning | Recommended UI Response |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Session missing or expired | Redirect to `/login` |
| `PROFILE_INCOMPLETE` | 403 | Missing phone or student details | Redirect to `/profile-completion` |
| `STUDENT_FIELDS_LOCKED` | 403 | Attempt to modify verified student ID | Show warning: *"Contact festival support to modify verified student credentials."* |
| `ACCOUNT_DISABLED` | 403 | Account deactivated by admin | Show alert: *"Your account has been deactivated."* |
| `FORBIDDEN` | 403 | Insufficient permission | Show toast: *"You are not authorized to perform this action."* |
| `CAPACITY_FULL` | 409 | Event or pass is sold out | Show banner: *"This event/pass is sold out."* |
| `TEAM_NAME_TAKEN` | 409 | Name already used for this event | Show error under team name input |
| `ALREADY_LEADER` | 409 | User already leads a team for this event | Show toast |
| `MEMBER_ALREADY_IN_TEAM` | 409 | User already part of another team | Show error |
| `UTR_ALREADY_USED` | 409 | Transaction ID already submitted | Show error under UTR input |
| `PAYMENT_ALREADY_SUBMITTED`| 409 | Payment already under review | Show notice: *"Payment already submitted."* |
| `SCORE_VERSION_CONFLICT` | 409 | Concurrent score update conflict | Reload scores matrix and alert referee |

---

## 6. What's Left for the Frontend Team (UI Refinement Checklist)

All backend communication, API endpoints, types, state machines, and routing are **100% complete**. The remaining tasks for the frontend team are purely visual and polish:

1. **Brand Theme & Styling Polish**:
   - Align button colors, glow effects, and fonts with TechXetra's brand guide across newly added routes (`/me/tickets`, `/me/team-invites`, `/checkout/[id]/pay`, `/staff/events/[id]/scores`).
2. **Webcam Camera Integration for Staff Scanner (`frontend/app/staff/scan/page.tsx`)**:
   - The scanner currently accepts manual token inputs, direct search lookups, and clipboard pastes.
   - To enable live phone/webcam camera scanning for volunteers at festival gates:
     1. Install `html5-qrcode` (or load it dynamically): `npm install html5-qrcode`
     2. In `frontend/app/staff/scan/page.tsx`, mount `Html5QrcodeScanner` inside an effect targeting a `<div id="reader" />` container:
        ```tsx
        import { useEffect } from "react";
        import { Html5QrcodeScanner } from "html5-qrcode";

        // Inside StaffScannerPage component:
        useEffect(() => {
          const scanner = new Html5QrcodeScanner(
            "reader",
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              // Automatically triggers lookup with decoded QR token
              setTokenInput(decodedText);
              void handleLookup(decodedText);
            },
            (error) => {
              // Ignore standard frame scan errors
            }
          );

          return () => {
            scanner.clear().catch(console.error);
          };
        }, [context, eventId]);
        ```
     3. Add `<div id="reader" className="overflow-hidden rounded-2xl bg-black" />` to the scanner UI card above the manual input fallback.
     4. On mobile devices, ensure camera permissions (`navigator.mediaDevices.getUserMedia`) are allowed over HTTPS or localhost.
3. **Responsive Mobile Tweaks**:
   - Test score matrix tables and admin tables on small mobile viewports to ensure horizontal scrollbars feel smooth.
4. **Empty State Illustrations & Micro-animations**:
   - Add Framer Motion transitions or SVG illustrations to empty states in `/me/team-invites` and `/me/tickets`.

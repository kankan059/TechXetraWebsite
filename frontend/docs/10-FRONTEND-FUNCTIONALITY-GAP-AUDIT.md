# Frontend–Backend Functionality Gap Audit

**Scope:** `frontend.zip` compared against `backend(3).zip`  
**Purpose:** Practical implementation plan focused on functionality, route compatibility, missing screens, redundant routes, and a maintainable frontend structure.  
**Important:** This is a static source audit. I have not run the frontend or backend, and I have not tested requests against a live deployment.

## Executive summary

The frontend already has a large number of pages and three API service modules (`participant-api.ts`, `admin-api.ts`, `staff-api.ts`). The biggest problem is not simply that pages are missing: **several frontend service calls do not match routes implemented by the backend**. Some screens may render but fail when they load or submit data.

Fix API contracts before adding more UI. Treat the backend route handlers as the source of truth unless you intentionally change the backend.

### Highest-priority findings

1. **Base-path mismatch:** `frontend/lib/api-client.ts` requests paths such as `/api/me` and `/api/events`. The Express backend mounts domain routes at `/api/v1` and at the root, but not at `/api`. Unless the deployed host has a rewrite from `/api/*` to the backend's actual routes, these calls return 404. Choose one convention and implement it explicitly.
2. **Profile update mismatch:** frontend calls `PATCH /api/me/profile`; backend implements `PATCH /me`.
3. **Team invitation mismatch:** frontend posts to `/teams/:id/invites`; backend supports `/teams/:teamId/invitations` and `/teams/:teamId/invite`.
4. **Payment instructions mismatch:** frontend requests `/purchases/:id/payment-instructions`; backend implements `GET /purchases/:purchaseId/payment`.
5. **Payment withdrawal mismatch:** frontend calls `/payments/:paymentId/withdraw`; backend withdrawal routes are purchase-scoped and include `/purchases/:id/payment/withdraw` or `/purchases/:id/payment-submissions/:subId/withdraw`.
6. **Ticket list mismatch:** frontend calls `/tickets/me`; backend supports `/tickets` and `/tickets/mine`.
7. **Large admin API mismatch:** frontend expects report, payment-decision, registration-management, ticket-management, gate-staff, and settings endpoints that are not all present under those paths in the backend.
8. **Potential duplicate page families:** both `/me/tickets` and `/tickets`, `/me/registrations` and `/registrations`, `/me/teams` and `/teams`, plus `/register` and `/signup` exist. Consolidate or redirect so the app has one canonical path per task.
9. **Missing auth flows:** backend route files do not expose password-reset or email-verification endpoints. Do not build functional reset/verification forms until the backend contract exists.
10. **Avoid silent API fallbacks:** `adminApi.events.list()` catches any admin endpoint error and falls back to the public event list. This can disguise authentication/server errors as successful admin data and should be removed after the admin listing endpoint is confirmed.

---

## 1. Frontend pages already present

The following pages were found in `frontend/app/`. “Present” means a route file exists; it does **not** mean its full workflow is correctly wired to the backend.

### Public / marketing

- `/` — homepage
- `/events` — event index
- `/events/directory` — event directory
- `/events/[slug]` — event detail
- `/events/technical`
- `/events/non-technical`
- `/events/esports`
- `/events/[slug]/leaderboard`
- `/schedule`
- `/leaderboards`
- `/sponsors`
- `/gallary` — misspelled route name
- `/contact`
- `/test` — likely development/testing page; review before production

### Authentication and participant

- `/login`
- `/signup`
- `/register`
- `/profile-completion`
- `/profile`
- `/dashboard`
- `/me`
- `/me/teams`
- `/me/team-invites`
- `/me/registrations`
- `/me/tickets`
- `/me/tickets/[id]`
- `/teams`
- `/teams/[id]`
- `/team`
- `/registrations`
- `/tickets`
- `/tickets/[id]`
- `/checkout`
- `/checkout/[id]`
- `/checkout/[id]/pay`
- `/checkout/[id]/status`

### Staff

- `/staff`
- `/staff/scan`
- `/staff/events`
- `/staff/events/[id]`
- `/staff/events/[id]/registrations`
- `/staff/events/[id]/payments`
- `/staff/events/[id]/scores`
- `/staff/events/[id]/settings`

### Admin

- `/admin`
- `/admin/events`
- `/admin/compititions` — misspelled route name
- `/admin/passes`
- `/admin/payments`
- `/admin/registrations`
- `/admin/tickets`
- `/admin/tickets/[id]`
- `/admin/attendance`
- `/admin/users`
- `/admin/gate-staff`
- `/admin/reports`
- `/admin/audit-logs`
- `/admin/settings`

### Missing-page policy

Do not create a page just because a common route is absent. Password reset, email verification, and a standalone `/me/purchases` page are **not requirements inferred by this audit**. If the product intentionally does not support these capabilities, no frontend or backend work is needed for them.

Only call a page missing when:
- the product owner has confirmed the workflow is required; and
- the backend supports the required operations, or a separately agreed backend change is planned.

The actionable gaps in this document concern existing frontend pages and controls that call backend routes which do not match or do not exist.

---

## 2. Recommended canonical page map

Prefer one canonical URL for each user task. Keep legacy URLs as redirects where needed instead of maintaining multiple independent implementations.

| Task | Recommended canonical route | Action |
|---|---|---|
| Browse events | `/events` | Keep. Use the backend event list. |
| View event | `/events/[slug]` | Keep. Verify slug/id behavior and API mapping. |
| Sign in | `/login` | Keep. |
| Create account | `/signup` **or** `/register` | Choose one; redirect the other. |
| Complete profile | `/profile-completion` | Keep if required by `profileComplete`/`missingFields`. |
| View/edit profile | `/profile` | Keep; use `GET /me` and `PATCH /me` after base-path mapping. |
| Participant home | `/me` **or** `/dashboard` | Choose one canonical route; redirect the other. |
| My registrations | `/me/registrations` | Keep; redirect `/registrations` if it is the same data/task. |
| My teams | `/me/teams` | Keep; redirect `/teams` only if `/teams` is not intended as a team discovery/creation hub. |
| Team details | `/teams/[id]` | Keep. |
| Team invitations | `/me/team-invites` | Keep; wire to backend's `/team-invites/mine`. |
| My tickets | `/me/tickets` | Keep; redirect `/tickets` if duplicate. |
| Ticket detail | `/me/tickets/[id]` | Keep; avoid maintaining a second `/tickets/[id]` implementation. |
| Purchase/checkout start | `/checkout` | Keep. |
| Purchase detail | `/checkout/[id]` | Keep. |
| Payment submission | `/checkout/[id]/pay` | Keep. |
| Payment status | `/checkout/[id]/status` | Keep; derive from actual payment/purchase states. |
| Staff event list | `/staff/events` | Keep. |
| Staff event operations | `/staff/events/[id]/*` | Keep only tabs supported by real endpoints. |
| Scan tickets | `/staff/scan` | Keep; lookup and admit must use exact scanner contracts. |
| Admin events | `/admin/events` | Keep. |
| Admin event competitions | Prefer `/admin/events` with category/filter, or rename route to `/admin/competitions` | Fix spelling and avoid duplicate event-management surfaces. |
| Admin payments | `/admin/payments` | Keep, but update decisions to the backend's decision endpoint. |
| Admin users | `/admin/users` | Keep; remove unsupported actions or implement their backend endpoints. |
| Admin reports | `/admin/reports` | Keep only the reports backed by current endpoints. |
| Admin settings | `/admin/settings` | Keep after adding/confirming a GET endpoint. |

### Pages to remove or redirect (after checking their contents)

- `/register` vs `/signup`
- `/dashboard` vs `/me`
- `/registrations` vs `/me/registrations`
- `/tickets` and `/tickets/[id]` vs `/me/tickets` and `/me/tickets/[id]`
- `/team` vs `/teams` and `/me/teams`
- `/admin/compititions` if it duplicates `/admin/events`
- `/test` unless it is an intentional public diagnostic page

Do not delete routes until you have checked inbound links and page contents. Redirects are safer than abrupt removal.

---

## 3. API base URL: fix this before debugging individual endpoints

### Current frontend

`frontend/lib/api-client.ts` has:

```ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techxetra-backend.ppriyankuu.workers.dev";
```

and `apiRequest()` sends paths such as `/api/me`, `/api/events`, `/api/purchases`.

### Current backend

`src/app.ts` mounts domain routers both at `/api/v1` and at the root:

```ts
for (const router of domainRouters) {
  app.use('/api/v1', router);
  app.use(router);
}
```

Individual routes are declared as `/me`, `/events`, `/purchases`, etc. There is no `/api` mount in this app file.

### Choose one approach

**Option A (recommended if keeping the existing frontend service paths):** configure the deployment/proxy to rewrite `/api/*` to the backend's root route paths. Confirm the rewrite exists and test it. Do not assume it exists because the deployed hostname contains “backend”.

**Option B:** set `NEXT_PUBLIC_API_URL` to a base URL ending in `/api/v1` and change service paths to omit `/api`, for example `apiRequest('/me')`. Do not combine this with an existing `/api` prefix or the resulting path will be wrong.

**Option C:** change backend mounting to support `/api` explicitly. Only do this deliberately and update deployment tests/docs.

The frontend and backend must agree on one mapping. The API base URL is not safe to change in isolation without checking deployed routing.

---

## 4. Concrete route mismatches to fix

Routes below are written without the frontend's current `/api` prefix. The backend supports the listed route path either at `/api/v1/...` or root, according to `src/app.ts`.

### Participant API (`frontend/services/participant-api.ts`)

| Frontend call | Backend route | Required change |
|---|---|---|
| `GET /api/me` | `GET /me` | Fix base-path mapping. |
| `PATCH /api/me/profile` | `PATCH /me` | Change path and confirm request field casing/schema. |
| `POST /api/auth/logout` | `POST /auth/logout` | Base-path mapping. |
| `GET /api/catalog/passes` | `GET /catalog/passes` (alias `/festival`) | Base-path mapping. |
| `GET /api/events` | `GET /events` | Base-path mapping; preserve cursor/limit filters supported by backend. |
| `GET /api/events/:idOrSlug` | `GET /events/:idOrSlug` | Base-path mapping. |
| `GET /api/leaderboards` | `GET /leaderboards/:eventId` and event-specific leaderboard route | No collection route found. Build leaderboard index from event data or add a backend collection endpoint. |
| `GET /api/events/:idOrSlug/leaderboard` | `GET /events/:idOrSlug/leaderboard` | Base-path mapping. |
| `POST /api/teams` | `POST /teams` | Base-path mapping. |
| `POST /api/teams/:id/invites` | `POST /teams/:teamId/invitations` or `/invite` | Change path. |
| `GET /api/me/team-invites` | `GET /team-invites/mine` | Change path. |
| `POST /api/team-invites/:id/accept` | `POST /team-invites/:invitationId/accept` | Base-path mapping; ensure `id` is invitation/member record ID expected by backend. |
| `POST /api/team-invites/:id/decline` | `POST /team-invites/:invitationId/decline` | Same as above. |
| `GET /api/purchases/:id/payment-instructions` | `GET /purchases/:purchaseId/payment` | Change path. |
| `POST /api/payments/:id/withdraw` | `POST /purchases/:id/payment/withdraw` or `/purchases/:id/payment-submissions/:subId/withdraw` | Redesign method arguments to pass purchase ID and, if using the second route, submission ID. |
| `POST /api/purchases/:id/retry-fulfillment` | `POST /admin/purchases/:id/retry-fulfillment` | Participant API must not expose an admin-only operation. Remove it from participant flows; keep retry in admin tooling only. |
| `GET /api/tickets/me` | `GET /tickets` or `/tickets/mine` | Change path. |
| `GET /api/registrations` | `GET /me/registrations` | Change path. |

`GET /api/purchases` and `GET /api/purchases/:id`, `POST /api/purchases`, and cancellation routes have corresponding backend routes once the base path is corrected. Verify exact DTO shapes before relying on the current TypeScript types.

### Staff API (`frontend/services/staff-api.ts`)

| Frontend call | Backend route | Required change |
|---|---|---|
| `POST /staff/scan/lookup` | Same route | Base-path mapping. |
| `POST /staff/scan/admit` | Backend aliases `/staff/scan/check-in` and `/staff/scan/admit` | Base-path mapping. |
| `POST /staff/scan/deny` | No `/staff/scan/deny` route found | Remove/replace with a supported workflow or implement backend denial endpoint. Do not silently treat it as admission. |
| `GET /staff/events/mine` | Backend alias `/staff/events/mine` | Base-path mapping. |
| `GET /staff/events/:id/dashboard` | Backend `/staff/events/:eventId/dashboard` | Base-path mapping. |
| `GET /staff/events/:id/registrations` | Backend alias `/staff/events/:eventId/registrations` | Base-path mapping. |
| `GET /staff/events/:id/payments` | No matching staff payment-list route found | Implement backend endpoint or remove the tab/action. |
| `POST /staff/events/:id/payments/:paymentId/review` | No matching staff payment-review route found | Decide whether payment review is Super Admin only. If yes, remove staff payment-review UI. If leads should review, implement and authorize the backend route. |
| `PATCH /staff/events/:id` | Backend alias `/staff/events/:eventId` | Base-path mapping; verify allowed fields. |
| `GET /staff/events/:id/scores` | No GET `/scores` route found in staff esports router | Implement GET scores or update the UI to use an existing endpoint. |
| `PUT /staff/events/:id/scores` | Backend `POST /staff/events/:id/scores`; backend also has `PUT /matches/:matchId/result` | Align the scoring UI and backend contract; don't change method without matching request schema. |
| `DELETE /staff/events/:id/scores/:entryId` | Backend delete route uses `:scoreId` | Likely compatible after base mapping; verify identifier and reason schema. |
| `POST /staff/events/:id/scores/finalize` | Backend aliases `/staff/events/:id/finalize` and `/scoring/finalize` | Change path to a supported alias. |

### Admin API (`frontend/services/admin-api.ts`)

| Frontend call/feature | Backend route(s) found | Required change |
|---|---|---|
| Reports `/reports/sales` | `GET /admin/reports/financial` | Map UI to financial report or implement a sales report endpoint. |
| `/reports/pending-verification` | `GET /admin/payments` | Use payment review queue with status filters. |
| `/reports/registrations` | No corresponding report route found | Derive from supported data only if permitted, or implement report endpoint. |
| `/reports/attendance` | `GET /admin/reports/attendance` | Change route. |
| `/reports/reconciliation`, `/failed-fulfillment`, `/student-tier`, `/duplicate-institutions` | No matching report endpoints found | Remove unsupported widgets or implement each endpoint. |
| `GET /admin/users` | `GET /admin/users` | Base-path mapping. |
| `POST /admin/users/pre-register` | No matching POST route found in `admin-users.ts` | Remove action or implement backend route. |
| `PATCH /admin/users/:id` | `PATCH /admin/users/:id` | Base-path mapping; verify accepted role/status fields. |
| `GET /admin/events` | No GET `/admin/events` route found in admin-events router | Do not fall back silently to public events; implement admin list or use public list explicitly with clear limitations. |
| `POST /admin/events` | `POST /admin/events` | Base-path mapping. |
| `PATCH /admin/events/:id` | `PATCH /admin/events/:id` | Base-path mapping. |
| `POST /admin/events/:id/staff` | `POST /admin/events/:id/staff` | Base-path mapping. |
| `DELETE /admin/events/:id/staff/:userId` | Same route | Base-path mapping. |
| `POST /admin/events/:id/scores/reopen` | Backend aliases `/admin/events/:id/reopen-scores` only if present in admin-events route; verify exact route source before use | Align route string to actual backend handler. |
| Payment `/approve`, `/reject`, `/hold`, `/unhold`, `/resubmit` | `POST /admin/payments/:id/decision` and `/review` | Replace five frontend methods with one decision call using the backend's decision schema. |
| `GET /admin/purchases` | No matching admin purchase-list route found in admin purchase router | Add backend list endpoint or remove admin purchase list. |
| `POST /admin/purchases/:id/retry-fulfillment` | Same route | Base-path mapping. |
| `GET /admin/tickets/:id` | No GET detail route found in `admin-tickets.ts` | Implement endpoint or remove detail fetch. |
| `/admin/tickets/:id/reissue` | No reissue route found | Remove/disable action or implement backend route. |
| `/admin/tickets/:id/revoke`, `/rotate-qr`, `/undo-checkin` | Corresponding backend routes exist | Base-path mapping; verify reason field names. |
| `/admin/registrations/:id/cancel`, `/replace-member` | No admin registration router is mounted | Implement routes or remove these actions. |
| `GET /admin/audit-logs` | `GET /admin/audit-logs` | Base-path mapping; verify pagination format. |
| `GET /admin/settings` | Only PATCH routes found in `admin-settings.ts` | Add GET endpoint or make settings page non-editable until one exists. |
| `GET /admin/fest-days` | PATCH/PUT update routes found, no GET list route | Add GET endpoint or source initial values elsewhere intentionally. |
| `/admin/gate-staff` GET/POST/DELETE | No matching gate-staff routes found | Remove page actions or implement routes and authorization. |

**Note on reports and administrative functions:** absence from the named route file is a strong warning, not proof that no proxy or alternate implementation exists. Search the full backend before implementing a replacement. The current backend's mounted router list in `src/app.ts` does not include a separate registrations router or gate-staff router.

---

## 5. Functional page audit: what to keep, change, or defer

### Keep and wire correctly

- Public event listing, event detail, and event leaderboard
- Login and signup
- Profile and profile-completion
- Participant dashboard
- Team creation/details/invites
- Checkout, payment submission, payment status
- Participant tickets and ticket details
- Staff event dashboard, attendee roster, scanning
- Admin event creation/update, payment queue, ticket actions, audit logs, reports that the backend actually supports

### Consolidate duplicates

- Choose `/signup` or `/register`; redirect the other.
- Choose `/me` or `/dashboard`; redirect the other.
- Choose `/me/registrations` or `/registrations`; redirect the other.
- Choose `/me/tickets` and `/me/tickets/[id]`; redirect `/tickets*` if they are duplicates.
- Clarify `/team`, `/teams`, and `/me/teams`: one should be the user's team hub, one can be a team detail route, and redundant versions should redirect.
- Rename `/admin/compititions` to `/admin/competitions` or consolidate it into `/admin/events`. Preserve a redirect for existing links.

### Defer until backend support exists

- Password reset and email verification screens (only if explicitly required by product)
- Staff payment-review queue and review actions (unless backend routes are added)
- Staff scan denial action
- Admin gate-staff management
- Admin registration cancel/replace-member operations
- Admin ticket reissue
- Unsupported report cards
- Admin user pre-registration
- Settings/festival-day pages that need GET/list endpoints

### Review before production

- `/test`: remove or protect if it is developer-only.
- `/gallary`: fix spelling in route and navigation; use redirect if already linked.
- `/admin/compititions`: fix spelling.
- Any page that displays sample/local data should be clearly marked as mock or replaced with API-backed data.
- Any page that catches all errors and falls back to a different endpoint should be corrected; permission failures and server errors must not masquerade as successful data.

---

## 6. Suggested frontend structure

The project already uses Next.js App Router and has useful service modules. Do not reorganize the whole app just for aesthetics. Introduce a feature-oriented structure incrementally:

```text
frontend/
  app/
    (public)/
      page.tsx
      events/
        page.tsx
        [slug]/page.tsx
      schedule/page.tsx
      sponsors/page.tsx
    (auth)/
      login/page.tsx
      signup/page.tsx
    (participant)/
      layout.tsx
      me/page.tsx
      profile/page.tsx
      profile-completion/page.tsx
      registrations/page.tsx
      teams/page.tsx
      teams/[id]/page.tsx
      team-invites/page.tsx
      tickets/page.tsx
      tickets/[id]/page.tsx
      checkout/
        page.tsx
        [id]/page.tsx
        [id]/pay/page.tsx
        [id]/status/page.tsx
    staff/
      layout.tsx
      page.tsx
      scan/page.tsx
      events/page.tsx
      events/[id]/page.tsx
      events/[id]/registrations/page.tsx
      events/[id]/scores/page.tsx
    admin/
      layout.tsx
      page.tsx
      events/page.tsx
      payments/page.tsx
      tickets/page.tsx
      users/page.tsx
      reports/page.tsx
      settings/page.tsx
  components/
    ui/
    layout/
    events/
    checkout/
    tickets/
    teams/
    staff/
    admin/
  features/
    auth/
    profile/
    events/
    teams/
    purchases/
    payments/
    tickets/
    scanning/
    admin/
  services/
    participant-api.ts
    staff-api.ts
    admin-api.ts
  lib/
    api-client.ts
    auth/
    errors/
    validation/
  types/
    api.ts
  hooks/
  data/
```

This is a target shape, not a requirement to move every file immediately. Keep marketing/static content in `data/`; do not use static data as the authoritative source for event capacity, prices, payment status, tickets, user permissions, or attendance.

### API client requirements

- Use one base URL convention.
- Keep `credentials: "include"` if sessions are cookie-based and configure CORS accordingly.
- Parse and expose backend error code, message, status, and request ID.
- Handle 401 with a sign-in flow, but don't redirect public pages on every anonymous 401.
- Handle 403 as a permission failure, not a sign-out.
- Preserve pagination cursors rather than silently fetching unbounded data.
- Generate one idempotency key per logical purchase attempt and reuse it only for retries of the same request.
- Never store admin permissions or ticket validity as frontend-only truth; the backend must decide.
- Do not put secrets in `NEXT_PUBLIC_*` variables.

---

## 7. Required user journeys and acceptance checks

### Participant

1. Browse events without signing in.
2. Open an event and see its current status, format, price, capacity/availability, and registration deadline as returned by the API.
3. Sign up/sign in; session state refreshes through the backend.
4. Complete required profile fields and see validation errors from the server.
5. Create a purchase using a single idempotency key for the logical attempt.
6. View server-generated payment instructions and submit a UTR.
7. See payment status (pending/approved/rejected/on hold) without treating a submitted UTR as proof of payment.
8. After approval and successful fulfillment, see issued tickets.
9. Open a ticket and display the backend-issued QR payload/token without synthesizing one client-side.
10. See expired/cancelled/rejected states and retry guidance without accidentally creating a new purchase.

### Teams

1. Create a team only for an event that permits teams.
2. Invite by email using the actual supported invitation endpoint.
3. Display pending/accepted/declined invitation state from the backend.
4. Prevent UI assumptions about membership from overriding server authorization.
5. Handle invitation links for existing and not-yet-registered users.

### Staff

1. Only assigned staff see assigned events.
2. Event roster and score pages load only when corresponding endpoints exist.
3. QR lookup is read-only; admission is a separate mutation.
4. On double-scan/conflict, show the server result rather than claiming success.
5. Do not show payment-review or deny-scan buttons until matching backend operations exist.

### Admin

1. Admin event management uses admin-authorized endpoints, not a silent public endpoint fallback.
2. Payment review uses the backend's decision schema and logs the server response.
3. Ticket revocation/rotation/undo-check-in require reasons where specified.
4. Reports display only metrics returned by implemented endpoints.
5. Every missing backend operation is hidden/disabled with an explicit product decision, not a dead button.

---

## 8. Implementation order

### P0 — Make current pages talk to the backend

1. Decide and verify the API base-path rewrite (`/api` versus `/api/v1` or root).
2. Fix participant profile, team invitation, payment-instruction, payment-withdrawal, ticket-list, and registration-list paths.
3. Remove participant-facing retry-fulfillment method.
4. Align admin payment review with `/admin/payments/:id/decision` or `/review`.
5. Remove staff deny/payment routes and admin actions that have no backend counterpart, until implemented.
6. Remove the admin event-list catch-all fallback.

### P1 — Complete the critical UI journeys

1. Make purchase → payment submission → admin review → ticket fulfillment → ticket wallet work end-to-end.
2. Make team creation/invitation/acceptance work end-to-end.
3. Make staff scan lookup/admit work end-to-end.
4. Ensure profile-completion gating matches backend `profileComplete` and `missingFields`.

### P2 — Consolidate routes and pages

1. Pick canonical routes for signup, dashboard, registrations, tickets, and team hub.
2. Redirect duplicates.
3. Fix `gallary` and `compititions` spelling.
4. Remove `/test` from production if it is not a product feature.

### P3 — Resolve only confirmed product requirements

1. Do not add password reset, email verification, or standalone purchase-history functionality unless the product owner explicitly requires it.
2. For staff payment review, gate-staff assignment, registration admin actions, ticket reissue, and extra reports, remove/disable current frontend calls unless those workflows are explicitly required; only then plan matching backend work.
3. Add integration tests that verify each retained frontend service method against the real backend.

---

## 9. Files to change first

| File | Change |
|---|---|
| `frontend/lib/api-client.ts` | Set and document the correct API base-path convention; improve error/request-ID handling if required. |
| `frontend/services/participant-api.ts` | Fix `/me/profile`, invitations, payment instructions/withdrawal, ticket list, registrations; remove participant retry-fulfillment. |
| `frontend/services/admin-api.ts` | Correct report paths, payment decision calls, unsupported admin routes, and remove catch-all public-event fallback. |
| `frontend/services/staff-api.ts` | Remove or defer unsupported deny/payment review/score GET routes; align score methods to backend. |
| `frontend/types/api.ts` | Update types to match actual server response DTOs after route changes. |
| `frontend/app/(auth)/...` | Choose one signup route and redirect the duplicate. |
| `frontend/app/me`, `frontend/app/dashboard` | Consolidate to one participant landing page. |
| `frontend/app/tickets*`, `frontend/app/me/tickets*` | Consolidate duplicate ticket screens. |
| `frontend/app/registrations`, `frontend/app/me/registrations` | Consolidate duplicate registration screens. |
| `frontend/app/admin/compititions` | Fix route spelling or consolidate with events. |
| `frontend/app/test/page.tsx` | Determine whether to remove or protect. |

---

## 10. Final recommendation

Do **not** start by adding more pages. First establish a route contract that both sides agree on, then make every existing API service method match a real backend endpoint and its request/response shape.

The first deliverable should be a route compatibility checklist where each frontend API method is one of:

- **MATCHED** — method, path, payload, and response agree.
- **MISMATCHED** — backend route exists but frontend uses the wrong method/path/payload.
- **MISSING BACKEND** — frontend feature requires a route that is not implemented.
- **NEEDS LIVE VERIFICATION** — route exists but deployment rewrite, auth behavior, or response shape has not been tested.

Only after the P0 items are resolved should the team spend time polishing page design or implementing extra dashboards.

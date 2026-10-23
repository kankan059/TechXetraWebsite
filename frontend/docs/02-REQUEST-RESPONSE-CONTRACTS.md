# 02 — Request and response contracts

This file documents contracts that can be confirmed directly from route code. Use `01-API-ROUTE-INDEX.md` for the full inventory. For endpoints not detailed below, inspect the named route's Zod schema and service before coding against an assumed payload.

## Authentication

### `POST /api/v1/auth/register`
File: `src/routes/auth.ts`

Request:
```json
{
  "email": "person@example.com",
  "password": "at-least-8-characters",
  "name": "Example Person"
}
```
- `email`: valid email; normalized to lowercase.
- `password`: minimum 8 characters.
- `name`: optional, minimum 2 characters. `displayName` is also accepted as an alias. If neither is sent, backend uses `Festival Participant`.
- Unknown keys are rejected.
- Creates a participant account, creates a session, and sets a cookie.
- Success: HTTP 201, `data.user` is the safe user DTO.

### `POST /api/v1/auth/login`
Request:
```json
{ "email": "person@example.com", "password": "your-password" }
```
Success: `data.user`; session cookie set. Invalid email/password uses a uniform `INVALID_CREDENTIALS` error. Account deactivation returns a forbidden error.

### `POST /api/v1/auth/google`
Request accepts either `idToken` or `id_token`:
```json
{ "idToken": "<Google ID token>" }
```
Success: `data.user`; session cookie set. Google token must be verified by the backend.

### `POST /api/v1/auth/logout`
No body required. Revokes the current session when present, clears the cookie, returns `data.message`.

### `GET /api/v1/auth/session`
Optional authentication. Response data:
```json
{ "authenticated": true, "user": {} }
```
When no valid session:
```json
{ "authenticated": false, "user": null }
```

### User DTO
Produced by `toUserDto()` in `src/services/user.service.ts`. Current fields include `id`, `email`, `name`, `displayName`, `avatarUrl`, `phone`, `isStudent`, `institutionName`, `institutionId`, `studentFieldsLocked`, `role`, `isActive`, `profileCompletedAt`, `profileComplete`, `missingFields`, `createdAt`, and `updatedAt`. Do not expect password hashes or raw session tokens.

## Profile

### `GET /api/v1/me`
Authenticated. `data` is the user DTO.

### `PATCH /api/v1/me`
File: `src/routes/me.ts`

Accepted optional fields:
```json
{
  "name": "Example Person",
  "phone": "9876543210",
  "isStudent": true,
  "institutionName": "Example Institute",
  "institutionId": "STU-123",
  "avatarUrl": "https://example.com/avatar.png"
}
```
`displayName` is also accepted as a name alias. Phone must match an Indian 10-digit mobile number beginning 6–9. If student fields have been locked by verification/admin policy, changes to `isStudent`, `institutionName`, or `institutionId` are forbidden. Unknown keys are rejected.

### Profile completeness
The backend considers a profile complete when name is at least two characters, phone is a valid 10-digit Indian mobile number, and student users have institution name and ID. Checkout/team creation may require a complete profile. Show `missingFields` returned by the server.

## Public event listing

### `GET /api/v1/events`
File: `src/routes/events.ts`

Supported query fields from the actual schema:
- `category`: event category enum
- `day`: integer 1–3
- `is_team`: boolean or `"true"`, `"false"`, `"0"`, `"1"`
- `format`: event format enum
- `search` or `q`: text search
- `page`: positive integer, default 1
- `pageSize`: positive integer, max 100, default 20
- `limit`: positive integer, max 100; overrides `pageSize`

The handler excludes `DRAFT` events from public results. It returns paginated success metadata via `sendPaginated`.

Event objects include fields produced by `formatEventResponse()` such as `id`, `slug`, `title`, `category`, `format`, `festDay`, descriptions/rules, venue, organizer, eligibility, timeline, prizes, pricing in paise, team settings, capacity fields, status, registration window, timestamps, scoring fields, leaderboard visibility, and `formSchema`. Check nullability and field names from the actual response rather than assuming the older design document's naming.

### `GET /api/v1/events/:idOrSlug`
Fetches a public event by ID or slug. Use the exact response shape from the handler. Handle not-found and non-public status errors.

## Teams

### `POST /api/v1/teams`
File: `src/routes/teams.ts`

Request:
```json
{ "eventId": "EVENT_UUID", "name": "Team Orion" }
```
`event_id` is accepted as an alias. Team name length 2–50. Requires authentication and a complete profile. The event must permit teams and be open; membership/registration restrictions are enforced by the service.

### `GET /api/v1/teams` and `/api/v1/teams/mine`
Authenticated. Returns the current user's teams.

### `GET /api/v1/teams/:teamId`
Authenticated. Service applies membership/role-aware data selection. Do not assume every role sees the same member details.

### `PATCH /api/v1/teams/:teamId`
Request:
```json
{ "name": "New Team Name" }
```
Name length 2–50; authorization and editable state are enforced in the service.

### `POST /api/v1/teams/:teamId/invitations`
Request:
```json
{ "email": "member@example.com" }
```
`/invite` is an alias. Returns the created invitation/member representation; inspect response to determine pending-state UI.

### `DELETE /api/v1/teams/:teamId/members/:memberId`
Removes a member or permits leaving, subject to service rules.

### Team invitations
- `GET /api/v1/team-invitations/mine` (alias `/team-invites/mine`)
- `POST /api/v1/team-invitations/:invitationId/accept` (alias `/team-invites/:invitationId/accept`)
- `POST /api/v1/team-invitations/:invitationId/decline` (alias `/team-invites/:invitationId/decline`)

Accept/decline require no body unless the route is changed.

## Purchases and payments

### `POST /api/v1/purchases`
File: `src/routes/purchases.ts`; authenticated participant purchase creation. The service is the authority for item shape, price, capacity, reservations, and form responses. Inspect the current Zod schema/handler in the route before implementing checkout; never submit a frontend-calculated total as authoritative. Send only the item/participant/team/form fields the current schema accepts. Preserve the response's purchase ID and status for the next step.

Use an idempotency key only if the current handler explicitly reads and stores it. Do not assume a header alone enables idempotency.

### `GET /api/v1/purchases` or `/purchases/mine`
Authenticated current-user purchases.

### `GET /api/v1/purchases/:purchaseId`
Purchase details; service controls ownership/admin access.

### `POST /api/v1/purchases/:purchaseId/cancel`
Cancels an eligible unpaid reservation. Show the server's returned state, not an optimistic assumed cancellation.

### `GET /api/v1/purchases/:purchaseId/payment`
Fetches payment instructions/status for a purchase the caller may access.

### `POST /api/v1/purchases/:id/payment` or `/purchases/:id/payment-submissions`
File: `src/routes/payments.ts`

Request accepts one of `transactionId`, `transaction_id`, or `utr`:
```json
{ "transactionId": "UPI_TRANSACTION_REFERENCE" }
```
Authenticated. Success returns a payment submission in `data` with HTTP 201. Do not display a purchase as paid merely because a UTR was submitted; it is awaiting backend review.

### Withdrawal
`POST /api/v1/purchases/:id/payment/withdraw` (also `/payment-submissions/:subId/withdraw`). Authenticated; handler invokes withdrawal service for the purchase and current user. The current handler reads `:id` for purchase ID; do not rely on `:subId` changing the service behavior.

## Tickets and scanner

### Tickets
- `GET /api/v1/tickets` or `/tickets/mine`: authenticated user's tickets.
- `GET /api/v1/tickets/:ticketId`: ticket detail subject to ownership/role policy.

### Scanner lookup
`POST /api/v1/staff/scan/lookup`

Request schema accepts:
```json
{
  "qrToken": "<scanned-value>",
  "context": "EVENT",
  "eventId": "EVENT_UUID"
}
```
Aliases: `qr_token`, `qrPayload`, `qr_payload`, `event_id`. `context` is `GATE` or `EVENT`, default `EVENT`. Requires authenticated `VOLUNTEER`, `EVENT_LEAD`/`LEAD`, or `SUPER_ADMIN`.

### Scanner check-in
`POST /api/v1/staff/scan/check-in` (alias `/staff/scan/admit`)

Same QR/context/event fields, with optional `studentIdChecked` boolean, `deviceId`, and `client_scan_id`. This performs admission/check-in; lookup does not. Handle the response verdicts from the service and do not mark admission successful before the server responds.

### Check-in logs
`GET /api/v1/staff/events/:eventId/check-ins`; staff roles listed above. Current handler returns up to 100 most recent logs.

## Admin payments
- `GET /api/v1/admin/payments` — Super Admin review queue; query supports `status`, `page`, `pageSize`.
- `GET /api/v1/admin/payments/:id` — detail, purchase, items, buyer subset, audit logs.
- `POST /api/v1/admin/payments/:id/decision` (alias `/review`) — decision enum accepts `APPROVE`, `APPROVED`, `REJECT`, `REJECTED`, `HOLD`, `ON_HOLD`; optional `reasonCode`, `rejectionReason`, `internalNote`, `privateNote`.
- `POST /api/v1/admin/purchases/:id/retry-fulfillment` — retry ticket fulfillment.

These routes require `SUPER_ADMIN`. Payment review outcomes must be displayed from the response. Keep internal notes and audit detail in admin-only UI.

## Response handling
All success and error responses use the standard envelope in `00-OVERVIEW.md`. The response `data` varies by route. Use `meta.requestId` for support/debug correlation. `request_id` is also returned at top level.

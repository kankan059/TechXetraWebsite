# 05 — Authentication, permissions, and error handling

## Session model
- Auth routes create/revoke server-side sessions and set/clear cookies (`src/services/session.service.ts`).
- Browser requests must include cookies (`credentials: 'include'`).
- Frontend API calls use the same-origin `/api/v1` Next.js rewrite, which proxies requests to the backend. Keep browser requests on this path instead of calling a separate backend hostname directly; this keeps session cookies first-party in production.
- Frontend JavaScript should not read or persist the raw session token.
- On startup, call `GET /auth/session`. This route intentionally returns `authenticated: false` with `user: null` for no valid session.
- On logout, await the backend response before showing logout as complete.

## CSRF and CORS
`src/app.ts` enables CORS for the configured `FRONTEND_ORIGIN`, credentials, and a limited list of methods/headers. `src/middleware/csrf.ts` checks mutation origins. Ensure the frontend runs at the configured origin and uses HTTPS in production. If the backend rejects a mutation, inspect the response and server logs; do not disable CSRF in the frontend.

The current CORS allowed headers include `Content-Type`, `Authorization`, `Idempotency-Key`, and `x-request-id`. If you add a custom header in the frontend, confirm it is allowed by CORS first.

## Roles
Roles visible in middleware/source include:
- `PARTICIPANT`
- `VOLUNTEER`
- `EVENT_LEAD` (the middleware treats `LEAD` as an alias)
- `LEAD`
- `SUPER_ADMIN`

`requireSuperAdminOnly` is strict: only `SUPER_ADMIN` passes. Staff routes may additionally require event assignment in service logic. A role alone does not necessarily grant access to every event.

## Safe frontend rules
- Never accept a role from a registration/profile form.
- Never treat an email address or client-side route guard as proof of authorization.
- Do not expose internal payment audit notes to participants.
- Avoid logging passwords, UTRs, QR payloads, cookies, or private attendee data in browser telemetry.
- A QR code should be rendered from ticket data returned by backend; do not create or sign your own.
- Do not claim payment success after UTR submission. Only display confirmed payment state from backend.
- Avoid putting payment or ticket data in public URLs.

## Error UX
Use status and `error.code`, not message matching:
- `400`: invalid request/business rule.
- `401`: no/invalid/expired session; offer sign-in.
- `403`: signed in but not permitted; show access-denied state.
- `404`: resource/route not found.
- `409`: conflict such as duplicate resource or invalid state transition.
- `429`: rate limit; explain retry later.
- `5xx`: server error; allow safe retry/refetch.

Actual status mappings depend on `src/common/errors.ts` and `src/middleware/error-handler.ts`. Always retain request ID in support diagnostics.

## Session expiration
If an authenticated API request returns 401, clear the frontend's cached identity and send the user to sign in while preserving a safe return path. Avoid redirect loops on `/auth/session` and login routes.

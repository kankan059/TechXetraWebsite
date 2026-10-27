# 00 — Overview and integration conventions

## Backend stack
- Node.js + Express 5 + TypeScript
- PostgreSQL via `pg` and Drizzle ORM
- Zod request validation
- Cookie-based session authentication
- Source entry points: `src/server.ts`, `src/app.ts`
- Database schema: `src/db/schema.ts` and `src/db/schema/`
- Domain logic: `src/services/`
- Route handlers: `src/routes/`

## API base paths
`src/app.ts` mounts health endpoints both at the root and under `/api/v1`. All domain routers are mounted at both prefixes too. Therefore the same route is generally available as:
- Local/root: `http://localhost:<PORT>/events`
- Versioned: `http://localhost:<PORT>/api/v1/events`

The frontend calls the same-origin `/api/v1` path. `next.config.ts` rewrites it to the backend, so browser requests stay on the frontend origin and session cookies remain first-party. Configure the backend upstream with `BACKEND_API_URL` (preferred), `NEXT_PUBLIC_BACKEND_URL`, or `NEXT_PUBLIC_API_URL` when building/deploying the frontend.

## Environment variables
Inspect `src/config/env.ts` and deployment configuration for the exact runtime requirements. The frontend typically needs only:
- Backend upstream for the Next.js rewrite, e.g. `BACKEND_API_URL=https://api.example.com`
- Google OAuth client ID only if Google sign-in is enabled in the UI.

Never put database credentials, session secrets, ticket HMAC secrets, or admin seed credentials in frontend environment variables. Anything bundled into frontend code is public.

## Request conventions
- JSON requests: `Content-Type: application/json`
- Cookie session: use `credentials: 'include'` / `withCredentials: true`.
- Mutation routes may be subject to origin-based CSRF checks; send requests from the configured frontend origin and do not bypass browser security.
- `Idempotency-Key` is supported by some purchase/payment workflows only if the backend handler reads it. Confirm each handler before adding it.
- Query pagination commonly uses `page` and `pageSize`; check each route because some use `limit` aliases or fixed result limits.
- Zod schemas using `.strict()` reject unknown fields. Send only documented fields.

## Standard success envelope
Implemented in `src/common/response.ts`:
```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "req_example" },
  "request_id": "req_example"
}
```
`data` is the actual route-specific payload. Some endpoints return arrays directly inside `data`, others return objects.

## Standard error envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  },
  "meta": { "requestId": "req_example" },
  "request_id": "req_example"
}
```
`details` is omitted when empty. Use `error.code` for programmatic handling and `error.message` for user-facing messaging; do not parse message strings as logic.

## Currency and time
- Event prices are represented in paise (e.g. ₹500 = `50000`).
- Timestamp fields in the database are generally numeric Unix milliseconds; render them as dates using `new Date(value)`, not `new Date(value * 1000)`.
- Nullable `capacity` means capacity may be unlimited; check `availableCapacity`/`seatsRemaining` and `registrationOpen` rather than guessing.

## Frontend should not be authoritative
Never calculate final price, capacity, payment approval, ticket validity, staff permissions, or admission eligibility solely in the browser. Display backend results and treat mutations as pending until the server confirms them.

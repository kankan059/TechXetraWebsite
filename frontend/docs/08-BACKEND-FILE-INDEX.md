# 08 — Backend file index

## Runtime and configuration
- `src/server.ts` — server entry point.
- `src/app.ts` — Express setup, security middleware, CORS, route mounting, 404/error handling.
- `src/config/env.ts` — environment schema and defaults.
- `src/db/index.ts` — database connection.
- `src/db/schema.ts`, `src/db/schema/` — Drizzle tables and schema modules.
- `src/db/seed.ts` — seed workflow; inspect before running in any environment.
- `drizzle.config.ts`, `drizzle/migrations/` — migration configuration and SQL migrations.
- `docker-compose.yml`, `docker-compose.prod.yml` — local/production container configuration.
- `package.json` — scripts and dependencies.

## Routes
- `src/routes/admin-events.ts`
- `src/routes/admin-payments.ts`
- `src/routes/admin-reports.ts`
- `src/routes/admin-settings.ts`
- `src/routes/admin-tickets.ts`
- `src/routes/admin-users.ts`
- `src/routes/auth.ts`
- `src/routes/catalog.ts`
- `src/routes/events.ts`
- `src/routes/health.ts`
- `src/routes/leaderboards.ts`
- `src/routes/me.ts`
- `src/routes/payments.ts`
- `src/routes/purchases.ts`
- `src/routes/scanner.ts`
- `src/routes/staff-esports.ts`
- `src/routes/staff-events.ts`
- `src/routes/team-invites.ts`
- `src/routes/teams.ts`
- `src/routes/tickets.ts`

## Services
- `src/services/admin.service.ts`
- `src/services/esports.service.ts`
- `src/services/form.service.ts`
- `src/services/google-auth.service.ts`
- `src/services/payment.service.ts`
- `src/services/purchase.service.ts`
- `src/services/session.service.ts`
- `src/services/staff.service.ts`
- `src/services/team.service.ts`
- `src/services/ticket.service.ts`
- `src/services/user.service.ts`

## Middleware and shared utilities
- `src/common/errors.ts`
- `src/common/logger.ts`
- `src/common/response.ts`
- `src/lib/crypto.ts`
- `src/middleware/auth.ts`
- `src/middleware/csrf.ts`
- `src/middleware/error-handler.ts`
- `src/middleware/rate-limiter.ts`
- `src/middleware/request-id.ts`
- `src/middleware/validate.ts`

## Existing design/reference documentation
The uploaded archive also contains `techxetra-backend-design/docs/` and `techxetra-backend-design/structure/`. Use those for intended workflows and historical architecture, but verify claims against current route/service code before relying on them.

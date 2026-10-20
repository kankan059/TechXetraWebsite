# TASK-01 — Hono foundation, migrations, and D1 atomicity toolkit

## Objective
Create or extend the backend foundation and the database schema exactly as specified. Establish reliable error handling, request IDs, security middleware, migrations, seeds, and a tested D1 batch/guard helper before business workflows are implemented.

## Source of truth
Architecture spec §§2–5, §8, §18. Do not redesign the schema for convenience.

## Implementation scope
1. Set up/reuse the Hono Worker entrypoint and app builder; preserve existing repository conventions where compatible.
2. Define typed Worker bindings/variables for `DB`, `GOOGLE_CLIENT_ID`, `FRONTEND_ORIGIN`, `TICKET_HMAC_SECRET`, `UPI_VPA`, `UPI_PAYEE_NAME`, TTL settings, and any rate-limit bindings actually configured. Fail safely when required production config is absent; do not add fake secrets.
3. Implement request ID middleware, uniform error handler, JSON success/error envelopes, secure headers, exact-origin credentialed CORS, and mutation Origin/Referer enforcement. Do not trust arbitrary forwarded request IDs without validation.
4. Add `migrations/0001_init.sql` using the complete schema from §8. Add a separate idempotent seed migration for settings and fest days only where appropriate. The first SUPER_ADMIN must be provisioned through a controlled script/seed procedure; do not invent a real email.
5. Keep SQL migrations as source of truth. Enable/verify foreign-key enforcement in the supported D1 setup. Confirm migration SQL works against local Miniflare D1.
6. Implement shared helpers for UUIDs, UTC milliseconds/ISO conversion, integer-paise money, validation, cursor pagination, and structured redacted logging.
7. Implement `db/batch.ts`: execute `env.DB.batch(statements)`, map known constraint/guard failures to stable `AppError` codes/statuses, rethrow unknown errors as generic 500 while logging redacted diagnostics, and support service-level reread/reconciliation after expected guard conflicts.
8. Test `_guard` behavior empirically: valid batch succeeds; guard violation throws; all prior writes in that batch roll back. Test that a conditional UPDATE affecting zero rows does not throw, and document why verify-after-write guards are required.
9. Add a central constraint mapping table based on §3.5. Verify actual Miniflare/D1 error strings before depending on their shape; do not assume SQLite reports constraint names identically in every environment.
10. Add a minimal health/readiness endpoint only if it does not leak environment or database internals.

## Critical correctness rules
- No interactive `BEGIN`/`COMMIT` in Worker code.
- Every query uses prepared statements and `.bind()` for all user-controlled values.
- All timestamps are integer Unix milliseconds UTC; compute `now = Date.now()` once per request/write operation and pass it through.
- Never use float/decimal arithmetic for money; store paise as integers.
- Do not catch and suppress unknown DB errors.
- Do not make `_guard` non-empty or change its failure semantics.
- Ensure the full schema includes all named CHECK constraints, partial unique indexes, and append-only triggers from §8.

## Tests required
- Migration applies cleanly to a fresh local D1 database.
- Seed migration is safe and deterministic; no production credentials are embedded.
- `_guard` causes whole-batch rollback.
- Constraint error mapping is tested against actual D1 errors.
- Error envelope, request ID propagation, CORS, and Origin rejection tests pass.
- Foreign keys, partial indexes, check constraints, append-only triggers, and `E_SPORTS` scoring constraint are verified by tests.

## Acceptance criteria
- [ ] App starts locally and typechecks.
- [ ] All migrations apply on fresh local D1.
- [ ] Schema matches §8 without omitted constraints/indexes/triggers.
- [ ] Guard toolkit has passing behavioral tests.
- [ ] Errors have stable codes and never expose SQL/stack traces to clients.
- [ ] No production deployment/database operation occurred.

## Stop conditions
Stop and report rather than improvising if the existing repo has incompatible migrations, the D1 batch rollback behavior differs from the spec, or a schema detail is ambiguous. Do not proceed to domain routes until this task's tests pass.

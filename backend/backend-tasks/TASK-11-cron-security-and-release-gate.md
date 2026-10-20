# TASK-11 — Cron jobs, security hardening, and release readiness

## Objective
Finish scheduled maintenance, rate limits, operational safety, and end-to-end regression testing. This is the final release gate, not permission to deploy automatically.

## Source of truth
Architecture spec §§2.3–2.4, §§3–5, §§16–18.

## Scheduled jobs
Use one Worker `scheduled` handler on the configured five-minute cron, with each job independently idempotent and bounded:
1. Expire up to ~50 AWAITING_PAYMENT purchases past expiry via the same `releasePurchase` batch. Never expire PENDING_VERIFICATION or PAID.
2. Retry PAID purchases with NOT_STARTED/FAILED fulfillment older than one minute and fewer than 10 attempts. After 10 failures, leave for admin intervention and report it.
3. Reconcile seats hourly: compare `events.seats_taken` with the sum of RESERVED + CONFIRMED registration seats. If drift exists, log a loud structured event and auto-fix only if recount is <= capacity, with audit. If recount exceeds capacity, do not blindly “fix” by overselling; surface an operator-visible incident and stop automatic correction for that event.
4. Overdue verification is a derived queue flag; do not mutate payment state.
5. Daily cleanup of expired/revoked sessions and expired idempotency keys.

## Security hardening
- Configure actual rate-limit bindings or explicitly document a verified Cloudflare WAF fallback. Do not leave endpoints claiming to be rate limited when they are not.
- Check exact CORS origin, credential behavior, CSRF Origin/Referer on all mutations, secure headers, cookie attributes, and same-registrable-domain deployment assumptions.
- Ensure all request body/path/query inputs are Zod-validated; reject unknown fields and cap strings/arrays/page size.
- Verify all SQL is parameterized and no raw DB errors, stack traces, secrets, session tokens, phone numbers, or bulk UTRs appear in logs/responses.
- Check all protected routes for DB-derived authorization. Test ID swapping across events/users.
- Verify environment variables/secrets documented; no production secrets in `.env` committed files, migrations, fixtures, or logs.
- Add health checks and useful structured operational logging without exposing secrets.

## Full regression requirements
Run the full set in architecture spec §18, including all concurrency tests with Miniflare-backed D1 and `Promise.all`. Ensure coverage includes: last seat race; atomic multi-item purchase; idempotency; duplicate UTR; double approval; self-review; fulfillment failure/retry; release race; event check-in race; gate repeat; validity edges; teams; pricing; E_SPORTS score permissions/history/ties; auth and profile gates; audit immutability; seat reconciliation.

## Release checklist
- [ ] Clean install from lockfile succeeds.
- [ ] Typecheck, lint, unit/integration tests pass.
- [ ] Fresh local D1 migrations and seeds pass.
- [ ] All race/invariant tests pass against D1/Miniflare.
- [ ] No unreviewed migration edits or unrelated changes.
- [ ] Production vars/secrets and custom domain plan are documented without exposing secret values.
- [ ] Operator runbook explains migrations, staff provisioning, first SUPER_ADMIN bootstrap, rollback/forward-fix approach, failed fulfillment, overdue payments, and seat drift.
- [ ] API docs list every implemented route, auth requirement, stable error code, and required request fields.
- [ ] Out-of-scope features remain absent.
- [ ] No deployment or production DB migration occurred without explicit owner authorization.

## Required final report
Provide exact commands/results; test count and any skipped tests; migration list; route inventory; unresolved risks; deployment prerequisites; and a clear statement of whether the release checklist passes. Never state “production-ready” if a required test is skipped or a known critical issue remains.

# TechXetra backend — coding-agent task pack

This pack breaks the approved **TechXetra Backend — Architecture & Implementation Spec** into small, ordered implementation tasks for Hono on Cloudflare Workers + D1.

## How to use this pack

1. Put this directory and the full architecture spec in the repository (recommended: `docs/backend-tasks/` and `docs/backend-architecture.md`).
2. Prompt your coding agent with **one task file at a time**, in numeric order. Do not ask it to implement the entire pack in one turn.
3. Require it to complete the task's verification checklist and report changed files, commands run, results, and any blockers before proceeding.
4. Commit after each task passes. Never deploy a partially tested payment, ticket, or scanning flow to production.
5. Keep the original architecture spec authoritative. If a task conflicts with it, stop and report the conflict instead of improvising.

## Task order

| File | Scope | Gate before proceeding |
|---|---|---|
| `TASK-00-repository-audit.md` | Inspect repo and plan safely | Existing structure and risks documented; no behavior changes |
| `TASK-01-foundation-and-database.md` | Hono foundation, schema, seed, D1 batch toolkit | Migrations + guard + constraint mapping tests pass |
| `TASK-02-auth-and-profile.md` | Google auth, sessions, profile, roles | Auth/profile/authorization tests pass |
| `TASK-03-catalog-and-event-admin.md` | Events, settings, fest days, pricing/catalog reads | Event validation and permission tests pass |
| `TASK-04-teams.md` | Team lifecycle and invitations | Team membership/race/lock tests pass |
| `TASK-05-purchases-and-capacity.md` | Pricing snapshots, reservations, cancellation/expiry | Required capacity concurrency tests pass |
| `TASK-06-manual-upi-payments.md` | UPI submission and reviewer state machine | Duplicate UTR, double approval, self-review tests pass |
| `TASK-07-ticket-fulfillment-and-qr.md` | Retryable ticket issuance and signed QR token | Approval survives fulfillment failure; no duplicate tickets |
| `TASK-08-scanning-and-check-in.md` | Gate/event scan lookup/admit/deny | Event double-scan race and gate-repeat tests pass |
| `TASK-09-esports-scores-and-leaderboards.md` | E_SPORTS-only scoring | Version conflict, audit history, permissions, ranking tests pass |
| `TASK-10-admin-audit-and-reports.md` | Admin operations, reporting, audit | Sensitive mutations audited and permission-tested |
| `TASK-11-cron-security-and-release-gate.md` | Scheduled jobs, hardening, final regression | Full suite and production-readiness checklist pass |

## Non-negotiable engineering rules

- **Do not guess.** If repository state, a requirement, Cloudflare binding capability, or schema behavior is unclear, inspect it and ask/record a blocker. Never silently invent a new workflow.
- Do not overwrite or delete existing code/configuration before understanding it. Prefer small, reversible changes.
- Read the entire architecture spec before coding. Especially preserve §§3–4 (D1 atomicity and invariants), §18 (tests), and §20 (assumptions/out-of-scope).
- D1 writes must use prepared statements and the documented atomic `DB.batch()` / guard / conditional-update patterns. No interactive transactions. Never rely on a zero-row `UPDATE` to abort a batch.
- All user input is Zod-validated, unknown fields rejected, SQL parameterized, authorization derived from current DB state, and errors returned in the stable envelope.
- Use integer paise and Unix-millisecond UTC timestamps. Never use floating-point money or local-time DB timestamps.
- Never create tickets before the purchase is `PAID`. Never change a paid purchase back to unpaid because fulfillment failed.
- A submitted UTR is a claim, not proof of payment. Only an authorized reviewer can approve it, and never their own purchase.
- No passwords, file uploads, student-ID image uploads, Razorpay, refunds, offline scanning, WebSockets, or individual team-member payments in v1. Student institution ID is text and must be checked physically at entry for student-tier passes.
- Only `E_SPORTS` events may score or expose leaderboards. Ranks are computed server-side.
- Do not log credentials, raw Google tokens, session tokens, HMAC secrets, phone numbers, or bulk UTR data.
- Do not run production migrations or modify production data unless the user explicitly authorizes it. Never put real secrets into tracked files.
- Never claim a test passed unless it was run and its result observed. If a test cannot run, state exactly why.

## Definition of done for every task

- The implementation matches the architecture spec and does not add out-of-scope features.
- Tests cover happy paths, invalid input, permission boundaries, race/retry behavior where applicable, and database constraints.
- `typecheck`, lint (if configured), and relevant tests pass. Existing tests remain passing.
- No unrelated refactors, dependency upgrades, or destructive changes.
- The agent reports: summary; files changed; commands/results; migrations added; security/invariant checks; known limitations; exact next task to run.

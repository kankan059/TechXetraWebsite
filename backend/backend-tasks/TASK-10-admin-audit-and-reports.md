# TASK-10 — Admin operations, audit coverage, and reports

## Objective
Complete the SUPER_ADMIN operations and reviewer tooling needed to operate the event safely. Sensitive mutations must be authorized, validated, atomic where they change state, and audited.

## Source of truth
Architecture spec §§7, 10, 14–15, 17–18.

## Scope
1. Complete event CRUD, event staff assignments, gate staff assignments, settings/fest days management, user/staff management, payment investigation, purchase management, ticket management, registration cancellation/replacement, audit viewer, reports, and seat reconciliation endpoint as listed in §15.
2. `POST /api/admin/users/:id`/PATCH-style operations may change role, active state, and `can_review_payments` only as allowed by SUPER_ADMIN. Deactivation revokes all sessions in the same operation/batch. Validate role-assignment compatibility from §7.
3. Payment investigation supports search by UTR/reference/email and attempt history, duplicate UTR matches, but only authorized reviewers can see payment PII. Never expose UTRs to unrelated participants.
4. Ticket revoke/reissue/QR rotation: require reason; audit every change. Reissue revokes old ticket and creates a replacement with `replaces_ticket_id`, preserving the “one active ticket” invariant. Do not transfer a ticket that has already been checked in without explicit approved admin workflow. Rotate QR by incrementing `qr_version`; do not create a duplicate ticket.
5. Event check-in undo requires reason and a single batch that clears `event_checked_in_at`, updates the original admitted log to the documented override state, adds a new audit row, and handles the partial unique index consistently. Because the architecture also describes audit/check-in logs as append-only in places, inspect the schema/spec conflict before implementation: do not silently weaken triggers or rewrite history. If needed, propose a minimal schema amendment for owner approval.
6. Registration cancellation/member replacement must preserve seat counters, ticket state, registration integrity, team status, and audit trail. A checked-in ticket must not be silently transferred. Enforce pricing rules for replacement tickets as specified.
7. Reports: sales totals by status; pending-verification count/age; registrations/seats per event; seats counter versus recount; attendance by day/event; failed fulfillment; student-tier counts; duplicate institution IDs (report only, do not block them).
8. Audit viewer filters are cursor-paginated and SUPER_ADMIN-only. Audit logs, payment audit logs, and score history must not be mutable through ordinary API paths.
9. Every mutation listed in §14.1 writes an audit row in the same batch as the state change. Avoid sensitive PII in `before_json`/`after_json` unless strictly required and authorized.
10. Use stable error codes and owner-only 404 behavior for private participant resources.

## Tests required
- Role/active/reviewer flag changes are SUPER_ADMIN-only; self-promotion impossible.
- Deactivation revokes sessions immediately.
- All sensitive actions have audit rows; mutation and audit rollback together.
- Audit tables reject unauthorized UPDATE/DELETE.
- Ticket revoke/reissue/rotate behavior preserves uniqueness and invalidates old QR where intended.
- Checked-in ticket cannot be silently transferred/reissued.
- Registration cancellation and replacement preserve seat counts and never decrement confirmed seats incorrectly.
- Report totals reconcile with underlying records; duplicate institution IDs are reported, not blocked.
- Unauthorized staff cannot access payment PII, audit logs, reports, or another event's roster.

## Acceptance criteria
All admin mutations have tested authorization and audit behavior. Any spec/schema contradiction is raised for explicit decision before coding a risky override.

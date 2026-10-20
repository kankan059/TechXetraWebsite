# TASK-09 — E_SPORTS scoring, history, finalization, and public boards

## Objective
Implement score entry and correction for eligible E_SPORTS registrations, append-only score history, optimistic concurrency, finalization/reopening, and computed leaderboards. No other event category may have scoring or a public leaderboard.

## Source of truth
Architecture spec §§4, 8, 13, 15, 17–18.

## Routes
- `GET /api/leaderboards`
- `GET /api/events/:id/leaderboard`
- `GET /api/staff/events/:id/scores`
- `PUT /api/staff/events/:eventId/scores`
- `DELETE /api/staff/events/:id/scores/:entryId`
- `POST /api/staff/events/:id/scores/finalize`
- `POST /api/admin/events/:id/scores/reopen`

## Rules
1. Enforce `category='E_SPORTS'`, `scoring_enabled=1`, `scoring_status='OPEN'`, `round_no <= max_rounds`, and CONFIRMED registration belonging to the exact event. DB constraints are a second line of defense, not a replacement for validation.
2. LEAD of the event may score. VOLUNTEER may score only when `volunteers_can_score=1`. SUPER_ADMIN may score. Participants and unassigned staff may not.
3. Score is finite, bounded -1,000,000 to 1,000,000, rounded to 2 decimal places. Reject NaN/infinity and invalid round numbers.
4. New score creates version 1; database trigger creates history. Existing score updates require `expected_version` and a non-empty correction `reason`; conditional update increments version and verify-after-write guard ensures exactly one writer wins. Version mismatch returns 409 `SCORE_VERSION_CONFLICT` with safe current state.
5. Score deletes require LEAD/SUPER_ADMIN and reason. Insert DELETE history and audit row in the same batch before deletion; do not disable append-only history triggers.
6. Finalize is a guarded OPEN→FINALIZED transition with actor/time and audit. Once finalized, all writes are rejected. Reopen is SUPER_ADMIN-only, requires reason, and is audited.
7. Leaderboard totals sum scores across rounds by registration; only CONFIRMED registrations included. Display team name or participant name; never expose email, phone, institution ID, or internal score-entry secrets.
8. Compute `RANK()` at read time; ties share rank and stable display ordering. Never accept rank from client and do not add a tie-break winner rule.
9. Public endpoint returns 404 unless `leaderboard_public=1 AND scoring_enabled=1`. Cache public boards for max 10 seconds. Staff can view non-public boards only for events they manage.

## Tests required
- DB rejects scoring enabled or public leaderboard on non-E_SPORTS event.
- Disabled/finalized/unassigned/wrong-event/unconfirmed registration writes rejected.
- Two concurrent updates with same expected version yield one success and one version conflict.
- Create/update/delete each produce correct immutable history/audit rows.
- Finalize blocks writes; only SUPER_ADMIN can reopen.
- Multi-round totals, ties (1,2,2,4), stable ordering, no unconfirmed registration.
- Non-public board 404s publicly and is visible only to authorized staff.
- Public cache headers max-age=10.

## Acceptance criteria
Only E_SPORTS scoring works; every change is auditable; version conflicts are safe; ranks are computed server-side.

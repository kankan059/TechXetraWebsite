# TASK-08 — Gate entry and event check-in scanning

## Objective
Implement authorized scan lookup/admit/deny flows with separate GATE and EVENT semantics, student-ID verification, retry deduplication, and race-safe event single-use enforcement.

## Source of truth
Architecture spec §§4, 11.3, 12, §14.1, §17–18.

## Routes
- `POST /api/staff/scan/lookup`
- `POST /api/staff/scan/admit`
- `POST /api/staff/scan/deny`

## Rules
1. Authorize scanner before looking up any token/ticket. GATE requires `gate_staff` or SUPER_ADMIN. EVENT requires assignment to the exact event or SUPER_ADMIN. Unauthorized scanner must learn nothing about ticket validity.
2. Validate token format and HMAC before database lookup. Never accept raw ticket IDs as a substitute for signed tokens.
3. `lookup` is read-only. It returns a verdict and minimal display data; it must not reserve/consume a ticket or create a log row.
4. `GATE` accepts active, paid, in-validity GATE_PASS and EVENT_PASS for that event's valid day. Every successful gate admission is repeatable and logged; gate entry never consumes the ticket.
5. `EVENT` accepts only EVENT_PASS for the exact event, and only once. GATE_PASS is `WRONG_TICKET_TYPE`. Successful admission updates `event_checked_in_at` and inserts ADMITTED log in the same guarded batch. `ux_checkin_event_once` is the race arbiter.
6. For STUDENT tier, lookup must return `requires_id_check=true`, institution name/ID for physical comparison, and no phone/email. Admit must require `student_id_checked=true`; otherwise deny with a suitable reason. Staff physically inspect the real institution ID; the API cannot verify a physical card.
7. Deny records a DENIED log with a bounded reason. Do not let deny bypass authorization. Define deterministic behavior for duplicate `client_scan_id`: return the existing stored result when it belongs to the same scan request; do not silently reuse a scan ID for a different ticket/context.
8. Admit batch must guard active ticket, PAID purchase, validity boundaries (`valid_from <= now <= valid_to`), correct context/event, and event not previously checked in. Use verify-after-write for conditional ticket updates.
9. Lookup verdicts must include the documented states: VALID, ALREADY_USED, EXPIRED, NOT_YET_VALID, REVOKED, PAYMENT_NOT_APPROVED, WRONG_EVENT, WRONG_TICKET_TYPE, INVALID; include a recent gate entry soft warning where applicable.
10. Rate-limit scan endpoints. Offline scanning is out of scope.

## Tests required — blocking gate
- 10 parallel EVENT admits of same ticket: exactly one ADMITTED; others ALREADY_USED/conflict after reread.
- Repeated GATE admits create multiple logs; retry with same `client_scan_id` returns same result and no duplicate log.
- Gate pass is rejected in EVENT context; event pass at gate only valid on its day.
- Forged token rejected before ticket lookup; expired/not-yet-valid/revoked/unpaid cases rejected.
- Student ID missing or mismatch denial works; student ID checked flag is auditable.
- Volunteer assigned to Event A cannot scan Event B by changing request body.
- Unauthorized scanner response does not leak ticket existence, owner, or validity.
- No phone/email in lookup payload.

## Acceptance criteria
Gate and event contexts remain distinct, event check-in is atomic and single-use, and all race/security tests pass.

# TASK-03 — Event catalog, fest-day settings, and event administration

## Objective
Implement public event/catalog reads and authorized event/settings/fest-day management, including the restrictions that preserve existing registrations and ticket validity.

## Source of truth
Architecture spec §§9.1–9.2, §14, §15, §17–18.

## Implementation scope
1. Implement `GET /api/events`, `GET /api/events/:idOrSlug`, and `GET /api/catalog/passes`. Validate filters/search/pagination with Zod, reject unknown query fields, and return only public-safe fields.
2. Compute `seats_remaining` informationally from `capacity - seats_taken`; return null for unlimited capacity. Registration is open only when status is OPEN and `registration_closes_at` is null or in the future. Never treat this read as a reservation guarantee.
3. Catalog responses include fest-day boundaries, general/student gate-pass prices, configured student-ID warning, and the applicable price tier information without trusting client-sent prices.
4. Implement SUPER_ADMIN event CRUD, staff assignment, gate staff assignment, settings, and fest-day endpoints according to the API reference. Every mutation must be validated, authorized, and audited in the same atomic batch as the state change.
5. Leads may edit only `description` and `venue` for their assigned events. Enforce all other field restrictions server-side.
6. Once a non-cancelled registration exists, freeze `is_team_event`, `min_team_size`, `max_team_size`, `price_model`, and `capacity_unit`.
7. Reject capacity reductions below `seats_taken` with a stable `CAPACITY_BELOW_TAKEN` error. Do not disable or bypass the DB CHECK.
8. If SUPER_ADMIN changes `day_of_event` after tickets exist, update active tickets' validity windows in the same batch and add an audit row. Do not silently leave stale validity windows.
9. Enforce E_SPORTS-only scoring flags and let database constraints remain the final guardrail.
10. Seed required settings (`gate_pass_price_paise`, `gate_pass_student_price_paise`, `purchases_enabled`, `student_id_warning_text`, `support_contact`) and exactly three `fest_days` rows with owner-supplied real dates. If dates/prices are not supplied, use explicit placeholders in local/dev seeds only and report production configuration as a blocker; never invent production festival dates/prices.

## Tests required
- Public filters, detail by slug/id, stable pagination, unknown fields rejected.
- Closed/draft/past-close events report registration closed.
- Lead can edit description/venue only; cannot edit price/capacity/category/team settings.
- Admin capacity decrease below taken seats rejected.
- Structural fields frozen after registrations exist.
- Day change updates active ticket validity and audit log atomically.
- Non-E_SPORTS scoring flags rejected by DB and API.
- Settings/fest-day access is role-gated.

## Acceptance criteria
No prices are accepted from clients, no privileged mutation lacks audit logging, and event/capacity rules have tests. Do not implement purchase creation here; that is Task 05.

# 06 — Domain data and UI state model

This is a frontend-oriented map, not a replacement for the PostgreSQL schema. The exact schema is in `src/db/schema.ts`, migrations are under `drizzle/migrations/`, and domain transitions live in `src/services/`.

## Main entities
- **User** — identity, contact/profile data, role, activation, student/institution fields, profile completeness.
- **Event** — public details, event format/category, schedule, price model, capacity, registration window, status, form schema, scoring/leaderboard settings.
- **Team** — event-bound team, leader, name/status and member records.
- **Team member/invitation** — invite email, accepted/pending/declined state, role, response timestamp.
- **Purchase** — buyer's order, items, price snapshots, reservation/payment/fulfillment lifecycle.
- **Purchase item** — event/pass quantity or participant/team scope and snapshot details.
- **Payment submission** — UTR/reference, review state, decision metadata, audit trail.
- **Registration** — participant/team association with event and state.
- **Ticket** — issued credential, public identifier, QR/signature/version, revocation/check-in state.
- **Check-in log** — scan context, staff member, verdict/outcome and timestamp.
- **Event staff assignment** — event-scoped access for event lead/lead/volunteer.
- **Match/score** — e-sports match and scoring data.
- **Audit log** — administrative/security-relevant action history.

## States are server-owned
Do not hard-code a frontend state machine that assumes transitions always succeed. Use returned state and refetch after a mutation.

Typical UI states include:
- Event: draft, open, cancelled/closed; `registrationOpen` is a derived boolean from status, registration window, and capacity.
- Team: draft/active/cancelled plus member invitation/acceptance statuses.
- Purchase: reserved, paid, cancelled/expired or other statuses present in current schema.
- Payment submission: pending review, approved, rejected, hold/on-hold (actual enum/normalization is in payment service).
- Ticket: valid/issued, revoked, checked-in/used (actual status values are schema/service-defined).
- Scoring: event scoring status and finalization/reopen actions.

Before using exact enum labels in UI, inspect the enum declarations in `src/db/schema.ts` and the transitions in the relevant service. Normalize display labels separately from wire values.

## Prices and capacities
- Prices use paise: display `pricePaise / 100` as rupees.
- Respect `priceModel` (e.g. per participant vs per team) rather than assuming every event is priced per person.
- `capacity` can be null/unlimited.
- Use backend `registrationOpen`, `seatsRemaining`/`availableCapacity` for UI hints; purchase creation remains authoritative.

## Dynamic forms
`src/services/form.service.ts` supports:
`shortText`, `longText`, `number`, `singleChoice`, `multipleChoice`, `checkbox`, `date`, `email`, `phone`.
Fields may include `required`, `options`, `minLength`, `maxLength`, `min`, `max`, `scope` (`PARTICIPANT` or `TEAM`), `placeholder`, and `helperText`.
The server validates responses against the schema. Unknown answer keys and constraints should be confirmed against the full validator before assuming the client can send arbitrary keys.

## Useful TypeScript starter types
```ts
export type ApiEnvelope<T> = {
  success: true;
  data: T;
  meta: { requestId: string; [key: string]: unknown };
  request_id: string;
};

export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown[] };
  meta: { requestId: string; [key: string]: unknown };
  request_id: string;
};

export type SessionResponse = {
  authenticated: boolean;
  user: UserDto | null;
};

export type UserDto = {
  id: string;
  email: string;
  name: string;
  displayName: string;
  role: string;
  profileComplete: boolean;
  missingFields: string[];
  phone: string | null;
};
```
Treat these as starter types; refine nullability against the actual schema and responses.

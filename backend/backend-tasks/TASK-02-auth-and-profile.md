# TASK-02 — Google authentication, sessions, profiles, and authorization

## Objective
Implement Google-only login, server-side sessions, profile completion, staff provisioning, and database-derived authorization. No passwords and no client-controlled roles.

## Source of truth
Architecture spec §§5–7, §14.1, §17–18.

## Implementation scope
1. Verify Google ID tokens with `jose` and Google's JWKS. Validate signature/algorithm, issuer allowlist, exact audience `GOOGLE_CLIENT_ID`, expiration, and `email_verified === true`. Reject missing/malformed claims. Never accept a Google access token as an ID token.
2. Resolve accounts in this order: `google_sub`; then normalized lowercase email for a pre-registered row with NULL `google_sub`; otherwise create a `PARTICIPANT`. If an email row has a different non-null `google_sub`, return `ACCOUNT_CONFLICT` and log a security event. Deactivated users receive `ACCOUNT_DISABLED`.
3. Handle account-link races with conditional updates and unique constraints; do not overwrite a conflicting `google_sub`.
4. Create an opaque cryptographically random 32-byte session token, return it only in the `__Host-session` cookie (`HttpOnly; Secure; SameSite=Lax; Path=/`), and store only its SHA-256 hash in `sessions.id`. Never return token/hash in JSON or logs.
5. Apply participant sliding session lifetime and staff/admin absolute lifetime from configured defaults. Session middleware joins session + user and checks expiry, revocation, and `is_active` on every authenticated request. Logout revokes the session. Role/deactivation changes must take effect on the next request.
6. Implement `GET /api/me` and `PATCH /api/me/profile`; normalize Indian phone numbers to 10 digits after accepting allowed `+91`/`0` prefixes. Validate `is_student` explicitly; student profiles require trimmed `institution_name` and `institution_id` (max 40 chars). Email is immutable.
7. Set/clear `profile_completed_at` based on the complete set of required fields. Return `profile_complete` and `missing_fields` on login and `/me`.
8. Block team actions and purchases/payment submission when profile is incomplete, as specified. Browsing public events remains unauthenticated where applicable.
9. Enforce student-field lock after any `PAID` purchase; only SUPER_ADMIN can edit those fields thereafter. Audit every student-field change and reject attempts to edit locked fields. No ID-card uploads.
10. Implement `authz.service.ts`: role checks, event assignment/minimum role checks, gate-staff checks, payment-review permission, ownership checks. Resolve authorization from DB on every request. Return 404 for another participant's private resource when the spec requires existence hiding.
11. Implement a staff provisioning script that creates pre-registered rows only; never put an actual super-admin identity in tracked code. Implement SUPER_ADMIN-only staff creation endpoint if the route framework is ready. First SUPER_ADMIN must be created out-of-band by a documented operator-controlled procedure.
12. Link pending team invitations to a newly authenticated user by normalized email, without auto-accepting them.

## Security requirements
- All mutation requests pass exact-origin CSRF checks.
- Rate-limit auth using the configured binding or document the actual platform-level fallback; don't pretend a binding exists if Wrangler has not configured it.
- Never accept `role`, `is_active`, `can_review_payments`, `google_sub`, or `user_id` from public request payloads.
- No user may self-assign staff privileges.

## Tests required
- Valid/invalid Google tokens, wrong audience/issuer, expired token, unverified email.
- Unknown Google account gets PARTICIPANT; pre-provisioned staff links by email and retains role.
- Conflicting Google subject rejected; deactivated account blocked; role/deactivation change effective immediately.
- Session cookie flags and hashed-at-rest token behavior.
- Profile completeness/missing fields, phone normalization, student institution requirements, and profile gate.
- Student-field lock after paid purchase; audited SUPER_ADMIN exception.
- Participant cannot access other participant's private resources or staff endpoints.

## Acceptance criteria
All listed tests pass; no password-based auth, file upload, or client role pathway exists. Do not proceed until auth and authorization boundaries are proven by tests.

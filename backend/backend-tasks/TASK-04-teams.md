# TASK-04 — Team lifecycle and invitation acceptance

## Objective
Implement team creation, invitations, acceptance/decline, removal/leave, and cancellation while preserving one-team-per-event and roster-lock invariants.

## Source of truth
Architecture spec §§7, 9.3, §15, §17–18.

## Routes
- `POST /api/teams`
- `GET /api/teams/:id`, `GET /api/me/teams`
- `POST /api/teams/:id/invites`
- `DELETE /api/teams/:id/members/:memberId`
- `DELETE /api/teams/:id`
- `GET /api/me/team-invites`
- `POST /api/team-invites/:memberId/accept` and `/decline`

## Implementation rules
1. Team actions require a session and complete profile where specified. Team creation is only for an open team event. Creator becomes leader and an ACCEPTED `LEADER` member.
2. Normalize team names and emails (trim/lowercase as appropriate). Database partial unique indexes remain authoritative for team name and leader uniqueness per event.
3. Invites may target unregistered emails. If a matching user already exists, link the user ID. Login may link pending invitations but must not accept them automatically.
4. Only the team leader can invite/remove other members. Members may leave only while team is DRAFT. The leader cannot be removed; leader abandonment cancels the DRAFT team and marks its members REMOVED.
5. Accept/decline is restricted to the invitee, identified by linked user ID or normalized session email. Acceptance requires a complete profile and a DRAFT team. Use conditional writes/guards so concurrent acceptance cannot exceed size limits or join a second active team for the same event.
6. Invitation capacity counts `INVITED + ACCEPTED`. An invite must not push the team above `max_team_size`; accepted member count must respect `min_team_size` and `max_team_size` at purchase time.
7. A team with pending invitations cannot be purchased. Do not auto-remove pending invitees to make purchase possible.
8. Team roster becomes `LOCKED` when a purchase is created and `CONFIRMED` after payment approval. This task may add shared service hooks for these transitions but must not implement purchase/payment flows itself.
9. Prevent roster mutation unless team is DRAFT. Do not add member replacement after confirmation here; that belongs to admin work.
10. Keep routes thin; put business logic in `team.service.ts`. All database mutations are prepared SQL and concurrency-safe.

## Tests required
- Solo event cannot create a team; closed event cannot create/invite.
- Duplicate team names and duplicate leaders are rejected with stable codes.
- Unauthorized users cannot inspect or modify private team details.
- Unregistered invitee links after login but must explicitly accept.
- Wrong invitee cannot accept/decline; profile gate enforced.
- Concurrent acceptance cannot exceed max size or allow one user to join two teams for same event.
- Leader/member removal rules and DRAFT-only restrictions hold.
- Pending invite blocks purchase precondition; LOCKED/CONFIRMED teams reject roster edits.

## Acceptance criteria
All routes have input validation and ownership/role checks. Team invariants are backed by DB indexes and race tests, not just preflight SELECTs.

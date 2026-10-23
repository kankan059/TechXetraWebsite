# 09 — Frontend feature-to-endpoint map

| Frontend feature | Primary endpoints | Notes |
|---|---|---|
| Session bootstrap | `GET /auth/session` | Optional auth; returns authenticated flag and user/null. |
| Register/login/logout | `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/logout` | Cookie-based session; credentials include. |
| Profile | `GET/PATCH /me` | Use `profileComplete` and `missingFields`. |
| Event directory | `GET /events` | Filters: category, day, is_team, format, search/q, page/pageSize/limit. |
| Event details | `GET /events/:idOrSlug` | Supports ID or slug. |
| Festival pass/catalog | `GET /festival` or `/catalog/passes` | Aliases; choose one. |
| Team list/create/detail/edit | `GET /teams`, `POST /teams`, `GET/PATCH/DELETE /teams/:teamId` | Auth required; server enforces event/team rules. |
| Team invitations | `POST /teams/:teamId/invitations`, `GET /team-invitations/mine`, accept/decline routes | Invite body contains email. |
| Purchase list/create/detail/cancel | `GET/POST /purchases`, `GET /purchases/:purchaseId`, `POST /purchases/:purchaseId/cancel` | Confirm exact purchase create body from current schema. |
| Payment status/UPI submission | `GET /purchases/:purchaseId/payment`, `POST /purchases/:id/payment` | UTR submission is not payment approval. |
| Tickets | `GET /tickets`, `GET /tickets/:ticketId` | QR must be server-issued. |
| Staff event dashboard | `GET /staff/events`, `GET /staff/events/:eventId/dashboard` | Event assignment restrictions apply. |
| Staff participants | `GET /staff/events/:eventId/participants` | Alias `/registrations`; inspect supported filters. |
| QR scan | `POST /staff/scan/lookup`, `POST /staff/scan/check-in` | Lookup and admission are separate actions. |
| Scan history | `GET /staff/events/:eventId/check-ins` | Current route returns max 100 recent records. |
| E-sports | `GET/POST /staff/events/:id/matches`, `PUT /staff/events/:id/matches/:matchId/result`, score/finalize/reopen routes | Use only for events with scoring enabled. |
| Admin payment review | `GET /admin/payments`, `GET /admin/payments/:id`, `POST /admin/payments/:id/decision` | Super Admin only. |
| Admin event management | `POST/PATCH/DELETE /admin/events/:id`, publish/cancel/staff assignment | No list/detail GET routes in current router. |
| Admin user management | `GET /admin/users`, `PATCH /admin/users/:id` | Super Admin policy in route. |
| Reports/audit | `GET /admin/reports/summary`, `/financial`, `/attendance`, `/admin/audit-logs` | Super Admin only. |
| Admin ticket actions | `POST /admin/tickets/:ticketId/revoke`, `rotate-qr`, `undo-check-in` | Super Admin policy. |
| Settings/festival days | `PATCH /admin/settings`, `PATCH /admin/settings/:key`, PATCH/PUT fest-day aliases | Confirm payload schema from route. |
| Health | `GET /health`, `GET /ready` | Useful for deployment checks; not for user-facing navigation. |

## Contract sign-off checklist
For each frontend API function, record:
- [ ] HTTP method and canonical path
- [ ] Body/query schema copied from backend validator
- [ ] Whether cookie credentials are required
- [ ] Expected success `data` shape
- [ ] Expected validation/conflict/authorization errors
- [ ] Whether the mutation can safely be retried
- [ ] Whether UI must refetch after mutation

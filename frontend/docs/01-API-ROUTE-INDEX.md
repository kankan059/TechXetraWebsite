# 01 — API route index
Routes below are extracted from the current `src/routes/*.ts` files. Every domain route is mounted at both `/api/v1` and root in `src/app.ts`, so the canonical versioned URL is `/api/v1` + path. Middleware/access labels are best-effort; inspect source for object-level authorization.
**Route count:** 96 path-method entries. Aliases are listed separately when the backend accepts both forms.

## `src/routes/admin-events.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/admin/events` | Administrative access (verify handler) | POST /admin/events |
| `PATCH` | `/admin/events/:id` | Administrative access (verify handler) | PATCH /admin/events/:id |
| `DELETE` | `/admin/events/:id` | Administrative access (verify handler) | DELETE /admin/events/:id (Safe Deletion) |
| `POST` | `/admin/events/:id/publish` | Administrative access (verify handler) | POST /admin/events/:id/publish |
| `POST` | `/admin/events/:id/cancel` | Administrative access (verify handler) | POST /admin/events/:id/cancel |
| `POST` | `/admin/events/:id/staff` | Administrative access (verify handler) | POST & PUT /admin/events/:id/staff |
| `PUT` | `/admin/events/:id/staff/:userId` | Staff/assigned event access (verify handler) | See source route handler |
| `DELETE` | `/admin/events/:id/staff/:userId` | Staff/assigned event access (verify handler) | DELETE /admin/events/:id/staff/:userId |
| `GET` | `/admin/events/:id/staff` | Administrative access (verify handler) | GET /admin/events/:id/staff |

## `src/routes/teams.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/teams` | Public unless route middleware says otherwise | POST /teams |
| `GET` | `/teams` | Public unless route middleware says otherwise | GET /teams or /teams/mine |
| `GET` | `/teams/mine` | Public unless route middleware says otherwise | GET /teams or /teams/mine |
| `GET` | `/teams/:teamId` | Public unless route middleware says otherwise | GET /teams/:teamId |
| `PATCH` | `/teams/:teamId` | Public unless route middleware says otherwise | PATCH /teams/:teamId |
| `DELETE` | `/teams/:teamId` | Public unless route middleware says otherwise | DELETE /teams/:teamId (Disband) |
| `POST` | `/teams/:teamId/invitations` | Public unless route middleware says otherwise | POST /teams/:teamId/invitations or /teams/:teamId/invite |
| `POST` | `/teams/:teamId/invite` | Public unless route middleware says otherwise | POST /teams/:teamId/invitations or /teams/:teamId/invite |
| `DELETE` | `/teams/:teamId/members/:memberId` | Public unless route middleware says otherwise | DELETE /teams/:teamId/members/:memberId (Remove or Leave) |

## `src/routes/admin-users.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/admin/users` | Administrative access (verify handler) | GET /admin/users |
| `PATCH` | `/admin/users/:id` | Administrative access (verify handler) | PATCH /admin/users/:id |

## `src/routes/admin-settings.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `PATCH` | `/admin/settings` | Administrative access (verify handler) | PATCH /admin/settings or /admin/settings/:key |
| `PATCH` | `/admin/settings/:key` | Administrative access (verify handler) | See source route handler |
| `PATCH` | `/admin/fest-days/:dayNumber` | Administrative access (verify handler) | PATCH /admin/fest-days/:dayNumber or PUT /admin/festival-days/:dayNumber |
| `PATCH` | `/admin/festival-days/:dayNumber` | Administrative access (verify handler) | PATCH /admin/fest-days/:dayNumber or PUT /admin/festival-days/:dayNumber |
| `PUT` | `/admin/fest-days/:dayNumber` | Administrative access (verify handler) | See source route handler |
| `PUT` | `/admin/festival-days/:dayNumber` | Administrative access (verify handler) | See source route handler |

## `src/routes/staff-esports.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/staff/events/:id/scores` | Staff/assigned event access (verify handler) | POST /staff/events/:id/scores or PUT /staff/events/:id/matches/:matchId/result |
| `PUT` | `/staff/events/:id/matches/:matchId/result` | Staff/assigned event access (verify handler) | See source route handler |
| `DELETE` | `/staff/events/:id/scores/:scoreId` | Staff/assigned event access (verify handler) | DELETE /staff/events/:id/scores/:scoreId |
| `POST` | `/staff/events/:id/finalize` | Staff/assigned event access (verify handler) | POST /staff/events/:id/finalize or /staff/events/:id/scoring/finalize |
| `POST` | `/staff/events/:id/scoring/finalize` | Staff/assigned event access (verify handler) | POST /staff/events/:id/finalize or /staff/events/:id/scoring/finalize |
| `POST` | `/staff/events/:id/reopen` | Staff/assigned event access (verify handler) | POST /staff/events/:id/reopen or /staff/events/:id/scoring/reopen |
| `POST` | `/staff/events/:id/scoring/reopen` | Staff/assigned event access (verify handler) | POST /staff/events/:id/reopen or /staff/events/:id/scoring/reopen |
| `GET` | `/staff/events/:id/matches` | Staff/assigned event access (verify handler) | GET & POST /staff/events/:id/matches |
| `POST` | `/staff/events/:id/matches` | Staff/assigned event access (verify handler) | See source route handler |

## `src/routes/events.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/events` | Public unless route middleware says otherwise | GET /events |
| `GET` | `/events/:idOrSlug` | Public unless route middleware says otherwise | GET /events/:idOrSlug |

## `src/routes/catalog.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/festival` | Public unless route middleware says otherwise | GET /festival or /catalog/passes |
| `GET` | `/catalog/passes` | Public unless route middleware says otherwise | GET /festival or /catalog/passes |

## `src/routes/auth.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/auth/register` | Public unless route middleware says otherwise | POST /auth/register |
| `POST` | `/auth/login` | Public unless route middleware says otherwise | POST /auth/login |
| `POST` | `/auth/google` | Public unless route middleware says otherwise | POST /auth/google |
| `POST` | `/auth/logout` | Public unless route middleware says otherwise | POST /auth/logout |
| `GET` | `/auth/session` | Public unless route middleware says otherwise | GET /auth/session |

## `src/routes/leaderboards.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/leaderboards/:eventId` | Public unless route middleware says otherwise | See source route handler |
| `GET` | `/events/:idOrSlug/leaderboard` | Public unless route middleware says otherwise | See source route handler |

## `src/routes/tickets.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/tickets` | Authenticated | GET /tickets or /tickets/mine |
| `GET` | `/tickets/mine` | Authenticated | GET /tickets or /tickets/mine |
| `GET` | `/tickets/:ticketId` | Public unless route middleware says otherwise | GET /tickets/:ticketId |

## `src/routes/admin-payments.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/admin/payments` | Administrative access (verify handler) | GET /admin/payments |
| `GET` | `/admin/payments/:id` | Administrative access (verify handler) | GET /admin/payments/:id |
| `POST` | `/admin/payments/:id/decision` | Administrative access (verify handler) | POST /admin/payments/:id/decision or /admin/payments/:id/review |
| `POST` | `/admin/payments/:id/review` | Administrative access (verify handler) | POST /admin/payments/:id/decision or /admin/payments/:id/review |
| `POST` | `/admin/purchases/:id/retry-fulfillment` | Administrative access (verify handler) | POST /admin/purchases/:id/retry-fulfillment |

## `src/routes/purchases.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/purchases` | Public unless route middleware says otherwise | POST /purchases |
| `GET` | `/purchases` | Public unless route middleware says otherwise | GET /purchases or /purchases/mine |
| `GET` | `/purchases/mine` | Public unless route middleware says otherwise | GET /purchases or /purchases/mine |
| `GET` | `/purchases/:purchaseId` | Public unless route middleware says otherwise | GET /purchases/:purchaseId |
| `POST` | `/purchases/:purchaseId/cancel` | Public unless route middleware says otherwise | POST /purchases/:purchaseId/cancel |
| `GET` | `/purchases/:purchaseId/payment` | Public unless route middleware says otherwise | GET /purchases/:purchaseId/payment |

## `src/routes/staff-events.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/staff/events` | Staff/assigned event access (verify handler) | GET /staff/events or /staff/events/mine |
| `GET` | `/staff/events/mine` | Staff/assigned event access (verify handler) | GET /staff/events or /staff/events/mine |
| `GET` | `/staff/events/:eventId/dashboard` | Staff/assigned event access (verify handler) | GET /staff/events/:eventId/dashboard |
| `GET` | `/staff/events/:eventId/participants` | Staff/assigned event access (verify handler) | GET /staff/events/:eventId/participants or /staff/events/:eventId/registrations |
| `GET` | `/staff/events/:eventId/registrations` | Staff/assigned event access (verify handler) | GET /staff/events/:eventId/participants or /staff/events/:eventId/registrations |
| `PATCH` | `/staff/events/:eventId/public-details` | Staff/assigned event access (verify handler) | PATCH /staff/events/:eventId/public-details or /staff/events/:eventId |
| `PATCH` | `/staff/events/:eventId` | Staff/assigned event access (verify handler) | PATCH /staff/events/:eventId/public-details or /staff/events/:eventId |

## `src/routes/admin-tickets.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/admin/tickets/:ticketId/revoke` | Administrative access (verify handler) | POST /admin/tickets/:ticketId/revoke |
| `POST` | `/admin/tickets/:ticketId/rotate-qr` | Administrative access (verify handler) | POST /admin/tickets/:ticketId/rotate-qr |
| `POST` | `/admin/tickets/:ticketId/undo-check-in` | Administrative access (verify handler) | POST /admin/tickets/:ticketId/undo-check-in |

## `src/routes/team-invites.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/team-invitations/mine` | Public unless route middleware says otherwise | GET /team-invitations/mine or /team-invites/mine |
| `GET` | `/team-invites/mine` | Public unless route middleware says otherwise | GET /team-invitations/mine or /team-invites/mine |
| `POST` | `/team-invitations/:invitationId/accept` | Public unless route middleware says otherwise | POST /team-invitations/:invitationId/accept or /team-invites/:invitationId/accept |
| `POST` | `/team-invites/:invitationId/accept` | Public unless route middleware says otherwise | POST /team-invitations/:invitationId/accept or /team-invites/:invitationId/accept |
| `POST` | `/team-invitations/:invitationId/decline` | Public unless route middleware says otherwise | POST /team-invitations/:invitationId/decline or /team-invites/:invitationId/decline |
| `POST` | `/team-invites/:invitationId/decline` | Public unless route middleware says otherwise | POST /team-invitations/:invitationId/decline or /team-invites/:invitationId/decline |

## `src/routes/health.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/health` | Public unless route middleware says otherwise | See source route handler |
| `GET` | `/ready` | Public unless route middleware says otherwise | See source route handler |

## `src/routes/scanner.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/staff/scan/lookup` | Staff/assigned event access (verify handler) | POST /staff/scan/lookup |
| `POST` | `/staff/scan/check-in` | Staff/assigned event access (verify handler) | POST /staff/scan/check-in or /staff/scan/admit |
| `POST` | `/staff/scan/admit` | Staff/assigned event access (verify handler) | POST /staff/scan/check-in or /staff/scan/admit |
| `GET` | `/staff/events/:eventId/check-ins` | Staff/assigned event access (verify handler) | GET /staff/events/:eventId/check-ins |

## `src/routes/payments.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `POST` | `/purchases/:id/payment` | Public unless route middleware says otherwise | POST /purchases/:id/payment or /purchases/:id/payment-submissions |
| `POST` | `/purchases/:id/payment-submissions` | Public unless route middleware says otherwise | POST /purchases/:id/payment or /purchases/:id/payment-submissions |
| `POST` | `/purchases/:id/payment/withdraw` | Public unless route middleware says otherwise | POST /purchases/:id/payment/withdraw or /purchases/:id/payment-submissions/:subId/withdraw |
| `POST` | `/purchases/:id/payment-submissions/:subId/withdraw` | Public unless route middleware says otherwise | POST /purchases/:id/payment/withdraw or /purchases/:id/payment-submissions/:subId/withdraw |

## `src/routes/admin-reports.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/admin/reports/summary` | Administrative access (verify handler) | GET /admin/reports/summary |
| `GET` | `/admin/reports/financial` | Administrative access (verify handler) | GET /admin/reports/financial |
| `GET` | `/admin/reports/attendance` | Administrative access (verify handler) | GET /admin/reports/attendance |
| `GET` | `/admin/audit-logs` | Administrative access (verify handler) | GET /admin/audit-logs |

## `src/routes/me.ts`

| Method | Path | Access notes | Handler purpose/comment |
|---|---|---|---|
| `GET` | `/me` | Public unless route middleware says otherwise | GET /me |
| `PATCH` | `/me` | Authenticated | PATCH /me |
| `GET` | `/me/registrations` | Public unless route middleware says otherwise | GET /me/registrations (placeholder for Task 07) |
| `GET` | `/me/teams` | Authenticated | GET /me/teams |
| `GET` | `/me/purchases` | Public unless route middleware says otherwise | GET /me/purchases |
| `GET` | `/me/tickets` | Public unless route middleware says otherwise | GET /me/tickets |

## Route-index cautions
- A route's existence does not guarantee every business rule is complete. Follow the handler into its service.
- Some aliases are compatibility routes; the frontend should select one canonical URL and avoid mixing aliases.
- The design docs list intended endpoints beyond the live route files. See `07-INTEGRATION-GAPS.md`.

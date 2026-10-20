import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { requireAuth } from '../middleware/auth'
import { jsonSuccess } from '../common/response'

export const registrationRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

registrationRoutes.use('*', requireAuth())

registrationRoutes.get('/', async (c) => {
  const user = c.get('user')!

  const rows = await c.env.DB.prepare(
    `SELECT DISTINCT r.*, e.title as event_title, e.category as event_category,
            e.day_of_event, e.venue as event_venue, t.name as team_name
     FROM registrations r
     JOIN events e ON r.event_id = e.id
     LEFT JOIN teams t ON r.team_id = t.id
     WHERE r.participant_id = ?
        OR r.team_id IN (
          SELECT team_id FROM team_members
          WHERE (user_id = ? OR invited_email = ?) AND status = 'ACCEPTED'
        )
     ORDER BY r.created_at DESC`
  )
    .bind(user.id, user.id, user.email)
    .all()

  return jsonSuccess(c, rows.results || [])
})

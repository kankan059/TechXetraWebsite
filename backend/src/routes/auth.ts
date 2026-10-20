import { Hono } from 'hono'
import { z } from 'zod'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { verifyGoogleIdToken } from '../services/google-auth.service'
import { resolveOrCreateGoogleUser } from '../services/user.service'
import { createSession, revokeSession } from '../services/session.service'
import { formatUserProfile } from '../services/profile.service'
import { jsonSuccess } from '../common/response'

export const authRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

const GoogleLoginSchema = z
  .object({
    id_token: z.string().min(1, 'id_token is required'),
  })
  .strict()

authRoutes.post('/google', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = GoogleLoginSchema.parse(body)

  const now = c.get('now') || Date.now()
  const payload = await verifyGoogleIdToken({
    idToken: parsed.id_token,
    expectedClientId: c.env.GOOGLE_CLIENT_ID,
  })

  const user = await resolveOrCreateGoogleUser(c.env.DB, payload, now)

  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent')

  const { cookieHeader } = await createSession(c.env.DB, user, c.env, {
    ipAddress,
    userAgent,
    now,
  })

  c.res.headers.set('Set-Cookie', cookieHeader)

  return jsonSuccess(c, formatUserProfile(user))
})

authRoutes.post('/logout', async (c) => {
  const cookieHeader = c.req.header('cookie') || ''
  const match =
    cookieHeader.match(/(?:^|;\s*)__Host-session=([^;]+)/) ||
    cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)
  const token = match ? match[1] : ''

  const now = c.get('now') || Date.now()
  const clearCookieHeader = await revokeSession(c.env.DB, token, now)

  c.res.headers.set('Set-Cookie', clearCookieHeader)

  return jsonSuccess(c, { logged_out: true })
})

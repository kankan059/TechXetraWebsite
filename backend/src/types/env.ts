import type { Context } from 'hono'
import type { User, Session } from './index'

export interface CloudflareBindings {
  DB: D1Database
  ENVIRONMENT?: string
  GOOGLE_CLIENT_ID: string
  FRONTEND_ORIGIN: string
  TICKET_HMAC_SECRET: string
  UPI_VPA: string
  UPI_PAYEE_NAME: string
  PURCHASE_RESERVATION_TTL_MS?: string | number
  PARTICIPANT_SESSION_TTL_MS?: string | number
  STAFF_SESSION_TTL_MS?: string | number
}

export interface AppVariables {
  requestId: string
  now: number
  user?: User | null
  session?: Session | null
}

export type AppContext = Context<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>

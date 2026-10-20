import { Hono } from 'hono'
import type { CloudflareBindings, AppVariables } from '../types/env'
import { getAllSettings, getAllFestDays } from '../services/settings.service'
import { jsonSuccess } from '../common/response'

export const catalogRoutes = new Hono<{
  Bindings: CloudflareBindings
  Variables: AppVariables
}>()

catalogRoutes.get('/passes', async (c) => {
  const [settings, festDays] = await Promise.all([
    getAllSettings(c.env.DB),
    getAllFestDays(c.env.DB),
  ])

  const catalog = {
    gate_pass: {
      price_paise: settings.gate_pass_price_paise,
      student_price_paise: settings.gate_pass_student_price_paise,
      validity: 'Valid across all fest days (Day 1 through Day 3)',
    },
    fest_days: festDays,
    purchases_enabled: settings.purchases_enabled,
    student_id_warning_text: settings.student_id_warning_text,
    support_contact: settings.support_contact,
  }

  return jsonSuccess(c, catalog)
})

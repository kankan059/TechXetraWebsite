import { createApp } from './app'
import type { CloudflareBindings } from './types/env'

const app = createApp()

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    _env: CloudflareBindings,
    _ctx: ExecutionContext
  ): Promise<void> {
    // Cron execution gate (implemented in Task 11)
  },
}

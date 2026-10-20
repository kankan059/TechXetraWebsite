import { AppError } from '../common/errors'
import { logger } from '../common/logger'
import { mapDatabaseError } from './constraints'

export * from './guards'
export * from './constraints'

export interface BatchExecutionOptions {
  customGuardMessage?: string
  logContext?: Record<string, unknown>
}

/**
 * Executes an atomic batch of prepared statements on Cloudflare D1.
 *
 * If any statement fails (e.g., constraint violation or _guard check failure),
 * D1 rolls back all statements in the batch.
 * Known errors are mapped to stable AppError instances.
 * Unknown errors are logged with redaction and rethrown as 500 INTERNAL_SERVER_ERROR.
 */
export async function executeBatch(
  db: D1Database,
  statements: D1PreparedStatement[],
  options?: BatchExecutionOptions
): Promise<D1Response[]> {
  if (statements.length === 0) {
    return []
  }

  try {
    return await db.batch(statements)
  } catch (err: unknown) {
    const mapped = mapDatabaseError(err, options?.customGuardMessage)
    if (mapped) {
      throw mapped
    }

    logger.error('D1 batch execution failed with unexpected error', err, options?.logContext)
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'A database operation failed')
  }
}

/**
 * D1 batch atomicity guard helpers.
 *
 * In Cloudflare D1, batch statements are executed in a single transaction.
 * If any statement in the batch fails, SQLite rolls back the entire batch.
 *
 * The `_guard` table has a CHECK (0) constraint and remains strictly empty.
 * Any attempt to insert a row into `_guard` will immediately fail, aborting
 * the batch and reverting all prior writes.
 */

export function guardWhen(
  db: D1Database,
  conflictConditionSql: string,
  bindings: unknown[] = []
): D1PreparedStatement {
  return db
    .prepare(`INSERT INTO _guard (id) SELECT 1 WHERE (${conflictConditionSql})`)
    .bind(...bindings)
}

export function guardUnless(
  db: D1Database,
  requiredConditionSql: string,
  bindings: unknown[] = []
): D1PreparedStatement {
  return db
    .prepare(`INSERT INTO _guard (id) SELECT 1 WHERE NOT (${requiredConditionSql})`)
    .bind(...bindings)
}

/**
 * Verify-after-write guard:
 * Verifies that a target row exists in the expected state after a conditional UPDATE.
 * Because a conditional UPDATE affecting 0 rows does NOT throw an error in SQLite,
 * this guard ensures the batch aborts if the conditional write did not take effect.
 */
export function guardVerifyRow(
  db: D1Database,
  table: string,
  whereConditionSql: string,
  bindings: unknown[] = []
): D1PreparedStatement {
  return guardUnless(
    db,
    `EXISTS (SELECT 1 FROM ${table} WHERE ${whereConditionSql})`,
    bindings
  )
}

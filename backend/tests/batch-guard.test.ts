import { describe, it, expect, vi } from 'vitest'
import { guardWhen, guardUnless, guardVerifyRow } from '../src/db/guards'
import { executeBatch } from '../src/db/batch'
import { AppError } from '../src/common/errors'

describe('D1 Batch Guard Builders', () => {
  const dummyDb = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...args: any[]) => ({ sql, args })),
    })),
  } as unknown as D1Database

  it('builds guardWhen statement correctly', () => {
    const stmt = guardWhen(dummyDb, 'seats_taken >= capacity', [10]) as any
    expect(stmt.sql).toBe(
      'INSERT INTO _guard (id) SELECT 1 WHERE (seats_taken >= capacity)'
    )
    expect(stmt.args).toEqual([10])
  })

  it('builds guardUnless statement correctly', () => {
    const stmt = guardUnless(dummyDb, "status = 'OPEN'", []) as any
    expect(stmt.sql).toBe(
      "INSERT INTO _guard (id) SELECT 1 WHERE NOT (status = 'OPEN')"
    )
    expect(stmt.args).toEqual([])
  })

  it('builds guardVerifyRow statement correctly', () => {
    const stmt = guardVerifyRow(
      dummyDb,
      'teams',
      "id = ? AND status = 'LOCKED'",
      ['team-1']
    ) as any
    expect(stmt.sql).toBe(
      "INSERT INTO _guard (id) SELECT 1 WHERE NOT (EXISTS (SELECT 1 FROM teams WHERE id = ? AND status = 'LOCKED'))"
    )
    expect(stmt.args).toEqual(['team-1'])
  })
})

describe('executeBatch Error Handling', () => {
  it('maps known guard violations to AppError with 409 status', async () => {
    const mockDb = {
      batch: vi.fn().mockRejectedValue(new Error('CHECK constraint failed: _guard')),
    } as unknown as D1Database

    await expect(
      executeBatch(mockDb, [{} as any], {
        customGuardMessage: 'Team was not in DRAFT status',
      })
    ).rejects.toMatchObject({
      name: 'AppError',
      status: 409,
      code: 'GUARD_VIOLATION',
      message: 'Team was not in DRAFT status',
    })
  })

  it('maps unknown errors to generic 500 without leaking details', async () => {
    const mockDb = {
      batch: vi.fn().mockRejectedValue(new Error('disk I/O error or SQLite internal 1234')),
    } as unknown as D1Database

    await expect(executeBatch(mockDb, [{} as any])).rejects.toMatchObject({
      name: 'AppError',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'A database operation failed',
    })
  })

  it('returns empty array when statements array is empty', async () => {
    const mockDb = {
      batch: vi.fn(),
    } as unknown as D1Database

    const res = await executeBatch(mockDb, [])
    expect(res).toEqual([])
    expect(mockDb.batch).not.toHaveBeenCalled()
  })
})

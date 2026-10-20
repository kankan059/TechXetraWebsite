import { describe, it, expect, vi } from 'vitest'
import {
  computeProfileCompleteness,
  formatUserProfile,
  updateParticipantProfile,
} from '../src/services/profile.service'
import {
  assertSuperAdmin,
  assertPaymentReviewer,
  assertOwnership,
} from '../src/services/authz.service'
import { AppError } from '../src/common/errors'
import type { User } from '../src/types'

describe('Profile Completeness', () => {
  it('correctly identifies missing fields for new participant', () => {
    const completeness = computeProfileCompleteness({
      name: '',
      phone: null,
      is_student: 0,
    })

    expect(completeness.isComplete).toBe(false)
    expect(completeness.missingFields).toContain('name')
    expect(completeness.missingFields).toContain('phone')
  })

  it('marks non-student as complete when name and valid phone are present', () => {
    const completeness = computeProfileCompleteness({
      name: 'Alice Wonder',
      phone: '9876543210',
      is_student: 0,
    })

    expect(completeness.isComplete).toBe(true)
    expect(completeness.missingFields).toHaveLength(0)
  })

  it('requires institution name and institution ID when is_student = 1', () => {
    const studentIncomplete = computeProfileCompleteness({
      name: 'Bob Student',
      phone: '9876543210',
      is_student: 1,
      institution_name: null,
      institution_id: null,
    })

    expect(studentIncomplete.isComplete).toBe(false)
    expect(studentIncomplete.missingFields).toContain('institution_name')
    expect(studentIncomplete.missingFields).toContain('institution_id')

    const studentComplete = computeProfileCompleteness({
      name: 'Bob Student',
      phone: '9876543210',
      is_student: 1,
      institution_name: 'Tezpur University',
      institution_id: 'CSB21001',
    })

    expect(studentComplete.isComplete).toBe(true)
    expect(studentComplete.missingFields).toHaveLength(0)
  })
})

describe('Profile Update & Student Field Lock', () => {
  const baseUser: User = {
    id: 'user-p1',
    google_sub: 'sub-p1',
    email: 'alice@example.com',
    name: 'Alice',
    avatar_url: null,
    phone: '9876543210',
    is_student: 1,
    institution_name: 'Tech University',
    institution_id: 'TU-001',
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  it('updates profile and normalizes phone number', async () => {
    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn().mockResolvedValue({}),
        })),
      })),
    } as unknown as D1Database

    const updated = await updateParticipantProfile(
      mockDb,
      baseUser,
      { phone: '+91 99988 77665', name: 'Alice Smith' },
      2000
    )

    expect(updated.name).toBe('Alice Smith')
    expect(updated.phone).toBe('9998877665')
  })

  it('rejects changes to student fields when student_fields_locked = 1', async () => {
    const lockedUser: User = {
      ...baseUser,
      student_fields_locked: 1, // locked after purchase!
    }

    const mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database

    // Attempting to change is_student
    await expect(
      updateParticipantProfile(mockDb, lockedUser, { is_student: false })
    ).rejects.toMatchObject({
      status: 403,
      code: 'STUDENT_FIELDS_LOCKED',
    })

    // Attempting to change institution_id
    await expect(
      updateParticipantProfile(mockDb, lockedUser, { institution_id: 'NEW-ID' })
    ).rejects.toMatchObject({
      status: 403,
      code: 'STUDENT_FIELDS_LOCKED',
    })

    // But name and phone can still be updated
    const mockDbAllow = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn().mockResolvedValue({}),
        })),
      })),
    } as unknown as D1Database

    const allowed = await updateParticipantProfile(
      mockDbAllow,
      lockedUser,
      { name: 'Alice Updated' },
      3000
    )
    expect(allowed.name).toBe('Alice Updated')
  })
})

describe('Authorization & Existence Hiding', () => {
  const participant: User = {
    id: 'user-part-1',
    google_sub: 'sub-p1',
    email: 'part@example.com',
    name: 'Participant',
    avatar_url: null,
    phone: '9876543210',
    is_student: 0,
    institution_name: null,
    institution_id: null,
    student_fields_locked: 0,
    role: 'PARTICIPANT',
    can_review_payments: 0,
    is_active: 1,
    profile_completed_at: 1000,
    created_at: 1000,
    updated_at: 1000,
  }

  const superAdmin: User = {
    ...participant,
    id: 'admin-1',
    role: 'SUPER_ADMIN',
  }

  const reviewer: User = {
    ...participant,
    id: 'reviewer-1',
    role: 'VOLUNTEER',
    can_review_payments: 1,
  }

  it('assertSuperAdmin enforces SUPER_ADMIN role only', () => {
    expect(() => assertSuperAdmin(superAdmin)).not.toThrow()
    expect(() => assertSuperAdmin(participant)).toThrow(AppError)
    expect(() => assertSuperAdmin(reviewer)).toThrow(AppError)
  })

  it('assertPaymentReviewer allows SUPER_ADMIN or can_review_payments = 1', () => {
    expect(() => assertPaymentReviewer(superAdmin)).not.toThrow()
    expect(() => assertPaymentReviewer(reviewer)).not.toThrow()
    expect(() => assertPaymentReviewer(participant)).toThrow(AppError)
  })

  it('assertOwnership returns 404 NOT_FOUND for existence hiding when unauthorized', () => {
    // Owner accessing own resource
    expect(() => assertOwnership(participant, 'user-part-1', 'Purchase')).not.toThrow()

    // SuperAdmin accessing someone else's resource
    expect(() => assertOwnership(superAdmin, 'user-part-1', 'Purchase')).not.toThrow()

    // Another participant accessing someone else's resource -> 404 NOT_FOUND
    expect(() => assertOwnership(participant, 'someone-elses-id', 'Purchase')).toThrow(
      expect.objectContaining({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Purchase not found',
      })
    )
  })
})

import { AppError } from '../common/errors'
import { normalizePhoneNumber } from '../common/utils'
import type { User, UserRole } from '../types'

export interface ProfileCompleteness {
  isComplete: boolean
  missingFields: string[]
}

export function computeProfileCompleteness(user: {
  name?: string | null
  phone?: string | null
  is_student: number
  institution_name?: string | null
  institution_id?: string | null
}): ProfileCompleteness {
  const missing: string[] = []

  if (!user.name || user.name.trim().length < 2) {
    missing.push('name')
  }

  if (!user.phone || !/^[6-9]\d{9}$/.test(user.phone)) {
    missing.push('phone')
  }

  if (user.is_student === 1) {
    if (!user.institution_name || user.institution_name.trim().length < 2) {
      missing.push('institution_name')
    }
    if (
      !user.institution_id ||
      user.institution_id.trim().length === 0 ||
      user.institution_id.trim().length > 40
    ) {
      missing.push('institution_id')
    }
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  }
}

export interface FormattedUserProfile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  phone: string | null
  is_student: boolean
  institution_name: string | null
  institution_id: string | null
  student_fields_locked: boolean
  role: UserRole
  can_review_payments: boolean
  profile_complete: boolean
  missing_fields: string[]
}

export function formatUserProfile(user: User): FormattedUserProfile {
  const completeness = computeProfileCompleteness(user)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    phone: user.phone,
    is_student: Boolean(user.is_student),
    institution_name: user.institution_name,
    institution_id: user.institution_id,
    student_fields_locked: Boolean(user.student_fields_locked),
    role: user.role,
    can_review_payments: Boolean(user.can_review_payments),
    profile_complete: completeness.isComplete,
    missing_fields: completeness.missingFields,
  }
}

export interface UpdateProfileInput {
  name?: string
  phone?: string
  is_student?: boolean
  institution_name?: string | null
  institution_id?: string | null
}

export async function updateParticipantProfile(
  db: D1Database,
  user: User,
  input: UpdateProfileInput,
  now = Date.now()
): Promise<User> {
  // Check student fields lock
  const isEditingStudentFields =
    input.is_student !== undefined ||
    input.institution_name !== undefined ||
    input.institution_id !== undefined

  if (user.student_fields_locked === 1 && isEditingStudentFields) {
    throw new AppError(
      403,
      'STUDENT_FIELDS_LOCKED',
      'Student profile fields are locked after purchase approval and can only be modified by administrators'
    )
  }

  let newName = user.name
  if (input.name !== undefined) {
    const trimmed = input.name.trim()
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Name must be between 2 and 100 characters')
    }
    newName = trimmed
  }

  let newPhone = user.phone
  if (input.phone !== undefined) {
    newPhone = normalizePhoneNumber(input.phone)
  }

  let newIsStudent = user.is_student
  if (input.is_student !== undefined) {
    newIsStudent = input.is_student ? 1 : 0
  }

  let newInstitutionName = user.institution_name
  if (input.institution_name !== undefined) {
    if (input.institution_name === null || input.institution_name.trim() === '') {
      newInstitutionName = null
    } else {
      const trimmed = input.institution_name.trim()
      if (trimmed.length < 2 || trimmed.length > 100) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Institution name must be between 2 and 100 characters'
        )
      }
      newInstitutionName = trimmed
    }
  }

  let newInstitutionId = user.institution_id
  if (input.institution_id !== undefined) {
    if (input.institution_id === null || input.institution_id.trim() === '') {
      newInstitutionId = null
    } else {
      const trimmed = input.institution_id.trim()
      if (trimmed.length < 1 || trimmed.length > 40) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Institution ID must be between 1 and 40 characters'
        )
      }
      newInstitutionId = trimmed
    }
  }

  // If not student, clear institution fields
  if (newIsStudent === 0 && input.is_student !== undefined) {
    newInstitutionName = null
    newInstitutionId = null
  }

  // Calculate completeness
  const completeness = computeProfileCompleteness({
    name: newName,
    phone: newPhone,
    is_student: newIsStudent,
    institution_name: newInstitutionName,
    institution_id: newInstitutionId,
  })

  const profileCompletedAt = completeness.isComplete ? (user.profile_completed_at || now) : null

  await db
    .prepare(
      `UPDATE users SET
        name = ?,
        phone = ?,
        is_student = ?,
        institution_name = ?,
        institution_id = ?,
        profile_completed_at = ?,
        updated_at = ?
      WHERE id = ?`
    )
    .bind(
      newName,
      newPhone,
      newIsStudent,
      newInstitutionName,
      newInstitutionId,
      profileCompletedAt,
      now,
      user.id
    )
    .run()

  return {
    ...user,
    name: newName,
    phone: newPhone,
    is_student: newIsStudent,
    institution_name: newInstitutionName,
    institution_id: newInstitutionId,
    profile_completed_at: profileCompletedAt,
    updated_at: now,
  }
}

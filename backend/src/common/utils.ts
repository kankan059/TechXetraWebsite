import { AppError } from './errors'

/**
 * Generate a cryptographically secure random UUID v4 using Web Crypto API.
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Get current UTC timestamp in milliseconds.
 */
export function getCurrentTimeMs(): number {
  return Date.now()
}

/**
 * Convert timestamp in ms to ISO 8601 string.
 */
export function toIsoString(ms: number): string {
  return new Date(ms).toISOString()
}

/**
 * Normalize Indian phone number to 10 digits.
 * Accepts: "+919876543210", "09876543210", "9876543210" with optional spaces or hyphens.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new AppError(400, 'INVALID_PHONE', 'Phone number is required')
  }

  // Remove whitespace and hyphens
  let cleaned = rawPhone.replace(/[\s-]/g, '')

  // Remove leading +91 or 91 if length is 12
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3)
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2)
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1)
  }

  // Check if exactly 10 digits starting with 6-9
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    throw new AppError(
      400,
      'INVALID_PHONE',
      'Phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'
    )
  }

  return cleaned
}

/**
 * Normalize transaction ID / UTR:
 * trim, uppercase, remove spaces; validate ^[A-Z0-9]{8,35}$
 */
export function normalizeTransactionId(rawUtr: string): string {
  if (!rawUtr || typeof rawUtr !== 'string') {
    throw new AppError(400, 'INVALID_UTR', 'Transaction ID / UTR is required')
  }

  const cleaned = rawUtr.replace(/\s+/g, '').toUpperCase()

  if (!/^[A-Z0-9]{8,35}$/.test(cleaned)) {
    throw new AppError(
      400,
      'INVALID_UTR',
      'Transaction ID must be 8 to 35 alphanumeric characters'
    )
  }

  return cleaned
}

/**
 * Normalize email: trim and lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

/**
 * Convert rupees to integer paise without float errors.
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'number') {
    if (isNaN(rupees) || !isFinite(rupees) || rupees < 0) {
      throw new AppError(400, 'INVALID_PRICE', 'Invalid price amount')
    }
    return Math.round(rupees * 100)
  }
  const parsed = parseFloat(rupees)
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    throw new AppError(400, 'INVALID_PRICE', 'Invalid price string')
  }
  return Math.round(parsed * 100)
}

/**
 * Convert integer paise to rupee string, e.g. 30000 -> "300.00"
 */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2)
}

/**
 * Format paise to currency string, e.g. "₹300"
 */
export function formatPaise(paise: number): string {
  if (paise % 100 === 0) {
    return `₹${paise / 100}`
  }
  return `₹${(paise / 100).toFixed(2)}`
}

/**
 * Cursor pagination helpers
 */
export interface CursorPayload {
  id: string
  sortValue?: number | string
}

export function encodeCursor(payload: CursorPayload): string {
  const jsonStr = JSON.stringify(payload)
  return btoa(jsonStr)
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const jsonStr = atob(cursor)
    const obj = JSON.parse(jsonStr)
    if (obj && typeof obj.id === 'string') {
      return obj as CursorPayload
    }
    return null
  } catch {
    return null
  }
}

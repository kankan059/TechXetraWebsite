import { AppError } from '../common/errors'

/**
 * Encodes an ArrayBuffer or Uint8Array into a Base64URL string (RFC 4648 §5).
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Constant-time byte comparison to prevent timing attacks.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Computes truncated HMAC-SHA256 signature for QR token.
 * Payload: "tx1|<ticket_id>|<qr_version>"
 * Truncated to 22 characters of base64url.
 */
export async function generateQrSignature(
  secret: string,
  ticketId: string,
  qrVersion: number
): Promise<string> {
  if (!secret) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Missing TICKET_HMAC_SECRET for QR generation')
  }

  const payload = `tx1|${ticketId}|${qrVersion}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const base64Url = bufferToBase64Url(signatureBuffer)
  return base64Url.slice(0, 22)
}

/**
 * Generates full signed QR token: tx1.<ticket_id>.<qr_version>.<sig>
 */
export async function generateQrToken(
  secret: string,
  ticketId: string,
  qrVersion: number
): Promise<string> {
  const sig = await generateQrSignature(secret, ticketId, qrVersion)
  return `tx1.${ticketId}.${qrVersion}.${sig}`
}

export interface ParsedQrToken {
  ticketId: string
  qrVersion: number
  signature: string
}

/**
 * Validates and verifies a signed QR token string.
 * Rejects malformed tokens and signature mismatches before database queries.
 */
export async function verifyAndParseQrToken(
  token: string,
  secret: string
): Promise<ParsedQrToken> {
  if (!token || typeof token !== 'string') {
    throw new AppError(400, 'INVALID_QR_TOKEN', 'QR token is required')
  }

  if (!secret) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Missing TICKET_HMAC_SECRET for QR verification')
  }

  const parts = token.trim().split('.')
  if (parts.length !== 4) {
    throw new AppError(400, 'INVALID_QR_TOKEN', 'Malformed QR token format')
  }

  const [prefix, ticketId, qrVersionStr, signature] = parts

  if (prefix !== 'tx1') {
    throw new AppError(400, 'INVALID_QR_TOKEN', 'Unsupported QR token scheme')
  }

  if (!ticketId || !/^[A-Za-z0-9_-]+$/.test(ticketId)) {
    throw new AppError(400, 'INVALID_QR_TOKEN', 'Malformed ticket identifier in QR token')
  }

  const qrVersion = parseInt(qrVersionStr, 10)
  if (isNaN(qrVersion) || qrVersion < 1 || String(qrVersion) !== qrVersionStr) {
    throw new AppError(400, 'INVALID_QR_TOKEN', 'Invalid QR version number')
  }

  if (!signature || signature.length !== 22 || !/^[A-Za-z0-9_-]+$/.test(signature)) {
    throw new AppError(400, 'INVALID_QR_TOKEN', 'Invalid QR signature format')
  }

  const expectedSig = await generateQrSignature(secret, ticketId, qrVersion)
  if (!constantTimeEqual(expectedSig, signature)) {
    throw new AppError(401, 'INVALID_QR_SIGNATURE', 'QR signature verification failed')
  }

  return {
    ticketId,
    qrVersion,
    signature,
  }
}

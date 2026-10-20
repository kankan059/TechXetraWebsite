import { createRemoteJWKSet, jwtVerify, errors, type JWTPayload } from 'jose'
import { AppError } from '../common/errors'
import { normalizeEmail } from '../common/utils'

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

let remoteJWKS: ReturnType<typeof createRemoteJWKSet> | null = null

function getGoogleJWKS() {
  if (!remoteJWKS) {
    remoteJWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL))
  }
  return remoteJWKS
}

export interface GoogleUserPayload {
  sub: string
  email: string
  name: string
  avatarUrl: string | null
}

export interface VerifyGoogleTokenOptions {
  idToken: string
  expectedClientId: string
  // Optional key for local test environments
  testSecretKey?: Uint8Array
}

export async function verifyGoogleIdToken(
  options: VerifyGoogleTokenOptions
): Promise<GoogleUserPayload> {
  const { idToken, expectedClientId, testSecretKey } = options

  if (!idToken || typeof idToken !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Google ID token is required')
  }

  let payload: JWTPayload

  try {
    if (testSecretKey) {
      // Test environment verification with symmetric key
      const result = await jwtVerify(idToken, testSecretKey, {
        audience: expectedClientId,
        issuer: GOOGLE_ISSUERS,
      })
      payload = result.payload
    } else {
      // Production Google JWKS verification
      const jwks = getGoogleJWKS()
      const result = await jwtVerify(idToken, jwks, {
        audience: expectedClientId,
        issuer: GOOGLE_ISSUERS,
      })
      payload = result.payload
    }
  } catch (err: any) {
    if (
      err instanceof errors.JWTExpired ||
      err?.code === 'ERR_JWT_EXPIRED' ||
      err?.name === 'JWTExpired' ||
      err?.message?.includes('"exp"') ||
      err?.message?.includes('expired')
    ) {
      throw new AppError(401, 'SESSION_EXPIRED', 'Google token has expired')
    }
    const message = err?.message || 'Invalid token'
    throw new AppError(401, 'UNAUTHORIZED', `Google token verification failed: ${message}`)
  }

  // Validate required claims
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Token is missing subject claim')
  }

  if (!payload.email || typeof payload.email !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Token is missing email claim')
  }

  if (payload.email_verified !== true) {
    throw new AppError(401, 'UNAUTHORIZED', 'Google email is not verified')
  }

  const name =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : payload.email.split('@')[0]

  const avatarUrl =
    typeof payload.picture === 'string' && payload.picture.startsWith('https://')
      ? payload.picture
      : null

  return {
    sub: payload.sub,
    email: normalizeEmail(payload.email),
    name,
    avatarUrl,
  }
}

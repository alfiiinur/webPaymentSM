import { createHash, randomBytes } from 'crypto'

/**
 * Generates a cryptographically secure activation token.
 * Returns both the raw token (for URL) and hashed token (for DB storage).
 * Never store the raw token in the database.
 */
export function generateActivationToken(): {
  rawToken: string
  hashedToken: string
} {
  const rawToken = randomBytes(32).toString('hex') // 64 hex chars
  const hashedToken = hashToken(rawToken)
  return { rawToken, hashedToken }
}

/**
 * SHA256 hash of a raw token for safe DB storage.
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

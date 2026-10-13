import { createHash } from 'crypto'

/**
 * Validates Midtrans webhook signature.
 *
 * Midtrans signature: SHA512(order_id + status_code + gross_amount + server_key)
 * https://docs.midtrans.com/reference/receiving-notifications
 */
export function validateMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  incomingSignature: string
): boolean {
  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`
  const expected = createHash('sha512').update(payload).digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== incomingSignature.length) return false

  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ incomingSignature.charCodeAt(i)
  }
  return mismatch === 0
}

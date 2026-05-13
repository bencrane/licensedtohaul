import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Compute HMAC-SHA256 of rawBody using the given secret.
 * Returns hex-encoded digest.
 */
export function computeDisbursementHmac(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Verify an incoming X-Disbursement-Signature header against the raw body.
 * Constant-time compare.
 */
export function verifyDisbursementHmac(
  rawBody: Buffer,
  incomingHex: string,
  secret: string,
): boolean {
  const expected = computeDisbursementHmac(rawBody, secret);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(incomingHex, 'hex'));
  } catch {
    return false;
  }
}

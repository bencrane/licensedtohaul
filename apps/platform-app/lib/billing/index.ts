import type { StripeBillingClient } from './types';
import { FakeStripeBillingClient } from './fake';
import { RealStripeBillingClient } from './stripe';

let _client: StripeBillingClient | null = null;

export function getStripeBillingClient(): StripeBillingClient {
  if (_client) return _client;

  const apiKey = process.env.STRIPE_API_KEY ?? '';
  if (apiKey === 'sk_test_fake' || apiKey === '') {
    _client = new FakeStripeBillingClient();
  } else if (apiKey.startsWith('sk_live_') || apiKey.startsWith('sk_test_')) {
    _client = new RealStripeBillingClient();
  } else {
    _client = new FakeStripeBillingClient();
  }
  return _client;
}

/** Reset singleton — used in tests to swap clients between runs. */
export function resetStripeBillingClient(): void {
  _client = null;
}

export type { StripeBillingClient } from './types';
export { FakeStripeBillingClient } from './fake';
export { RealStripeBillingClient } from './stripe';

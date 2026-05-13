import type { StripeBillingClient, MeterEventInput, MeterEventResult } from './types';

/**
 * RealStripeBillingClient — stub for follow-up cycle.
 * All methods throw "not implemented" until the real Stripe Billing integration is wired.
 */
export class RealStripeBillingClient implements StripeBillingClient {
  emitMeterEvent(_input: MeterEventInput): Promise<MeterEventResult> {
    throw new Error('RealStripeBillingClient: not implemented — use FakeStripeBillingClient in tests');
  }
}

// Using stripe@^16 which exposes billing.meters and billing.meterEvents.
// API version 2024-06-20 is the default for stripe@16.x.
import Stripe from 'stripe';
import type { StripeBillingClient, MeterEventInput, MeterEventResult, OnboardFactorBillingInput, OnboardFactorBillingResult } from './types';

function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_API_KEY;
  if (!apiKey) throw new Error('Missing STRIPE_API_KEY in Doppler');
  return new Stripe(apiKey);
}

/**
 * RealStripeBillingClient — real Stripe test-mode calls.
 * Constructed only when STRIPE_API_KEY is present and starts with sk_test_ or sk_live_.
 */
export class RealStripeBillingClient implements StripeBillingClient {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = getStripeClient();
  }

  async emitMeterEvent(input: MeterEventInput): Promise<MeterEventResult> {
    const event = await this.stripe.billing.meterEvents.create({
      event_name: input.event,
      payload: {
        stripe_customer_id: input.customer,
        value: String(input.value),
      },
      identifier: input.idempotencyKey,
    } as Parameters<typeof this.stripe.billing.meterEvents.create>[0]);

    return {
      id: input.idempotencyKey ?? `evt-${Date.now()}`,
      customer: input.customer,
      event: input.event,
      value: input.value,
      timestamp: new Date(),
    };
  }
}

/**
 * Onboard a factor onto Stripe Billing:
 * 1. Create a Stripe customer with factor metadata
 * 2. Create a quarterly platform-fee subscription ($2500/quarter = billed monthly x3)
 * 3. Create a usage-based meter for disbursement skim
 * Returns customer/subscription/meter IDs.
 */
export async function onboardFactorToStripe(
  input: OnboardFactorBillingInput,
): Promise<OnboardFactorBillingResult> {
  const stripe = getStripeClient();

  // 1. Create customer
  const customer = await stripe.customers.create({
    email: input.email,
    metadata: {
      factor_slug: input.factorSlug,
      platform: 'licensed-to-haul',
    },
  });

  // 2. Create a price for the quarterly platform fee
  // interval=month, interval_count=3 = quarterly
  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: input.platformFeeCents,
    recurring: {
      interval: 'month',
      interval_count: 3,
    },
    product_data: {
      name: `LTH Platform Fee — ${input.factorSlug}`,
    },
  });

  // 3. Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
  });

  // 4. Create a meter for disbursement skim usage
  const meter = await stripe.billing.meters.create({
    display_name: `Disbursement Skim — ${input.factorSlug}`,
    event_name: `disbursement_skim_${input.factorSlug.replace(/-/g, '_')}`,
    default_aggregation: { formula: 'sum' },
    customer_mapping: {
      event_payload_key: 'stripe_customer_id',
      type: 'by_id',
    },
    value_settings: {
      event_payload_key: 'value',
    },
  });

  return {
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    stripeMeterId: meter.id,
  };
}

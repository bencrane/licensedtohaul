// Test 11: real Stripe onboarding (skipped if STRIPE_API_KEY absent)
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import type { Client } from 'pg';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const SKIP_TEST = !STRIPE_API_KEY || STRIPE_API_KEY === 'sk_test_fake' || STRIPE_API_KEY === '';

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;

// Track Stripe objects created for cleanup
let createdStripeCustomerId: string | null = null;
let createdStripeSubscriptionId: string | null = null;

beforeAll(async () => {
  if (SKIP_TEST) return;

  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('LTH_DB_POOLED_URL', process.env.LTH_DB_POOLED_URL!);
});

afterAll(async () => {
  if (SKIP_TEST) return;

  // Clean up Stripe objects created during the test
  if (createdStripeCustomerId || createdStripeSubscriptionId) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(STRIPE_API_KEY!, { apiVersion: '2022-11-15' });
      if (createdStripeSubscriptionId) {
        await stripe.subscriptions.cancel(createdStripeSubscriptionId).catch(() => {});
      }
      if (createdStripeCustomerId) {
        await stripe.customers.del(createdStripeCustomerId).catch(() => {});
      }
    } catch (err) {
      console.warn('Stripe cleanup warning:', err);
    }
  }

  await cleanup?.();
});

describe('onboardFactorBilling', () => {
  it.skipIf(SKIP_TEST)('creates real Stripe customer + subscription + meter and persists to DB', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.LTH_DB_POOLED_URL!, max: 1 });

    try {
      const { onboardFactorBilling } = await import('@/lib/billing/onboarding');
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

      const result = await onboardFactorBilling(
        {
          factorSlug: 'apex-capital',
          email: 'billing@apexcapital.test',
          platformFeeCents: 250000,
          disbursementBps: 50,
        },
        { pool: pool as unknown as import('pg').Pool },
      );

      createdStripeCustomerId = result.stripeCustomerId;
      createdStripeSubscriptionId = result.stripeSubscriptionId;

      expect(result.stripeCustomerId).toMatch(/^cus_/);
      expect(result.stripeSubscriptionId).toMatch(/^sub_/);
      expect(result.stripeMeterId).toBeTruthy();

      // Verify Stripe customer exists with metadata
      const customer = await stripe.customers.retrieve(result.stripeCustomerId);
      expect(customer.deleted).toBeFalsy();
      if ('metadata' in customer) {
        expect(customer.metadata.factor_slug).toBe('apex-capital');
      }

      // Verify subscription: quarterly billing
      const subscription = await stripe.subscriptions.retrieve(result.stripeSubscriptionId);
      const item = subscription.items.data[0];
      expect(item?.price.recurring?.interval).toBe('month');
      expect(item?.price.recurring?.interval_count).toBe(3);

      // Verify DB: factor_stripe_customers updated
      const { rows: scRows } = await client.query(
        `SELECT stripe_customer_id, stripe_subscription_id, stripe_meter_id_disbursement_skim
         FROM "${schemaName}".factor_stripe_customers
         WHERE factor_slug = 'apex-capital'`,
      );
      expect(scRows).toHaveLength(1);
      expect(scRows[0].stripe_customer_id).toBe(result.stripeCustomerId);
      expect(scRows[0].stripe_subscription_id).toBe(result.stripeSubscriptionId);
      expect(scRows[0].stripe_meter_id_disbursement_skim).toBe(result.stripeMeterId);
    } finally {
      await pool.end();
    }
  });

  it.skipIf(!SKIP_TEST)('STRIPE_API_KEY absent — test skipped cleanly', () => {
    console.warn('Test 11 SKIPPED: STRIPE_API_KEY not in Doppler');
  });
});

// Test 12: Stripe billing meter event emit (skipped if STRIPE_API_KEY absent)
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import type { Client } from 'pg';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const SKIP_TEST = !STRIPE_API_KEY || STRIPE_API_KEY === 'sk_test_fake' || STRIPE_API_KEY === '';

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;

let testCustomerId: string | null = null;
let testSubscriptionId: string | null = null;

beforeAll(async () => {
  if (SKIP_TEST) return;

  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('HQX_DB_URL_POOLED', process.env.HQX_DB_URL_POOLED!);

  // Set up: onboard factor with real Stripe objects (same as Test 11)
  try {
    const { onboardFactorBilling } = await import('@/lib/billing/onboarding');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    const result = await onboardFactorBilling(
      {
        factorSlug: 'apex-capital-emit-test',
        email: 'emit-test@apexcapital.test',
        platformFeeCents: 250000,
        disbursementBps: 50,
      },
      { pool: pool as unknown as import('pg').Pool },
    );
    testCustomerId = result.stripeCustomerId;
    testSubscriptionId = result.stripeSubscriptionId;
    await pool.end();

    // Seed 3 disbursement billing events (pending)
    for (let i = 0; i < 3; i++) {
      const amountCents = [200000, 150000, 150000][i]; // $2000 + $1500 + $1500 = $5000
      await client.query(
        `INSERT INTO "${schemaName}".factor_billing_events
           (factor_slug, event_name, payload, emitted)
         VALUES ('apex-capital-emit-test', 'disbursement.observed', $1::jsonb, false)`,
        [JSON.stringify({ amount: amountCents / 100, amount_cents: amountCents, carrier_dot: '1234567' })],
      );
    }
  } catch (err) {
    console.error('Test 12 setup error:', err);
  }
});

afterAll(async () => {
  if (SKIP_TEST) return;

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_API_KEY!, { apiVersion: '2022-11-15' });
    if (testSubscriptionId) await stripe.subscriptions.cancel(testSubscriptionId).catch(() => {});
    if (testCustomerId) await stripe.customers.del(testCustomerId).catch(() => {});
  } catch {}

  await cleanup?.();
});

describe('emitPendingBillingEvents — disbursement.observed', () => {
  it.skipIf(SKIP_TEST)('emits 3 disbursement events and marks emitted=true', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      // Reset billing client to use real Stripe
      const { resetStripeBillingClient } = await import('@/lib/billing/index');
      resetStripeBillingClient();

      const { emitPendingBillingEvents } = await import('@/lib/billing/emit');
      const result = await emitPendingBillingEvents({ pool: pool as unknown as import('pg').Pool });

      expect(result.emittedCount).toBe(3);

      // Verify all 3 rows marked emitted
      const { rows } = await client.query(
        `SELECT emitted FROM "${schemaName}".factor_billing_events
         WHERE factor_slug = 'apex-capital-emit-test'`,
      );
      expect(rows.every((r) => r.emitted === true)).toBe(true);
    } finally {
      await pool.end();
    }
  });

  it.skipIf(!SKIP_TEST)('STRIPE_API_KEY absent — test skipped cleanly', () => {
    console.warn('Test 12 SKIPPED: STRIPE_API_KEY not in Doppler');
  });
});

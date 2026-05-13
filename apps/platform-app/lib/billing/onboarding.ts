import { Pool } from 'pg';
import { onboardFactorToStripe } from './stripe';
import type { OnboardFactorBillingInput, OnboardFactorBillingResult } from './types';

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error('LTH_DB_POOLED_URL not set');
  return new Pool({ connectionString: connString, max: 2 });
}

let _pool: Pool | null = null;
function defaultPool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

/**
 * Onboard a factor onto Stripe Billing:
 * - Creates Stripe customer + quarterly subscription + disbursement skim meter
 * - Persists IDs to factor_stripe_customers
 * - Persists billing config to factor_billing_config
 * Requires STRIPE_API_KEY in environment.
 */
export async function onboardFactorBilling(
  input: OnboardFactorBillingInput,
  opts?: { pool?: Pool },
): Promise<OnboardFactorBillingResult> {
    const db = opts?.pool ?? defaultPool();

  const apiKey = process.env.STRIPE_API_KEY;
  if (!apiKey || apiKey === 'sk_test_fake' || apiKey === '') {
    throw new Error('onboardFactorBilling requires a real STRIPE_API_KEY in Doppler');
  }

  const result = await onboardFactorToStripe(input);

  // Upsert factor_stripe_customers
  await db.query(
    `INSERT INTO factor_stripe_customers
       (factor_slug, stripe_customer_id, stripe_subscription_id, stripe_meter_id_disbursement_skim)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (factor_slug) DO UPDATE
       SET stripe_customer_id = EXCLUDED.stripe_customer_id,
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           stripe_meter_id_disbursement_skim = EXCLUDED.stripe_meter_id_disbursement_skim,
           updated_at = now()`,
    [input.factorSlug, result.stripeCustomerId, result.stripeSubscriptionId, result.stripeMeterId],
  );

  // Upsert factor_billing_config
  await db.query(
    `INSERT INTO factor_billing_config
       (factor_slug, platform_fee_cents, disbursement_bps)
     VALUES ($1, $2, $3)
     ON CONFLICT (factor_slug) DO UPDATE
       SET platform_fee_cents = EXCLUDED.platform_fee_cents,
           disbursement_bps = EXCLUDED.disbursement_bps,
           updated_at = now()`,
    [input.factorSlug, input.platformFeeCents, input.disbursementBps],
  );

  return result;
}

export type { OnboardFactorBillingInput, OnboardFactorBillingResult } from './types';

import { notFound } from "next/navigation";
import { Pool } from "pg";
import { ExternalLink } from "lucide-react";

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error("LTH_DB_POOLED_URL not set");
  return new Pool({ connectionString: connString, max: 2 });
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Billing · ${slug} — Licensed to Haul` };
}

export default async function BillingPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  // Load Stripe customer info
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  let platformFeeCents: number | null = null;
  let disbursementBps: number | null = null;

  try {
    const { rows: scRows } = await pool().query<{
      stripe_customer_id: string;
      stripe_subscription_id: string | null;
    }>(
      `SELECT stripe_customer_id, stripe_subscription_id
       FROM factor_stripe_customers
       WHERE factor_slug = $1`,
      [slug],
    );
    stripeCustomerId = scRows[0]?.stripe_customer_id ?? null;
    stripeSubscriptionId = scRows[0]?.stripe_subscription_id ?? null;

    const { rows: cfgRows } = await pool().query<{
      platform_fee_cents: string;
      disbursement_bps: string;
    }>(
      `SELECT platform_fee_cents, disbursement_bps
       FROM factor_billing_config
       WHERE factor_slug = $1`,
      [slug],
    );
    platformFeeCents = cfgRows[0] ? parseInt(cfgRows[0].platform_fee_cents, 10) : null;
    disbursementBps = cfgRows[0] ? parseInt(cfgRows[0].disbursement_bps, 10) : null;
  } catch {
    // Table may not exist — show not-configured state
  }

  const stripePortalUrl = stripeCustomerId
    ? `https://billing.stripe.com/p/login/test_placeholder?customer=${stripeCustomerId}`
    : null;

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Billing</h1>
        <p className="mt-1 text-sm text-stone-500">Stripe customer portal · invoice preview</p>
      </div>

      <div className="mx-auto max-w-[900px] space-y-6 px-6 py-8">
        {/* Stripe customer */}
        <div className="border border-line bg-white divide-y divide-line">
          <div className="px-6 py-4">
            <h2 className="font-display text-lg text-stone-900">Stripe Billing</h2>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Stripe customer ID</p>
              <p className="mt-0.5 font-mono text-xs text-stone-500">
                {stripeCustomerId ?? "Not configured"}
              </p>
            </div>
            {stripePortalUrl && (
              <a
                href={stripePortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:text-orange-800"
              >
                Customer portal
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {stripeSubscriptionId && (
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">Subscription ID</p>
                <p className="mt-0.5 font-mono text-xs text-stone-500">{stripeSubscriptionId}</p>
              </div>
            </div>
          )}

          {platformFeeCents !== null && disbursementBps !== null && (
            <>
              <div className="px-6 py-4 flex items-center justify-between">
                <p className="text-sm font-medium text-stone-900">Quarterly platform fee</p>
                <p className="text-sm text-stone-700">
                  ${(platformFeeCents / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                  })}/quarter
                </p>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <p className="text-sm font-medium text-stone-900">Disbursement skim</p>
                <p className="text-sm text-stone-700">{disbursementBps} bps (0.{disbursementBps}%)</p>
              </div>
            </>
          )}

          {!stripeCustomerId && (
            <div className="px-6 py-6 text-center">
              <p className="text-sm text-stone-500">
                Billing not yet configured. Contact support to onboard Stripe Billing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

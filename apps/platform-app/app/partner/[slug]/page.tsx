import { notFound } from "next/navigation";
import { Pool } from "pg";

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
  return {
    title: `${slug} · Overview — Licensed to Haul`,
  };
}

export default async function PartnerOverviewPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  // Active carrier count
  const { rows: forRows } = await pool().query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM factor_of_record
     WHERE factor_slug = $1 AND status = 'active'`,
    [slug],
  );
  const activeCarriers = parseInt(forRows[0]?.count ?? "0", 10);

  // Current quarter disbursements
  const quarter = new Date();
  const qStart = new Date(Date.UTC(quarter.getUTCFullYear(), Math.floor(quarter.getUTCMonth() / 3) * 3, 1));
  const qEnd = new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() + 3, 0));
  const qStartStr = qStart.toISOString().slice(0, 10);
  const qEndStr = qEnd.toISOString().slice(0, 10);

  const { rows: disbRows } = await pool().query<{ total_cents: string; count: string }>(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total_cents, COUNT(*) AS count
     FROM disbursements
     WHERE factor_slug = $1
       AND disbursed_at >= $2
       AND disbursed_at <= $3
       AND status = 'observed'`,
    [slug, qStartStr, qEndStr],
  ).catch(() => ({ rows: [{ total_cents: "0", count: "0" }] }));

  const totalDisbursedCents = parseInt(disbRows[0]?.total_cents ?? "0", 10);
  const totalDisbursedDollars = totalDisbursedCents / 100;
  // 50 bps default skim
  const skimDollars = totalDisbursedDollars * 0.005;

  const partnerName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">{partnerName}</h1>
        <p className="mt-1 text-sm text-stone-500">Factor partner overview</p>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="border border-line bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Active carriers
            </p>
            <p className="mt-2 font-display text-3xl text-stone-900">
              {activeCarriers} active carrier{activeCarriers !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="border border-line bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Disbursed this quarter
            </p>
            <p className="mt-2 font-display text-3xl text-stone-900">
              ${totalDisbursedDollars.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}{" "}
              disbursed this quarter
            </p>
          </div>

          <div className="border border-line bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Platform earnings (50 bps disbursement skim)
            </p>
            <p className="mt-2 font-display text-3xl text-stone-900">
              ${skimDollars.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              platform earnings this quarter from disbursements
            </p>
            <p className="mt-1 text-xs text-stone-500">50 bps disbursement skim</p>
          </div>
        </div>

        {activeCarriers === 0 && (
          <div className="border border-line bg-white p-6 text-center">
            <p className="text-sm text-stone-500">No carriers yet. Carriers will appear here once a Notice of Assignment is signed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

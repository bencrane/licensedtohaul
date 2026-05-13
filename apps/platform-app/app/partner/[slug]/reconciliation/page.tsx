import { notFound } from "next/navigation";
import { getReconciliation, formatCents } from "@/lib/reconciliation";

type Props = {
  params: Promise<{ slug: string }>;
};

function formatMonthDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Reconciliation · ${slug} — Licensed to Haul` };
}

export default async function ReconciliationPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const rec = await getReconciliation(slug, new Date());

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Reconciliation</h1>
        <p className="mt-1 text-sm text-stone-500">
          Billing cycle: {formatMonthDay(rec.windowStart)} – {formatMonthDay(rec.windowEnd)}
        </p>
      </div>

      <div className="mx-auto max-w-[900px] px-6 py-8">
        <div className="border border-line bg-white divide-y divide-line">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Billing window</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {formatMonthDay(rec.windowStart)} – {formatMonthDay(rec.windowEnd)}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Disbursements observed</p>
              <p className="text-xs text-stone-500 mt-0.5">{rec.disbursementCount} disbursement{rec.disbursementCount !== 1 ? "s" : ""}</p>
            </div>
            <p className="text-sm font-medium text-stone-900">{rec.disbursementCount}</p>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Total disbursed</p>
              <p className="text-xs text-stone-500 mt-0.5">Sum of all observed disbursements in window</p>
            </div>
            <p className="text-sm font-medium text-stone-900">{formatCents(rec.totalDisbursedCents)}</p>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Disbursement skim</p>
              <p className="text-xs text-stone-500 mt-0.5">{rec.disbursementBps} bps of disbursed amount</p>
            </div>
            <p className="text-sm font-medium text-stone-900">{formatCents(rec.disbursementSkimCents)}</p>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Quarterly platform fee</p>
              <p className="text-xs text-stone-500 mt-0.5">Fixed fee per billing cycle</p>
            </div>
            <p className="text-sm font-medium text-stone-900">{formatCents(rec.platformFeeCents)}</p>
          </div>

          <div className="bg-stone-50 px-6 py-5 flex items-center justify-between">
            <p className="font-display text-lg text-stone-900">Total due this cycle</p>
            <p className="font-display text-2xl text-stone-900">{formatCents(rec.totalDueCents)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

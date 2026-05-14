"use client";

import type { DisbursementRow } from "@/lib/disbursements/types";

type Props = {
  disbursements: DisbursementRow[];
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DisbursementTimeline({ disbursements }: Props) {
  if (disbursements.length === 0) {
    return (
      <div className="border border-line bg-surface px-5 py-8 text-center">
        <p className="text-sm text-stone-500">
          No disbursements on record yet. Your first payment will appear here once processed.
        </p>
      </div>
    );
  }

  const observed = disbursements.filter((d) => d.status === "observed");
  const mtdStart = new Date();
  mtdStart.setDate(1);
  const mtdStr = mtdStart.toISOString().slice(0, 10);

  const mtdTotal = observed
    .filter((d) => d.disbursed_at >= mtdStr)
    .reduce((sum, d) => sum + d.amount_cents, 0);

  const ytdStart = new Date();
  ytdStart.setMonth(0, 1);
  const ytdStr = ytdStart.toISOString().slice(0, 10);

  const ytdTotal = observed
    .filter((d) => d.disbursed_at >= ytdStr)
    .reduce((sum, d) => sum + d.amount_cents, 0);

  const allTimeTotal = observed.reduce((sum, d) => sum + d.amount_cents, 0);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-px border border-line bg-line">
        {[
          { label: "MTD", value: formatCents(mtdTotal) },
          { label: "YTD", value: formatCents(ytdTotal) },
          { label: "All time", value: formatCents(allTimeTotal) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              {label}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-stone-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-line bg-surface">
        <div className="border-b border-line bg-stone-50/40 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Disbursement history
          </p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-stone-500">
                Date
              </th>
              <th className="px-5 py-2.5 text-right font-semibold uppercase tracking-[0.1em] text-stone-500">
                Amount
              </th>
              <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-stone-500">
                Reference
              </th>
              <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-stone-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {disbursements.map((d) => (
              <tr key={d.id}>
                <td className="px-5 py-3 text-stone-700">{formatDate(d.disbursed_at)}</td>
                <td className="px-5 py-3 text-right font-mono text-stone-900">
                  {d.status === "reversed" ? (
                    <span className="text-red-600">−{formatCents(d.amount_cents)}</span>
                  ) : (
                    formatCents(d.amount_cents)
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-stone-500">
                  {d.reference_id ?? "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                      d.status === "observed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

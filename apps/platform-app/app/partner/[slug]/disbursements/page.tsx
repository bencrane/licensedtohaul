import { notFound } from "next/navigation";
import { getDisbursementsForFactor } from "@/lib/disbursements/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Disbursements · ${slug} — Licensed to Haul` };
}

export default async function DisbursementsPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const disbursements = await getDisbursementsForFactor(slug).catch(() => []);

  const totalCents = disbursements.reduce((s, d) => s + Number(d.amount_cents), 0);

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Disbursements</h1>
        <p className="mt-1 text-sm text-stone-500">
          {disbursements.length} observation{disbursements.length !== 1 ? "s" : ""} ·{" "}
          ${(totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {disbursements.length === 0 ? (
          <div className="border border-line bg-white p-8 text-center">
            <p className="text-sm text-stone-500">No disbursements recorded yet.</p>
          </div>
        ) : (
          <div className="border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Carrier DOT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {disbursements.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-stone-900">{d.carrier_dot}</td>
                    <td className="px-4 py-3 text-stone-900 font-medium">
                      ${(Number(d.amount_cents) / 100).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{d.disbursed_at}</td>
                    <td className="px-4 py-3 text-stone-600 font-mono text-xs">{d.reference_id ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        d.source === "webhook"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-stone-100 text-stone-600"
                      }`}>
                        {d.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

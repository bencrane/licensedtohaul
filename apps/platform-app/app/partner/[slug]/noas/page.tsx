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

type NoaRow = {
  id: string;
  carrier_dot: string;
  state: string;
  provider: string;
  created_at: Date;
  signed_at: Date | null;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `NOAs · ${slug} — Licensed to Haul` };
}

export default async function NoasPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const { rows } = await pool().query<NoaRow>(
    `SELECT id, carrier_dot, state, provider, created_at, signed_at
     FROM noa_envelopes
     WHERE factor_slug = $1
     ORDER BY created_at DESC`,
    [slug],
  ).catch(() => ({ rows: [] as NoaRow[] }));

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Notice of Assignments</h1>
        <p className="mt-1 text-sm text-stone-500">{rows.length} total NOA envelope{rows.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {rows.length === 0 ? (
          <div className="border border-line bg-white p-8 text-center">
            <p className="text-sm text-stone-500">No NOA envelopes yet.</p>
          </div>
        ) : (
          <div className="border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Carrier DOT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">State</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Initiated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Signed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-stone-900">{r.carrier_dot}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.state === "completed"
                          ? "bg-green-100 text-green-700"
                          : r.state === "sent"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-stone-100 text-stone-600"
                      }`}>
                        {r.state.charAt(0).toUpperCase() + r.state.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{r.provider}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.signed_at
                        ? new Date(r.signed_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
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

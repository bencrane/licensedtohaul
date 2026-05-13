import { notFound } from "next/navigation";
import Link from "next/link";
import { Pool } from "pg";

function getPool(): Pool {
  const connString = process.env.HQX_DB_URL_POOLED;
  if (!connString) throw new Error("HQX_DB_URL_POOLED not set");
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

type ForRow = {
  id: string;
  carrier_dot: string;
  factor_display_name: string;
  status: string;
  assigned_at: Date;
  revoked_at: Date | null;
  noa_envelope_id: string | null;
  noa_state: string | null;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Carriers · ${slug} — Licensed to Haul` };
}

export default async function CarriersPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const SCHEMA = process.env.LTH_SCHEMA ?? "lth";

  const { rows } = await pool().query<ForRow>(
    `SELECT f.id, f.carrier_dot, f.factor_display_name, f.status,
            f.assigned_at, f.revoked_at, f.noa_envelope_id,
            e.state AS noa_state
     FROM "${SCHEMA}".factor_of_record f
     LEFT JOIN "${SCHEMA}".noa_envelopes e ON e.id = f.noa_envelope_id
     WHERE f.factor_slug = $1
     ORDER BY f.assigned_at DESC`,
    [slug],
  ).catch(() => ({ rows: [] as ForRow[] }));

  const active = rows.filter((r) => r.status === "active");
  const revoked = rows.filter((r) => r.status === "revoked");

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Carriers</h1>
        <p className="mt-1 text-sm text-stone-500">
          {active.length} active · {revoked.length} revoked
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
        {/* Active */}
        <section>
          <h2 className="mb-4 font-display text-lg text-stone-900">Active ({active.length})</h2>
          {active.length === 0 ? (
            <p className="text-sm text-stone-500">No active carriers yet.</p>
          ) : (
            <div className="border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">DOT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Assigned</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">NOA Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {active.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-mono text-stone-900">{r.carrier_dot}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {new Date(r.assigned_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {r.noa_state ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.noa_state === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {r.noa_state.charAt(0).toUpperCase() + r.noa_state.slice(1)}
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/partner/${slug}/carriers/${r.carrier_dot}`}
                          className="text-xs font-medium text-orange-700 hover:text-orange-800"
                        >
                          Deal room →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Revoked */}
        {revoked.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-lg text-stone-500">Revoked ({revoked.length})</h2>
            <div className="border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">DOT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Assigned</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Revoked</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">NOA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {revoked.map((r) => (
                    <tr key={r.id} className="opacity-60">
                      <td className="px-4 py-3 font-mono text-stone-700">{r.carrier_dot}</td>
                      <td className="px-4 py-3 text-stone-500">
                        {new Date(r.assigned_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {r.revoked_at
                          ? new Date(r.revoked_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.noa_state ? (
                          <span className="text-xs text-stone-400">
                            {r.noa_state.charAt(0).toUpperCase() + r.noa_state.slice(1)}
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

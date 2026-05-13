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

type SeatRow = {
  user_id: string;
  email: string;
  role: string;
  joined_at: Date;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Team · ${slug} — Licensed to Haul` };
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  // Query seat occupants from organization_memberships if the table exists.
  // Falls back to empty if the table doesn't exist (live DB has no org tables in test schemas).
  let seats: SeatRow[] = [];
  try {
    const { rows } = await pool().query<SeatRow>(
      `SELECT m.user_id::text, u.email, m.role, m.created_at AS joined_at
       FROM organization_memberships m
       JOIN users u ON u.id = m.user_id
       JOIN organizations o ON o.id = m.organization_id AND o.slug = $1
       WHERE m.status = 'active'
       ORDER BY m.created_at ASC`,
      [slug],
    );
    seats = rows;
  } catch {
    // Table doesn't exist or no rows — show empty state
    seats = [];
  }

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Team</h1>
        <p className="mt-1 text-sm text-stone-500">{seats.length} seat{seats.length !== 1 ? "s" : ""} occupied</p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {seats.length === 0 ? (
          <div className="border border-line bg-white p-8 text-center">
            <p className="text-sm text-stone-500">No team members on record.</p>
          </div>
        ) : (
          <div className="border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {seats.map((s) => (
                  <tr key={s.user_id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-900">{s.email}</td>
                    <td className="px-4 py-3 text-stone-600">{s.role}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {new Date(s.joined_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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

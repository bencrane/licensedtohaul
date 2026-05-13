import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Find the first active org the user belongs to.
  const { rows } = await pool().query<{ slug: string | null; category: string; usdot: string | null }>(
    `
    SELECT o.slug, o.category, o.usdot::text AS usdot
      FROM users u
      JOIN organization_memberships m ON m.user_id = u.id AND m.status = 'active'
      JOIN organizations o ON o.id = m.organization_id
     WHERE u.auth_user_id = $1
     ORDER BY m.created_at ASC
     LIMIT 1
    `,
    [user.id],
  );

  const org = rows[0];
  if (!org) redirect("/access-expired");

  // Carrier-side org with a USDOT → carrier dashboard.
  if (org.usdot) redirect(`/dashboard/${org.usdot}`);

  // Partner-side org → partner portal overview.
  if (org.slug) redirect(`/partner/${org.slug}`);

  redirect("/access-expired");
}

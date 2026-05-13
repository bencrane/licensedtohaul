import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Pick the user's primary org. We only have surfaces for two categories
  // right now: carriers (have a usdot → /dashboard/[dot]) and factoring
  // partners (have a slug → /partner/[slug]). Prefer those over any legacy
  // membership (insurance, broker, etc.) the user may still carry.
  const { rows } = await pool().query<{ slug: string | null; category: string; usdot: string | null }>(
    `
    SELECT o.slug, o.category, o.usdot::text AS usdot
      FROM lth.users u
      JOIN lth.organization_memberships m ON m.user_id = u.id AND m.status = 'active'
      JOIN lth.organizations o ON o.id = m.organization_id
     WHERE u.auth_user_id = $1
     ORDER BY
       CASE
         WHEN o.category = 'carrier' AND o.usdot IS NOT NULL THEN 1
         WHEN o.category = 'factoring' AND o.slug IS NOT NULL THEN 2
         ELSE 3
       END,
       m.created_at ASC
     LIMIT 1
    `,
    [user.id],
  );

  const org = rows[0];
  if (!org) redirect("/access-expired");

  if (org.category === "carrier" && org.usdot) {
    redirect(`/dashboard/${org.usdot}`);
  }
  if (org.category === "factoring" && org.slug) {
    redirect(`/partner/${org.slug}`);
  }

  redirect("/access-expired");
}

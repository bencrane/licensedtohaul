import { redirect } from "next/navigation";
import CarrierSidebar from "@/components/dashboard/CarrierSidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getMockDashboard } from "@/lib/mock-dashboard";
import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";

type Props = {
  children: React.ReactNode;
  params: Promise<{ dot: string }>;
};

export default async function CarrierShell({ children, params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "") || dot;

  // Auth guard: must be signed in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/dashboard/${cleanDot}`);
  }

  // Membership guard: signed-in user must have an active membership
  // in a carrier org whose USDOT matches the route param.
  const usdot = parseInt(cleanDot, 10);
  if (!isNaN(usdot)) {
    const { rows } = await pool().query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM lth.organization_memberships m
         JOIN lth.users u ON u.id = m.user_id
         JOIN lth.organizations o ON o.id = m.organization_id
        WHERE u.auth_user_id = $1
          AND o.usdot = $2
          AND m.status = 'active'`,
      [user.id, usdot],
    );
    const count = parseInt(rows[0]?.count ?? "0", 10);
    if (count === 0) {
      redirect("/access-expired");
    }
  }

  const data = getMockDashboard(cleanDot);

  return (
    <DashboardShell
      sidebar={
        <CarrierSidebar
          dot={cleanDot}
          carrierName={data.carrier.legalName}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}

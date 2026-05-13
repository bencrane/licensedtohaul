import DashboardShell from "@/components/dashboard/DashboardShell";
import PartnerSidebar from "@/components/partner-dashboard/PartnerSidebar";
import { listTransfersForOrg } from "@/lib/transfers/actions";
import { pool } from "@/lib/db";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function getPartnerName(slug: string): Promise<string> {
  const { rows } = await pool().query<{ name: string }>(
    "SELECT name FROM lth.organizations WHERE slug = $1",
    [slug],
  );
  return rows[0]?.name ?? slug;
}

export default async function PartnerShell({ children, params }: Props) {
  const { slug } = await params;
  const [partnerName, deals] = await Promise.all([
    getPartnerName(slug),
    listTransfersForOrg(slug),
  ]);
  const awaitingAction = deals.filter((d) =>
    ["new", "contacted"].includes(d.disposition),
  ).length;

  return (
    <DashboardShell
      sidebar={
        <PartnerSidebar
          slug={slug}
          partnerName={partnerName}
          founding={false}
          awaitingAction={awaitingAction}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}

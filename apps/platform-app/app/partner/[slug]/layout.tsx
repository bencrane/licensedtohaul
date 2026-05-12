import DashboardShell from "@/components/dashboard/DashboardShell";
import PartnerSidebar from "@/components/partner-dashboard/PartnerSidebar";
import { getMockPartner } from "@/lib/mock-partner";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function PartnerShell({ children, params }: Props) {
  const { slug } = await params;
  const data = getMockPartner(slug);

  return (
    <DashboardShell
      sidebar={
        <PartnerSidebar
          slug={slug}
          partnerName={data.partner.shortName}
          founding={data.partner.founding}
          awaitingAction={data.awaitingAction}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}

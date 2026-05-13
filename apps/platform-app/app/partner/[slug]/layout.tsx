import DashboardShell from "@/components/dashboard/DashboardShell";
import PartnerSidebar from "@/components/partner-sidebar/PartnerSidebar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function PartnerShell({ children, params }: Props) {
  const { slug } = await params;
  // Derive display name from slug for sidebar — real name queried per-page
  const partnerName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <DashboardShell
      sidebar={
        <PartnerSidebar
          slug={slug}
          partnerName={partnerName}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}

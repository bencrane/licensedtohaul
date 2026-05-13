import CarrierSidebar from "@/components/dashboard/CarrierSidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDashboard } from "@/lib/dashboard-fetch";

type Props = {
  children: React.ReactNode;
  params: Promise<{ dot: string }>;
};

export default async function CarrierShell({ children, params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "") || dot;
  // getDashboard hits the live FMCSA substrate (DEX) when configured and falls
  // back to the static mock otherwise. Using it here means the sidebar carrier
  // name matches whatever the main page shows for the same DOT.
  const data = await getDashboard(cleanDot);

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

import CarrierSidebar from "@/components/dashboard/CarrierSidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getMockDashboard } from "@/lib/mock-dashboard";

type Props = {
  children: React.ReactNode;
  params: Promise<{ dot: string }>;
};

export default async function CarrierShell({ children, params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "") || dot;
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

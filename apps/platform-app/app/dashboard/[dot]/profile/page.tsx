import { notFound } from "next/navigation";
import {
  Copy,
  Printer,
  Download,
  MapPin,
  Phone,
  Mail,
  BadgeCheck,
  Truck,
  Users,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getDashboard } from "@/lib/dashboard-fetch";
import { MockText } from "@/components/MockText";

type Props = {
  params: Promise<{ dot: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  return {
    title: `Authority profile · USDOT ${cleanDot} — Licensed to Haul`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const data = await getDashboard(cleanDot);
  const { carrier, insurance, compliance } = data;


  return (
    <>
      <PageHeader
        eyebrow="Authority profile"
        title="Your authority, the way the federal data shows it."
        description="The clean export brokers, insurance agents, and factors ask for. Refreshed daily from the FMCSA registry."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 font-mono">
              USDOT {carrier.dotNumber}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono">
              {carrier.mcNumber}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono uppercase tracking-[0.12em] text-emerald-800">
                Active · refreshed {carrier.refreshedAt}
              </span>
            </span>
          </>
        }
        actions={
          <>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-8">
          {/* Identity card */}
          <Card title="Identity">
            <Row label="Legal name" value={carrier.legalName} />
            {carrier.dba && <Row label="DBA" value={carrier.dba} />}
            <Row label="USDOT number" value={carrier.dotNumber} mono copy />
            <Row label="MC docket" value={carrier.mcNumber} mono copy />
            <Row
              label="Legal address"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-stone-400" />
                  {carrier.legalAddress.street}, {carrier.legalAddress.city}, {carrier.legalAddress.state} {carrier.legalAddress.zip}
                </span>
              }
            />
            <Row
              label="Phone"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-stone-400" />
                  {carrier.phone}
                </span>
              }
            />
            <Row
              label="Email on file"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  {carrier.emailOnFile}
                </span>
              }
            />
          </Card>

          {/* Authority registration */}
          <Card title="Authority registration">
            <Row
              label="Authority types"
              value={carrier.authorityTypes.join(" · ")}
            />
            <Row label="Authority granted" value={carrier.authorityGranted} />
            <Row
              label="Authority age"
              value={`${carrier.authorityAge.years} yrs · ${carrier.authorityAge.months} mo`}
            />
            <Row label="Carrier operation" value={carrier.carrierOperation} />
            <Row
              label="Operating territory"
              value={`${carrier.operatingStates.length} states · ${carrier.operatingStates.join(", ")}`}
            />
            <Row
              label="Cargo carried"
              value={
                <MockText tooltip="Cargo categories not yet plumbed from substrate">
                  {carrier.cargoCarried.join(" · ")}
                </MockText>
              }
            />
            <Row
              label="Hazmat endorsement"
              value={carrier.hazmatEndorsed ? "Endorsed" : "Not endorsed"}
            />
            <Row
              label="Power units / drivers"
              value={
                <span className="inline-flex items-center gap-3 font-mono">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-stone-400" />
                    {carrier.powerUnits} PU
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-stone-400" />
                    {carrier.drivers} drivers
                  </span>
                </span>
              }
            />
          </Card>

          {/* Insurance L&I */}
          <Card title="Insurance L&amp;I">
            <Row label="BIPD limit" value={insurance.bipdLimit} mono />
            <Row label="Cargo limit" value={insurance.cargoLimit} mono />
            <Row label="Insurer" value={insurance.insurer} />
            <Row label="Policy number" value={insurance.policyNumber} mono copy />
            <Row label="Effective" value={insurance.effective} />
            <Row
              label="Expires"
              value={
                <span className="inline-flex items-center gap-2">
                  <span>{insurance.expires}</span>
                  <span className="inline-flex items-center gap-1.5 border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {insurance.daysToExpiration} days
                  </span>
                </span>
              }
            />
            <Row label="Agent" value={`${insurance.agent.name} · ${insurance.agent.phone}`} />

            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Coverage history
              </p>
              <ul className="mt-3 divide-y divide-line text-sm">
                {insurance.history.map((h, i) => (
                  <li key={i} className="grid grid-cols-12 gap-3 py-2">
                    <span className="col-span-3 font-mono text-xs uppercase tracking-[0.12em] text-stone-500">
                      {h.type}
                    </span>
                    <span className="col-span-5 text-stone-800">{h.insurer}</span>
                    <span className="col-span-4 text-right font-mono text-xs text-stone-600">
                      {h.effective} → {h.expired}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* BOC-3 */}
          <Card title="BOC-3 process agent">
            <Row
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                  <BadgeCheck className="h-3 w-3" />
                  On file
                </span>
              }
            />
            <Row label="Process agent" value={compliance.boc3.agent ?? "—"} />
            <Row label="Address" value={compliance.boc3.agentAddress ?? "—"} />
            <Row
              label="Filed date"
              value={
                <MockText tooltip="BOC-3 filed date not yet plumbed from substrate">
                  {compliance.boc3.filedDate ?? "—"}
                </MockText>
              }
            />
          </Card>
        </div>
      </section>
    </>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-6 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {title}
        </h2>
      </header>
      <div className="px-6 py-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
  copy,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copy?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-line py-3 last:border-b-0 lg:grid-cols-12 lg:items-center lg:gap-4">
      <p className="lg:col-span-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <div className="lg:col-span-8 flex items-center justify-between gap-3">
        <div className={mono ? "font-mono text-sm text-stone-900" : "text-sm text-stone-800"}>
          {value}
        </div>
        {copy && (
          <button
            type="button"
            className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

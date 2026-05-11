import { notFound } from "next/navigation";
import { Search, Download, MapPin, Truck } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockPartner } from "@/lib/mock-partner";
import type {
  AudienceFacet,
  AudienceCarrierRow,
} from "@/lib/mock-partner";

type Props = {
  params: Promise<{ slug: string }>;
};

const STATUS_STYLES: Record<
  AudienceCarrierRow["status"],
  { label: string; chip: string }
> = {
  in_pool: { label: "In pool", chip: "border-stone-300 bg-stone-100 text-stone-700" },
  transferred: { label: "Transferred", chip: "border-orange-200 bg-orange-50 text-orange-800" },
  out: { label: "Out of bounds", chip: "border-red-200 bg-red-50 text-red-700" },
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Audience browser · ${slug} — Licensed to Haul` };
}

export default async function AudiencePage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const data = getMockPartner(slug);
  const { spec, audiencePreview, audienceStats } = data;

  return (
    <>
      <PageHeader
        eyebrow="Audience browser"
        title="Every carrier in your locked audience."
        description="Filter by state, equipment, fleet size, authority age, hazmat status, recent CSA activity. Use this to see who's coming next — the carriers that fit your spec but haven't been routed to you yet."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {spec.audienceSizeNow.toLocaleString()} carriers in pool
            </span>
            <span className="inline-flex items-center gap-1.5">
              5 states · 5 equipment classes
            </span>
          </>
        }
        actions={
          <>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <Search className="h-4 w-4" />
              Search
            </button>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <Download className="h-4 w-4" />
              Export
            </button>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Stat distributions */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FacetCard title="By equipment" facets={audienceStats.byEquipment} />
            <FacetCard title="By state" facets={audienceStats.byState} />
            <FacetCard title="By fleet size" facets={audienceStats.byFleetSize} />
            <FacetCard title="By authority age" facets={audienceStats.byAuthorityAge} />
          </div>

          {/* Carrier list */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">
                Carriers in your audience
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                Showing {audiencePreview.length} of {spec.audienceSizeNow.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-stone-50/60 text-left">
                    <Th>Carrier</Th>
                    <Th>Domicile</Th>
                    <Th>Equipment</Th>
                    <Th align="right">PU</Th>
                    <Th align="right">Auth age</Th>
                    <Th>Hazmat</Th>
                    <Th align="right">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {audiencePreview.map((c) => {
                    const s = STATUS_STYLES[c.status];
                    return (
                      <tr key={c.dotNumber} className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-900">
                            {c.legalName}
                          </p>
                          <p className="font-mono text-[11px] text-stone-500">
                            USDOT {c.dotNumber}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-stone-700">
                            <MapPin className="h-3 w-3 text-stone-400" />
                            {c.domicile}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-stone-700">
                            <Truck className="h-3 w-3 text-stone-400" />
                            {c.equipmentClass}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-stone-800">
                          {c.powerUnits}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-stone-800">
                          {c.authorityYears}y
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-700">
                          {c.hazmat ? "Endorsed" : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}
                          >
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              Preview slice. Full audience query requires filter parameters — use Search.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function FacetCard({
  title,
  facets,
}: {
  title: string;
  facets: AudienceFacet[];
}) {
  const total = facets.reduce((sum, f) => sum + f.count, 0);
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {title}
        </h3>
      </header>
      <ul className="space-y-3 p-5">
        {facets.map((f) => {
          const pct = (f.count / total) * 100;
          return (
            <li key={f.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-stone-700">{f.label}</span>
                <span className="font-mono text-stone-900">
                  {f.count.toLocaleString()}{" "}
                  <span className="text-stone-500">({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden bg-stone-100">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

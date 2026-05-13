import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockPartner } from "@/lib/mock-partner";
import type { TeamRole } from "@/lib/mock-partner";

type Props = {
  params: Promise<{ slug: string }>;
};

const ROLE_STYLES: Record<TeamRole, { label: string; chip: string }> = {
  admin: { label: "Admin", chip: "border-orange-200 bg-orange-50 text-orange-800" },
  disposer: { label: "Disposer", chip: "border-stone-300 bg-stone-100 text-stone-700" },
  viewer: { label: "Viewer", chip: "border-stone-200 bg-stone-50 text-stone-600" },
};

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  admin: "Full access. Manages team, billing, factor profile.",
  disposer: "Works deals. Logs Won / Lost / Quoted / Contacted.",
  viewer: "Read-only across deals, pipeline, reports.",
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Team · ${slug} — Licensed to Haul` };
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const data = getMockPartner(slug);

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Who has access to your account."
        description="Seat-level roles control what each team member can do. Admin manages factor profile, billing, and team. Disposers work deals. Viewers see the dashboard but can't change anything."
        meta={
          <span className="inline-flex items-center gap-1.5">
            {data.team.length} active seats
          </span>
        }
        actions={
          <button className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
            <UserPlus className="h-4 w-4" />
            Invite member
          </button>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Roles legend */}
          <div className="grid gap-px border border-line bg-line md:grid-cols-3">
            {(Object.keys(ROLE_STYLES) as TeamRole[]).map((role) => (
              <div key={role} className="bg-surface p-5">
                <span
                  className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${ROLE_STYLES[role].chip}`}
                >
                  {ROLE_STYLES[role].label}
                </span>
                <p className="mt-3 text-sm text-stone-700">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            ))}
          </div>

          {/* Team list */}
          <div>
            <h2 className="font-display mb-4 text-2xl text-stone-900">Members</h2>
            <div className="overflow-x-auto border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-stone-50/60 text-left">
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th align="right">Dispositions logged</Th>
                    <Th align="right">Last active</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.team.map((m) => (
                    <tr key={m.id} className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center bg-orange-600 text-[11px] font-semibold uppercase text-white">
                            {m.name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <span className="font-medium text-stone-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-stone-700">
                        {m.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${ROLE_STYLES[m.role].chip}`}
                        >
                          {ROLE_STYLES[m.role].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-stone-800">
                        {m.dispositionsLogged}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-stone-600">
                        {m.lastActive}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
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

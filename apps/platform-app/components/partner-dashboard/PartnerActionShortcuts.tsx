import Link from "next/link";
import {
  Sliders,
  Download,
  UserPlus,
  FileBarChart,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

const actions = [
  { label: "Adjust spec", icon: <Sliders className="h-4 w-4" />, href: "#" },
  { label: "Export transfers (CSV)", icon: <Download className="h-4 w-4" />, href: "#" },
  { label: "Invite team member", icon: <UserPlus className="h-4 w-4" />, href: "#" },
  { label: "Monthly report (PDF)", icon: <FileBarChart className="h-4 w-4" />, href: "#" },
  { label: "Reup agreement", icon: <RefreshCw className="h-4 w-4" />, href: "#" },
];

export default function PartnerActionShortcuts() {
  return (
    <section className="border-t border-line bg-stone-100">
      <div className="mx-auto max-w-[1400px] px-6 py-5">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 whitespace-nowrap">
            Quick actions
          </span>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="group inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700"
              >
                {a.icon}
                {a.label}
                <ChevronRight className="h-3.5 w-3.5 text-stone-400 transition-colors group-hover:text-orange-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

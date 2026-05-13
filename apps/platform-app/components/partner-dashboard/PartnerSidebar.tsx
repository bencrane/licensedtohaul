"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  ListChecks,
  FileBarChart,
  UserCog,
  Wallet,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  ClipboardList,
} from "lucide-react";
import Wordmark from "@/components/site/Wordmark";
import { useSidebar } from "@/components/dashboard/DashboardShell";

type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

function buildNav(slug: string, awaitingAction: number): NavSection[] {
  const base = `/partner/${slug}`;
  return [
    {
      label: "Overview",
      items: [
        {
          label: "Summary",
          href: base,
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          label: "Inbox",
          href: `${base}/deals`,
          icon: <Inbox className="h-4 w-4" />,
          badge: awaitingAction > 0 ? String(awaitingAction) : undefined,
        },
        {
          label: "Pipeline",
          href: `${base}/pipeline`,
          icon: <ListChecks className="h-4 w-4" />,
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          label: "Profile",
          href: `${base}/profile`,
          icon: <ClipboardList className="h-4 w-4" />,
        },
        {
          label: "Reports",
          href: `${base}/reports`,
          icon: <FileBarChart className="h-4 w-4" />,
        },
        {
          label: "Team",
          href: `${base}/team`,
          icon: <UserCog className="h-4 w-4" />,
        },
        {
          label: "Billing & agreement",
          href: `${base}/billing`,
          icon: <Wallet className="h-4 w-4" />,
        },
      ],
    },
  ];
}

type Props = {
  slug: string;
  partnerName: string;
  founding: boolean;
  awaitingAction: number;
};

export default function PartnerSidebar({
  slug,
  partnerName,
  founding,
  awaitingAction,
}: Props) {
  const pathname = usePathname();
  const sections = buildNav(slug, awaitingAction);
  const shell = useSidebar();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-stone-50/80 backdrop-blur">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <Wordmark />
        {shell && (
          <button
            type="button"
            onClick={shell.toggle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-800"
            aria-label="Hide sidebar"
            title="Hide sidebar (⌘B)"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-6" : ""}>
            {section.label && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-orange-100 font-semibold text-orange-800"
                          : "text-stone-700 hover:bg-stone-200/60 hover:text-stone-900"
                      }`}
                    >
                      <span
                        className={`${active ? "text-orange-700" : "text-stone-400 group-hover:text-stone-600"}`}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        {founding && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-700">
            Founding · Cohort 01
          </p>
        )}
        <button
          type="button"
          className="group flex w-full items-center gap-2.5 rounded-sm border border-line bg-white px-3 py-2 text-sm text-stone-700 transition-colors hover:border-orange-300"
        >
          <span className="inline-flex h-7 w-7 flex-none items-center justify-center bg-orange-600 text-[10px] font-semibold uppercase text-white">
            {partnerName.charAt(0)}
          </span>
          <span className="flex-1 truncate text-left text-stone-800">
            {partnerName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 flex-none text-stone-400" />
        </button>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs text-stone-500 transition-colors hover:text-stone-800"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

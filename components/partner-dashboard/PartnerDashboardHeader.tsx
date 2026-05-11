import { ChevronDown, Inbox, Users, Settings } from "lucide-react";
import Wordmark from "@/components/site/Wordmark";

type Props = {
  partnerName: string;
  founding: boolean;
};

export default function PartnerDashboardHeader({ partnerName, founding }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Wordmark />
          <div className="hidden h-6 w-px bg-line md:block" />
          <nav className="hidden items-center gap-1 text-sm text-stone-700 md:flex">
            <button className="inline-flex items-center gap-1.5 border-b-2 border-orange-600 px-3 py-2 font-medium text-stone-900">
              <Inbox className="h-4 w-4" />
              Transfers
            </button>
            <button className="inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-stone-600 hover:text-stone-900">
              <Users className="h-4 w-4" />
              Team
            </button>
            <button className="inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-stone-600 hover:text-stone-900">
              <Settings className="h-4 w-4" />
              Account
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {founding && (
            <span className="hidden border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-800 md:inline-flex">
              Founding partner · Cohort 01
            </span>
          )}
          <button
            type="button"
            className="group inline-flex items-center gap-2 border border-line bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-orange-300"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center bg-orange-600 text-[10px] font-semibold uppercase text-white">
              {partnerName.charAt(0)}
            </span>
            <span className="hidden max-w-[180px] truncate text-stone-800 md:inline">
              {partnerName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
          </button>
        </div>
      </div>
    </header>
  );
}

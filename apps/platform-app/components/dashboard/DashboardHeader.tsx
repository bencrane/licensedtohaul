import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import Wordmark from "@/components/site/Wordmark";

type Props = {
  carrierName: string;
  dotNumber: string;
};

export default function DashboardHeader({ carrierName, dotNumber }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Wordmark />
          <div className="hidden h-6 w-px bg-line md:block" />
          <div className="hidden md:flex md:items-baseline md:gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Dashboard
            </span>
            <span className="text-stone-400">/</span>
            <span className="font-mono text-sm text-stone-700">
              USDOT {dotNumber}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="group inline-flex items-center gap-2 border border-line bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-orange-300"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center bg-orange-600 text-[10px] font-semibold uppercase text-white">
            {carrierName.charAt(0)}
          </span>
          <span className="hidden max-w-[180px] truncate text-stone-800 md:inline">
            {carrierName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
        </button>
      </div>
    </header>
  );
}

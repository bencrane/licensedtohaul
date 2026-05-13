"use client";

import { useSyncExternalStore } from "react";
import { subscribeToStore, getSnapshot } from "@/lib/quote-state-store";

export default function DataPartnerLog() {
  const submissions = useSyncExternalStore(subscribeToStore, getSnapshot);

  if (submissions.length === 0) {
    return (
      <div className="border border-line bg-surface px-5 py-8 text-center">
        <p className="text-sm text-stone-500">
          No data partners yet. When you submit a financing quote, the partner
          and fields shared will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line bg-stone-50/40 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Data partners access log
        </p>
      </div>
      <ul className="divide-y divide-line">
        {submissions.map((s) => (
          <li key={s.quoteId} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-stone-900">{s.factorName}</p>
                  <span className="inline-flex items-center border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-800">
                    {s.currentState}
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Submitted{" "}
                  {new Date(s.submittedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-stone-600">
                  <span className="font-medium">Fields shared:</span>{" "}
                  {s.fieldsShared.join(", ")}
                </p>
              </div>
              <button
                type="button"
                className="flex-none whitespace-nowrap border border-line bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-red-300 hover:text-red-700"
                onClick={() => {
                  // Revoke is a future feature — surface intent
                  alert(`Revoke access for ${s.factorName} — feature coming soon.`);
                }}
              >
                Revoke
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

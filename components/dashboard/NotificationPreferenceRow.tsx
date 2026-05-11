"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type {
  NotificationCadence,
  NotificationPreference,
} from "@/lib/mock-dashboard";

const CADENCE_OPTIONS: { value: NotificationCadence; label: string; description: string }[] = [
  { value: "immediate", label: "Immediate", description: "Email the moment something happens." },
  { value: "daily_digest", label: "Daily digest", description: "One email per day, 7am Central." },
  { value: "weekly_digest", label: "Weekly digest", description: "One email Monday morning." },
  { value: "off", label: "Off", description: "No emails. View in the dashboard only." },
];

export default function NotificationPreferenceRow({
  preference,
}: {
  preference: NotificationPreference;
}) {
  const [cadence, setCadence] = useState<NotificationCadence>(preference.cadence);

  return (
    <div className="grid gap-4 border-b border-line py-5 last:border-b-0 md:grid-cols-12 md:gap-6">
      <div className="md:col-span-4">
        <p className="font-display text-base text-stone-900">
          {preference.label}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          {preference.description}
        </p>
      </div>
      <div className="md:col-span-8">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CADENCE_OPTIONS.map((opt) => {
            const active = cadence === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCadence(opt.value)}
                className={`flex items-start gap-2 border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-orange-500 bg-orange-50/60"
                    : "border-line bg-white hover:border-line-strong"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center border ${
                    active
                      ? "border-orange-600 bg-orange-600 text-white"
                      : "border-line bg-white text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      active ? "text-orange-800" : "text-stone-800"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

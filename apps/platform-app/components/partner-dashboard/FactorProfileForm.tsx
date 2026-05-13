"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveFactorProfile } from "@/lib/factor-profiles/actions";
import type { FactorProfile, FactorCriteria, FactorTerms } from "@/lib/factor-profiles/types";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const EQUIPMENT_CLASSES = [
  "Dry van","Reefer","Flatbed","Tanker","Step deck",
  "Lowboy","Auto carrier","Bulk","Intermodal",
];

const DEFAULT_CRITERIA: FactorCriteria = {
  states: [],
  equipment_classes: [],
  fleet_size_min: 1,
  fleet_size_max: 100,
  authority_age_min_years: 0,
  hazmat_ok: true,
  fuel_card_addon: false,
};

const DEFAULT_TERMS: FactorTerms = {
  advance_rate_pct: 90,
  factoring_rate_pct: 2.5,
  recourse: "non-recourse",
  funding_speed: "Same-day ACH",
  monthly_minimum_usd: null,
  fuel_card_addon: false,
  fuel_card_description: null,
};

type Props = {
  slug: string;
  profile: FactorProfile | null;
};

export default function FactorProfileForm({ slug, profile }: Props) {
  const [criteria, setCriteria] = useState<FactorCriteria>(
    profile?.criteria ?? DEFAULT_CRITERIA,
  );
  const [terms, setTerms] = useState<FactorTerms>(
    profile?.terms ?? DEFAULT_TERMS,
  );
  const [displayCopy, setDisplayCopy] = useState<string>(
    profile?.display_copy ?? "",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleState(state: string) {
    setCriteria((prev) => ({
      ...prev,
      states: prev.states.includes(state)
        ? prev.states.filter((s) => s !== state)
        : [...prev.states, state],
    }));
  }

  function toggleEquipment(cls: string) {
    setCriteria((prev) => ({
      ...prev,
      equipment_classes: prev.equipment_classes.includes(cls)
        ? prev.equipment_classes.filter((c) => c !== cls)
        : [...prev.equipment_classes, cls],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveFactorProfile(slug, {
        criteria,
        exclusions: {},
        terms,
        display_copy: displayCopy || null,
      });
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error ?? "Save failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Display copy */}
      <div className="border border-line bg-surface p-6 space-y-4">
        <h2 className="font-display text-lg text-stone-900">Carrier-facing copy</h2>
        <p className="text-sm text-stone-600">
          This description appears on the carrier's financing page under your company name.
        </p>
        <textarea
          value={displayCopy}
          onChange={(e) => setDisplayCopy(e.target.value)}
          rows={4}
          placeholder="Describe your factoring product and what makes it a fit for this carrier…"
          className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
        />
      </div>

      {/* States served */}
      <div className="border border-line bg-surface p-6 space-y-4">
        <h2 className="font-display text-lg text-stone-900">States served</h2>
        <p className="text-sm text-stone-600">Carriers domiciled in selected states will see your profile.</p>
        <div className="flex flex-wrap gap-1.5">
          {US_STATES.map((state) => {
            const active = criteria.states.includes(state);
            return (
              <button
                key={state}
                type="button"
                onClick={() => toggleState(state)}
                className={`border px-2 py-1 text-xs font-mono font-semibold transition-colors ${
                  active
                    ? "border-orange-400 bg-orange-50 text-orange-800"
                    : "border-line bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment classes */}
      <div className="border border-line bg-surface p-6 space-y-4">
        <h2 className="font-display text-lg text-stone-900">Equipment classes</h2>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_CLASSES.map((cls) => {
            const active = criteria.equipment_classes.includes(cls);
            return (
              <button
                key={cls}
                type="button"
                onClick={() => toggleEquipment(cls)}
                className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-orange-400 bg-orange-50 text-orange-800"
                    : "border-line bg-white text-stone-600 hover:border-stone-400"
                }`}
              >
                {cls}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fleet size band */}
      <div className="border border-line bg-surface p-6 space-y-4">
        <h2 className="font-display text-lg text-stone-900">Fleet size band</h2>
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Min power units
            </label>
            <input
              type="number"
              min={1}
              value={criteria.fleet_size_min}
              onChange={(e) =>
                setCriteria((prev) => ({ ...prev, fleet_size_min: Number(e.target.value) }))
              }
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Max power units
            </label>
            <input
              type="number"
              min={1}
              value={criteria.fleet_size_max}
              onChange={(e) =>
                setCriteria((prev) => ({ ...prev, fleet_size_max: Number(e.target.value) }))
              }
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 focus:border-orange-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Authority age + hazmat */}
      <div className="border border-line bg-surface p-6 space-y-4">
        <h2 className="font-display text-lg text-stone-900">Authority &amp; compliance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-sm">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Min authority age (years)
            </label>
            <input
              type="number"
              min={0}
              value={criteria.authority_age_min_years}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  authority_age_min_years: Number(e.target.value),
                }))
              }
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 focus:border-orange-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="hazmat-ok"
            type="checkbox"
            checked={criteria.hazmat_ok}
            onChange={(e) =>
              setCriteria((prev) => ({ ...prev, hazmat_ok: e.target.checked }))
            }
            className="h-4 w-4 border-line accent-orange-600"
          />
          <label htmlFor="hazmat-ok" className="text-sm text-stone-700">
            Accept hazmat-endorsed carriers
          </label>
        </div>
      </div>

      {/* Terms */}
      <div className="border border-line bg-surface p-6 space-y-5">
        <h2 className="font-display text-lg text-stone-900">Factoring terms</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Advance rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={terms.advance_rate_pct}
              onChange={(e) =>
                setTerms((prev) => ({ ...prev, advance_rate_pct: Number(e.target.value) }))
              }
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Factoring rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={terms.factoring_rate_pct}
              onChange={(e) =>
                setTerms((prev) => ({ ...prev, factoring_rate_pct: Number(e.target.value) }))
              }
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Recourse
            </label>
            <select
              value={terms.recourse}
              onChange={(e) =>
                setTerms((prev) => ({
                  ...prev,
                  recourse: e.target.value as FactorTerms["recourse"],
                }))
              }
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 focus:border-orange-400 focus:outline-none"
            >
              <option value="non-recourse">Non-recourse</option>
              <option value="recourse">Recourse</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Funding speed
            </label>
            <input
              type="text"
              value={terms.funding_speed}
              onChange={(e) =>
                setTerms((prev) => ({ ...prev, funding_speed: e.target.value }))
              }
              placeholder="e.g. Same-day ACH"
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Monthly minimum ($, blank for none)
            </label>
            <input
              type="number"
              min={0}
              value={terms.monthly_minimum_usd ?? ""}
              onChange={(e) =>
                setTerms((prev) => ({
                  ...prev,
                  monthly_minimum_usd: e.target.value ? Number(e.target.value) : null,
                }))
              }
              placeholder="50000"
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Fuel card */}
        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <input
              id="fuel-card"
              type="checkbox"
              checked={terms.fuel_card_addon}
              onChange={(e) =>
                setTerms((prev) => ({ ...prev, fuel_card_addon: e.target.checked }))
              }
              className="h-4 w-4 border-line accent-orange-600"
            />
            <label htmlFor="fuel-card" className="text-sm text-stone-700">
              Include fuel card add-on
            </label>
          </div>
          {terms.fuel_card_addon && (
            <textarea
              value={terms.fuel_card_description ?? ""}
              onChange={(e) =>
                setTerms((prev) => ({
                  ...prev,
                  fuel_card_description: e.target.value || null,
                }))
              }
              rows={2}
              placeholder="Describe the fuel card benefit shown to carriers…"
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Saving…" : "Save profile"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Truck,
  MapPin,
  Calendar,
  AlertTriangle,
  Sparkles,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { composeAndLockSpec } from '@/lib/audience-specs/compose-action';

// ----- constants (mock-realistic) -----

const STATE_OPTIONS = [
  'TX', 'CA', 'FL', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI', 'NY',
  'AZ', 'WA', 'CO', 'IN', 'TN', 'WI', 'MO', 'VA', 'NV', 'MN',
];
const EQUIPMENT_OPTIONS = [
  'Dry van',
  'Reefer',
  'Flatbed',
  'Tanker',
  'Auto carrier',
  'Heavy haul',
];
const TOTAL_POOL = 8500; // total active US motor carriers in the system

type Criteria = {
  states: string[];
  equipment: string[];
  fleetMin: number;
  fleetMax: number;
  authorityYearsMin: number;
  hazmat: 'either' | 'required' | 'excluded';
};

const DEFAULT_CRITERIA: Criteria = {
  states: ['TX', 'CA', 'FL'],
  equipment: ['Dry van', 'Reefer'],
  fleetMin: 10,
  fleetMax: 50,
  authorityYearsMin: 3,
  hazmat: 'either',
};

// ----- live math -----

function calcAudienceSize(c: Criteria): number {
  let size = TOTAL_POOL;
  size *=
    c.states.length === 0
      ? 0.05
      : Math.min(1, c.states.length * 0.045);
  size *=
    c.equipment.length === 0
      ? 0.05
      : Math.min(1, c.equipment.length / EQUIPMENT_OPTIONS.length);
  const fleetRange = Math.max(0, c.fleetMax - c.fleetMin);
  size *= Math.min(1, fleetRange / 250);
  size *= Math.max(0.18, 1 - c.authorityYearsMin * 0.045);
  if (c.hazmat === 'required') size *= 0.18;
  if (c.hazmat === 'excluded') size *= 0.88;
  return Math.max(0, Math.round(size));
}

function calcDaysToFill(audience: number, monthlyTarget: number): number {
  if (audience <= 0 || monthlyTarget <= 0) return 0;
  const dailySupply = audience * 0.01; // ~1% of audience matches per day
  if (dailySupply <= 0) return Infinity;
  return Math.ceil(monthlyTarget / dailySupply);
}

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${Math.round(dollars).toLocaleString()}`;
  }
  return `$${dollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function suggestPricePerTransfer(audience: number): number {
  // Sparser audiences command higher prices; tighter is more exclusive.
  if (audience <= 200) return 350_00;
  if (audience <= 800) return 250_00;
  if (audience <= 2000) return 200_00;
  return 150_00;
}

// ----- component -----

type Props = { slug: string };

export default function AudienceComposer({ slug }: Props) {
  const router = useRouter();
  const [name, setName] = useState('Active OTR — TX/CA/FL · Dry van');
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA);
  const [monthlyTarget, setMonthlyTarget] = useState(50);
  const [priceDollars, setPriceDollars] = useState(200);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const audienceSize = useMemo(() => calcAudienceSize(criteria), [criteria]);
  const dailySupply = useMemo(() => audienceSize * 0.01, [audienceSize]);
  const daysToFill = useMemo(
    () => calcDaysToFill(audienceSize, monthlyTarget),
    [audienceSize, monthlyTarget],
  );
  const monthlyBudgetCents = monthlyTarget * priceDollars * 100;
  const suggested = useMemo(
    () => suggestPricePerTransfer(audienceSize) / 100,
    [audienceSize],
  );
  const suggestionDelta = priceDollars - suggested;

  const toggleState = (s: string) => {
    setCriteria((c) => ({
      ...c,
      states: c.states.includes(s)
        ? c.states.filter((x) => x !== s)
        : [...c.states, s],
    }));
  };
  const toggleEquipment = (e: string) => {
    setCriteria((c) => ({
      ...c,
      equipment: c.equipment.includes(e)
        ? c.equipment.filter((x) => x !== e)
        : [...c.equipment, e],
    }));
  };

  const handleLock = () => {
    setError(null);
    startTransition(async () => {
      const result = await composeAndLockSpec(slug, {
        name,
        criteria: {
          domicile_states: criteria.states,
          equipment_classes: criteria.equipment,
          fleet_size_min: criteria.fleetMin,
          fleet_size_max: criteria.fleetMax,
          authority_age_years_min: criteria.authorityYearsMin,
          hazmat: criteria.hazmat,
          safety_ratings: ['satisfactory'],
          notes: '',
        },
        monthly_transfer_target: monthlyTarget,
        price_per_transfer_cents: priceDollars * 100,
      });
      if (result.ok) {
        router.push(`/partner/${slug}/spec/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Left — configure */}
      <div className="space-y-6">
        <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Domicile states">
          <p className="mb-3 text-xs leading-relaxed text-stone-500">
            Where do you want carriers based? Click to toggle. More states = bigger pool.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STATE_OPTIONS.map((s) => {
              const on = criteria.states.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleState(s)}
                  className={`min-w-[44px] px-2.5 py-1.5 text-xs font-mono font-semibold uppercase tracking-[0.08em] transition-colors ${
                    on
                      ? 'bg-orange-600 text-white'
                      : 'border border-line bg-white text-stone-700 hover:border-orange-300'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={<Truck className="h-3.5 w-3.5" />} title="Equipment classes">
          <p className="mb-3 text-xs leading-relaxed text-stone-500">
            What carriers do you serve? Multi-select.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_OPTIONS.map((e) => {
              const on = criteria.equipment.includes(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEquipment(e)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? 'bg-orange-600 text-white'
                      : 'border border-line bg-white text-stone-700 hover:border-orange-300'
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Fleet size">
          <p className="mb-3 text-xs leading-relaxed text-stone-500">
            Power-unit range. Skews who you reach: small/mid/large operators.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Min PUs"
              value={criteria.fleetMin}
              onChange={(v) =>
                setCriteria((c) => ({
                  ...c,
                  fleetMin: Math.max(0, Math.min(v, c.fleetMax)),
                }))
              }
            />
            <NumberInput
              label="Max PUs"
              value={criteria.fleetMax}
              onChange={(v) =>
                setCriteria((c) => ({
                  ...c,
                  fleetMax: Math.max(c.fleetMin, v),
                }))
              }
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: 'Owner-op', min: 1, max: 5 },
              { label: 'Small (5-25)', min: 5, max: 25 },
              { label: 'Mid (25-100)', min: 25, max: 100 },
              { label: 'Large (100+)', min: 100, max: 500 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  setCriteria((c) => ({ ...c, fleetMin: p.min, fleetMax: p.max }))
                }
                className="border border-line bg-white px-2.5 py-1 text-[11px] text-stone-600 hover:border-orange-300 hover:text-orange-700"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={<Calendar className="h-3.5 w-3.5" />} title="Authority age">
          <p className="mb-3 text-xs leading-relaxed text-stone-500">
            Minimum years operating under their own authority. Higher = more
            stable carriers, smaller pool.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={criteria.authorityYearsMin}
              onChange={(e) =>
                setCriteria((c) => ({
                  ...c,
                  authorityYearsMin: Number(e.target.value),
                }))
              }
              className="h-1.5 flex-1 accent-orange-600"
            />
            <span className="font-mono w-16 text-right text-sm text-stone-800">
              {criteria.authorityYearsMin === 0 ? 'Any' : `${criteria.authorityYearsMin}y+`}
            </span>
          </div>
        </Section>

        <Section icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Hazmat endorsement">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { value: 'either', label: 'No preference' },
              { value: 'required', label: 'Required' },
              { value: 'excluded', label: 'Excluded' },
            ].map((opt) => {
              const on = criteria.hazmat === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setCriteria((c) => ({
                      ...c,
                      hazmat: opt.value as Criteria['hazmat'],
                    }))
                  }
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    on
                      ? 'bg-orange-600 text-white'
                      : 'border border-line bg-white text-stone-700 hover:border-orange-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Right — live results + pricing + lock */}
      <div className="lg:sticky lg:top-4 space-y-4 lg:self-start">
        {/* Audience size hero */}
        <div className="border border-line bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Your audience right now
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="font-display text-5xl text-stone-900">
              {audienceSize.toLocaleString()}
            </p>
            <p className="text-sm text-stone-500">carriers match</p>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden bg-stone-100">
            <div
              className="h-full bg-orange-500 transition-[width] duration-300"
              style={{
                width: `${Math.min(100, (audienceSize / TOTAL_POOL) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500">
            {((audienceSize / TOTAL_POOL) * 100).toFixed(1)}% of {TOTAL_POOL.toLocaleString()} active US carriers in the system
          </p>
        </div>

        {/* Volume + price */}
        <div className="border border-line bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Volume &amp; price
          </p>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <label className="text-sm text-stone-700">Transfers per month</label>
              <span className="font-display text-2xl text-stone-900">
                {monthlyTarget}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(Number(e.target.value))}
              className="mt-2 h-1.5 w-full accent-orange-600"
            />
            <div className="mt-1 flex justify-between text-[10px] font-mono uppercase tracking-[0.12em] text-stone-400">
              <span>5</span>
              <span>50</span>
              <span>100</span>
              <span>200</span>
              <span>300</span>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <label className="text-sm text-stone-700">
                Price per qualified transfer
              </label>
              <span className="font-display text-2xl text-stone-900">
                ${priceDollars}
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={priceDollars}
              onChange={(e) => setPriceDollars(Number(e.target.value))}
              className="mt-2 h-1.5 w-full accent-orange-600"
            />
            <p className="mt-1.5 text-[11px] text-stone-500">
              Suggested at this audience size:{' '}
              <button
                type="button"
                onClick={() => setPriceDollars(suggested)}
                className="font-mono text-orange-700 underline-offset-2 hover:underline"
              >
                ${suggested}
              </button>
              {Math.abs(suggestionDelta) >= 10 && (
                <span
                  className={`ml-2 font-mono ${
                    suggestionDelta > 0 ? 'text-emerald-700' : 'text-stone-500'
                  }`}
                >
                  ({suggestionDelta > 0 ? '+' : ''}${suggestionDelta})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Your deal — summary */}
        <div className="border border-orange-300 bg-orange-50/30 p-6">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 flex-none text-orange-600" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-800">
                Your deal
              </p>
              <p className="font-display mt-1 text-2xl leading-tight text-stone-900">
                {monthlyTarget} qualified transfers/month at ${priceDollars} each.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    Monthly spend
                  </p>
                  <p className="font-display mt-1 text-xl text-stone-900">
                    {formatUsd(monthlyBudgetCents)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    Time to fill
                  </p>
                  <p className="font-display mt-1 text-xl text-stone-900">
                    {daysToFill === Infinity || daysToFill > 365
                      ? '—'
                      : `${daysToFill}d`}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    Audience pool
                  </p>
                  <p className="font-display mt-1 text-xl text-stone-900">
                    {audienceSize.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    Daily supply
                  </p>
                  <p className="font-display mt-1 text-xl text-stone-900">
                    ~{dailySupply.toFixed(1)}/day
                  </p>
                </div>
              </div>

              {daysToFill > 30 && monthlyTarget > dailySupply * 30 && (
                <p className="mt-4 border-l-2 border-amber-400 bg-amber-50/60 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                  Your volume exceeds the audience&apos;s supply. Either widen
                  criteria, accept a longer fill window, or raise price to
                  bias matching toward your spec.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Name + lock */}
        <div className="border border-line bg-surface p-5">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
              Name this audience
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
            />
          </label>

          <button
            type="button"
            disabled={pending || !name.trim() || audienceSize === 0}
            onClick={handleLock}
            className="group mt-4 inline-flex w-full items-center justify-center gap-2 bg-orange-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {pending ? 'Locking in…' : 'Lock in this audience'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          {error && (
            <p
              className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
            Locks in the criteria, monthly target, and price as an active spec.
            Active specs feed your Transfer inbox. You can pause or adjust any
            spec later.
          </p>
        </div>
      </div>
    </div>
  );
}

// ----- field primitives -----

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-5 py-3">
        {icon && <span className="text-stone-400">{icon}</span>}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {title}
        </h2>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
      />
    </label>
  );
}

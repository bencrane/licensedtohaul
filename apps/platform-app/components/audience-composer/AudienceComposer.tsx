'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  MapPin,
  Calendar,
  AlertTriangle,
  Sparkles,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { composeAndLockSpec } from '@/lib/audience-specs/compose-action';

// ----- constants -----

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
const POOL_SIZE = 8500; // total active US motor carriers in the system
const FULFILLMENT_OPTIONS = [30, 45, 90] as const;

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

// ----- pricing & supply -----

function calcAudienceSize(c: Criteria): number {
  let size = POOL_SIZE;
  size *=
    c.states.length === 0 ? 0.05 : Math.min(1, c.states.length * 0.045);
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

/**
 * Per-transfer rate, indexed to audience scarcity. Smaller audiences are
 * harder to fill and command a premium. Smooth, monotonic, bounded.
 */
function pricePerTransferCents(audience: number, windowDays: number): number {
  const fraction = Math.min(1, audience / POOL_SIZE);
  const scarcity = 1 + 1.5 * (1 - fraction);
  // Shorter windows are "priority" — small premium for express delivery.
  const windowPremium = windowDays <= 30 ? 1.18 : windowDays <= 45 ? 1.0 : 0.92;
  return Math.round(150_00 * scarcity * windowPremium);
}

function calcDaysToFill(audience: number, transferCount: number): number {
  if (audience <= 0 || transferCount <= 0) return 0;
  const dailySupply = audience * 0.01;
  if (dailySupply <= 0) return Infinity;
  return Math.ceil(transferCount / dailySupply);
}

function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

// ----- component -----

type Props = { slug: string };

export default function AudienceComposer({ slug }: Props) {
  const router = useRouter();
  const [name, setName] = useState('Active OTR — TX/CA/FL · Dry van + Reefer');
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA);
  const [transferCount, setTransferCount] = useState(50);
  const [fulfillmentDays, setFulfillmentDays] = useState<number>(45);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const audienceSize = useMemo(() => calcAudienceSize(criteria), [criteria]);
  const priceCents = useMemo(
    () => pricePerTransferCents(audienceSize, fulfillmentDays),
    [audienceSize, fulfillmentDays],
  );
  const dailySupply = audienceSize * 0.01;
  const daysToFill = useMemo(
    () => calcDaysToFill(audienceSize, transferCount),
    [audienceSize, transferCount],
  );
  const totalCommitmentCents = transferCount * priceCents;
  const onTrack = daysToFill <= fulfillmentDays;
  const capacityInWindow = Math.floor(dailySupply * fulfillmentDays);

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
        transfer_count_target: transferCount,
        fulfillment_window_days: fulfillmentDays,
        price_per_transfer_cents: priceCents,
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
              {criteria.authorityYearsMin === 0
                ? 'Any'
                : `${criteria.authorityYearsMin}y+`}
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

      {/* Right — live results + order + lock */}
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
                width: `${Math.min(100, (audienceSize / POOL_SIZE) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500">
            {((audienceSize / POOL_SIZE) * 100).toFixed(1)}% of{' '}
            {POOL_SIZE.toLocaleString()} active US carriers in the system
          </p>
        </div>

        {/* Your rate (computed, not editable) */}
        <div className="border border-line bg-surface p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
                Your rate
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="font-display text-4xl text-stone-900">
                  {formatUsd(priceCents)}
                </p>
                <p className="text-sm text-stone-500">per qualified transfer</p>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1 border border-line bg-stone-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600"
              title="Set by audience scarcity"
            >
              <Info className="h-3 w-3" />
              Indexed
            </span>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
            Rate is set by audience scarcity, not by you. Tighter audiences
            cost more — they&apos;re harder to fill. Widen criteria to lower the
            rate.
          </p>
        </div>

        {/* Order: count + window */}
        <div className="border border-line bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Order
          </p>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <label className="text-sm text-stone-700">
                Transfers to deliver
              </label>
              <span className="font-display text-2xl text-stone-900">
                {transferCount}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={transferCount}
              onChange={(e) => setTransferCount(Number(e.target.value))}
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
            <p className="text-sm text-stone-700">Fulfillment window</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {FULFILLMENT_OPTIONS.map((d) => {
                const on = fulfillmentDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFulfillmentDays(d)}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      on
                        ? 'bg-orange-600 text-white'
                        : 'border border-line bg-white text-stone-700 hover:border-orange-300'
                    }`}
                  >
                    {d} days
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              Days we have to deliver all {transferCount} transfers. If we
              fall short at expiration, the unfilled portion refunds or rolls
              forward. Shorter window = small priority premium.
            </p>
          </div>
        </div>

        {/* Your deal — summary */}
        <div
          className={`border p-6 ${
            onTrack ? 'border-orange-300 bg-orange-50/30' : 'border-amber-300 bg-amber-50/50'
          }`}
        >
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 flex-none text-orange-600" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-800">
                Your deal
              </p>
              <p className="font-display mt-1 text-2xl leading-tight text-stone-900">
                {transferCount} qualified transfers at {formatUsd(priceCents)}{' '}
                each. Delivered in {fulfillmentDays} days or we refund.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    Total commitment
                  </p>
                  <p className="font-display mt-1 text-xl text-stone-900">
                    {formatUsd(totalCommitmentCents)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    Estimated delivery
                  </p>
                  <p className="font-display mt-1 text-xl text-stone-900">
                    {daysToFill === Infinity || daysToFill > 365
                      ? '—'
                      : `${daysToFill}d`}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    Window capacity
                  </p>
                  <p className="font-display mt-1 text-xl text-stone-900">
                    ~{capacityInWindow.toLocaleString()}
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

              {!onTrack && (
                <p className="mt-4 border-l-2 border-amber-500 bg-amber-100/60 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                  Your audience supplies roughly{' '}
                  <strong>{capacityInWindow.toLocaleString()}</strong>{' '}
                  qualified carriers in {fulfillmentDays} days, but you&apos;ve
                  ordered <strong>{transferCount}</strong>. Either widen
                  criteria, lower the count, or pick a longer window.
                </p>
              )}

              {onTrack && (
                <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                  ✓ On track to deliver within {fulfillmentDays} days
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
            {pending
              ? 'Locking in…'
              : `Lock in ${transferCount} transfers · ${formatUsd(totalCommitmentCents)}`}
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
            Locks in your criteria, transfer count, fulfillment window, and
            rate. Active spec starts feeding your Transfer inbox immediately.
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

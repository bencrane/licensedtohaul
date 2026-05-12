'use client';

import Link from 'next/link';
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
  Settings2,
} from 'lucide-react';
import { composeAndLockSpec } from '@/lib/audience-specs/compose-action';
import {
  EQUIPMENT_OPTIONS,
  FULFILLMENT_OPTIONS,
  POOL_SIZE,
  STATE_OPTIONS,
  type AudienceCriteria,
  calcAudienceSize,
  calcDaysToFill,
  formatUsd,
  pricePerTransferCents,
} from '@/lib/audience-pricing';
import type { PartnerDefaults } from '@/lib/partner-defaults/types';

type Props = {
  slug: string;
  defaults: PartnerDefaults;
};

function seedCriteriaFromDefaults(d: PartnerDefaults): AudienceCriteria {
  // Start with a sensible default, then strip anything excluded by partner defaults.
  const states = ['TX', 'CA', 'FL'].filter(
    (s) => !d.excluded_states.includes(s),
  );
  const equipment = ['Dry van', 'Reefer'].filter(
    (e) => !d.excluded_equipment.includes(e),
  );
  return {
    states,
    equipment,
    fleetMin: Math.max(10, d.fleet_size_min_floor ?? 0),
    fleetMax: 50,
    authorityYearsMin: Math.max(3, d.authority_years_min_floor ?? 0),
    hazmat: d.hazmat_default,
  };
}

export default function AudienceComposer({ slug, defaults }: Props) {
  const router = useRouter();
  const [name, setName] = useState('Active OTR — TX/CA/FL · Dry van + Reefer');
  const [criteria, setCriteria] = useState<AudienceCriteria>(() =>
    seedCriteriaFromDefaults(defaults),
  );
  const [transferCount, setTransferCount] = useState(50);
  const [fulfillmentDays, setFulfillmentDays] = useState<number>(
    defaults.preferred_fulfillment_days,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filter the option lists by excluded items from defaults.
  const availableStates = STATE_OPTIONS.filter(
    (s) => !defaults.excluded_states.includes(s),
  );
  const availableEquipment = EQUIPMENT_OPTIONS.filter(
    (e) => !defaults.excluded_equipment.includes(e),
  );

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

  const hasFloors =
    defaults.excluded_states.length > 0 ||
    defaults.excluded_equipment.length > 0 ||
    defaults.fleet_size_min_floor != null ||
    defaults.authority_years_min_floor != null;

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
    // Enforce floors from defaults at lock time.
    if (
      defaults.fleet_size_min_floor != null &&
      criteria.fleetMin < defaults.fleet_size_min_floor
    ) {
      setError(
        `Fleet floor in your defaults is ${defaults.fleet_size_min_floor} PUs.`,
      );
      return;
    }
    if (
      defaults.authority_years_min_floor != null &&
      criteria.authorityYearsMin < defaults.authority_years_min_floor
    ) {
      setError(
        `Authority age floor in your defaults is ${defaults.authority_years_min_floor} years.`,
      );
      return;
    }
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
    <div className="space-y-4">
      {hasFloors && (
        <div className="flex items-start gap-2 border border-line bg-stone-50/80 px-4 py-3 text-[12px] leading-relaxed text-stone-700">
          <Settings2 className="mt-0.5 h-3.5 w-3.5 flex-none text-stone-500" />
          <p>
            Your{' '}
            <Link
              href={`/partner/${slug}/defaults`}
              className="font-medium text-orange-700 underline-offset-2 hover:underline"
            >
              account defaults
            </Link>{' '}
            are applied:
            {defaults.excluded_states.length > 0 && (
              <> {defaults.excluded_states.length} states excluded;</>
            )}
            {defaults.excluded_equipment.length > 0 && (
              <> {defaults.excluded_equipment.length} equipment classes excluded;</>
            )}
            {defaults.fleet_size_min_floor != null && (
              <> fleet floor {defaults.fleet_size_min_floor} PUs;</>
            )}
            {defaults.authority_years_min_floor != null && (
              <> authority floor {defaults.authority_years_min_floor}y;</>
            )}{' '}
            edit anytime.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Left — configure */}
        <div className="space-y-6">
          <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Domicile states">
            <p className="mb-3 text-xs leading-relaxed text-stone-500">
              Where do you want carriers based? Click to toggle.
              {defaults.excluded_states.length > 0 && (
                <>
                  {' '}Hidden: {defaults.excluded_states.join(', ')} (from defaults).
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableStates.map((s) => {
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
              {defaults.excluded_equipment.length > 0 && (
                <>
                  {' '}Hidden: {defaults.excluded_equipment.join(', ')} (from defaults).
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableEquipment.map((e) => {
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
              Power-unit range.
              {defaults.fleet_size_min_floor != null && (
                <>
                  {' '}Floor: {defaults.fleet_size_min_floor} PUs (from defaults).
                </>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Min PUs"
                value={criteria.fleetMin}
                min={defaults.fleet_size_min_floor ?? 0}
                onChange={(v) =>
                  setCriteria((c) => ({
                    ...c,
                    fleetMin: Math.max(
                      defaults.fleet_size_min_floor ?? 0,
                      Math.min(v, c.fleetMax),
                    ),
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
              ].map((p) => {
                const blockedByFloor =
                  defaults.fleet_size_min_floor != null &&
                  p.min < defaults.fleet_size_min_floor;
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={blockedByFloor}
                    onClick={() =>
                      setCriteria((c) => ({
                        ...c,
                        fleetMin: p.min,
                        fleetMax: p.max,
                      }))
                    }
                    className={`border border-line bg-white px-2.5 py-1 text-[11px] text-stone-600 hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section icon={<Calendar className="h-3.5 w-3.5" />} title="Authority age">
            <p className="mb-3 text-xs leading-relaxed text-stone-500">
              Minimum years operating under their own authority.
              {defaults.authority_years_min_floor != null && (
                <>
                  {' '}Floor: {defaults.authority_years_min_floor}y (from defaults).
                </>
              )}
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={defaults.authority_years_min_floor ?? 0}
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
                        hazmat: opt.value as AudienceCriteria['hazmat'],
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
              {POOL_SIZE.toLocaleString()} active US carriers
            </p>
          </div>

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
              <span className="inline-flex items-center gap-1 border border-line bg-stone-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                <Info className="h-3 w-3" />
                Indexed
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
              Rate is set by audience scarcity, not by you. Tighter audiences
              cost more — they&apos;re harder to fill.
            </p>
          </div>

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
            </div>
          </div>

          <div
            className={`border p-6 ${
              onTrack
                ? 'border-orange-300 bg-orange-50/30'
                : 'border-amber-300 bg-amber-50/50'
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
                  <DealStat
                    label="Total commitment"
                    value={formatUsd(totalCommitmentCents)}
                  />
                  <DealStat
                    label="Estimated delivery"
                    value={
                      daysToFill === Infinity || daysToFill > 365
                        ? '—'
                        : `${daysToFill}d`
                    }
                  />
                  <DealStat
                    label="Window capacity"
                    value={`~${capacityInWindow.toLocaleString()}`}
                  />
                  <DealStat
                    label="Daily supply"
                    value={`~${dailySupply.toFixed(1)}/day`}
                  />
                </div>

                {!onTrack && (
                  <p className="mt-4 border-l-2 border-amber-500 bg-amber-100/60 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                    Your audience supplies roughly{' '}
                    <strong>{capacityInWindow.toLocaleString()}</strong>{' '}
                    qualified carriers in {fulfillmentDays} days, but you&apos;ve
                    ordered <strong>{transferCount}</strong>. Widen criteria,
                    lower the count, or pick a longer window.
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
          </div>
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
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
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
        min={min}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
      />
    </label>
  );
}

function DealStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="font-display mt-1 text-xl text-stone-900">{value}</p>
    </div>
  );
}

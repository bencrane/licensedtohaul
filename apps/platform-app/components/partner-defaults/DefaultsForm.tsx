'use client';

import { useActionState } from 'react';
import { Save } from 'lucide-react';
import { saveDefaults } from '@/lib/partner-defaults/actions';
import {
  initialDefaultsFormState,
  type DefaultsFormState,
  type PartnerDefaults,
} from '@/lib/partner-defaults/types';
import {
  EQUIPMENT_OPTIONS,
  STATE_OPTIONS,
} from '@/lib/audience-pricing';

type Props = {
  slug: string;
  initial: PartnerDefaults;
};

export default function DefaultsForm({ slug, initial }: Props) {
  const action = saveDefaults.bind(null, slug);
  const [state, formAction, pending] = useActionState<
    DefaultsFormState,
    FormData
  >(action, initialDefaultsFormState);

  return (
    <form action={formAction} className="space-y-6">
      <Section title="Who you'll never accept">
        <p className="mb-4 text-sm leading-relaxed text-stone-600">
          Hard exclusions. These get applied to every audience you compose —
          carriers that match anything here never enter your pool.
        </p>

        <FieldLabel>Excluded states</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STATE_OPTIONS.map((s) => (
            <label
              key={s}
              className="cursor-pointer"
            >
              <input
                type="checkbox"
                name="excluded_states"
                value={s}
                defaultChecked={initial.excluded_states.includes(s)}
                className="peer sr-only"
              />
              <span className="inline-flex min-w-[44px] justify-center px-2.5 py-1.5 text-xs font-mono font-semibold uppercase tracking-[0.08em] border border-line bg-white text-stone-700 hover:border-orange-300 peer-checked:border-red-300 peer-checked:bg-red-50 peer-checked:text-red-800">
                {s}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-stone-500">
          Click to mark as excluded. Red = excluded.
        </p>

        <FieldLabel className="mt-6">Excluded equipment</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EQUIPMENT_OPTIONS.map((e) => (
            <label key={e} className="cursor-pointer">
              <input
                type="checkbox"
                name="excluded_equipment"
                value={e}
                defaultChecked={initial.excluded_equipment.includes(e)}
                className="peer sr-only"
              />
              <span className="inline-flex px-3 py-1.5 text-xs font-medium border border-line bg-white text-stone-700 hover:border-orange-300 peer-checked:border-red-300 peer-checked:bg-red-50 peer-checked:text-red-800">
                {e}
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Floors — never go below these">
        <div className="grid gap-5 md:grid-cols-2">
          <NumberInput
            label="Fleet size floor (min PUs)"
            name="fleet_size_min_floor"
            defaultValue={initial.fleet_size_min_floor ?? ''}
            hint="Don't accept carriers below this fleet size. Blank = no floor."
          />
          <NumberInput
            label="Authority age floor (min years)"
            name="authority_years_min_floor"
            defaultValue={initial.authority_years_min_floor ?? ''}
            hint="Don't accept carriers younger than this. Blank = no floor."
          />
        </div>
      </Section>

      <Section title="Defaults">
        <FieldLabel>Hazmat preference</FieldLabel>
        <div className="mt-2 grid grid-cols-3 gap-1.5 md:max-w-md">
          {[
            { value: 'either', label: 'No preference' },
            { value: 'required', label: 'Require hazmat' },
            { value: 'excluded', label: 'Exclude hazmat' },
          ].map((opt) => (
            <label key={opt.value} className="cursor-pointer">
              <input
                type="radio"
                name="hazmat_default"
                value={opt.value}
                defaultChecked={initial.hazmat_default === opt.value}
                className="peer sr-only"
              />
              <span className="inline-flex w-full justify-center px-3 py-2 text-xs font-medium border border-line bg-white text-stone-700 hover:border-orange-300 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-800">
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        <FieldLabel className="mt-6">Preferred fulfillment window</FieldLabel>
        <div className="mt-2 grid grid-cols-3 gap-1.5 md:max-w-md">
          {[30, 45, 90].map((d) => (
            <label key={d} className="cursor-pointer">
              <input
                type="radio"
                name="preferred_fulfillment_days"
                value={d}
                defaultChecked={initial.preferred_fulfillment_days === d}
                className="peer sr-only"
              />
              <span className="inline-flex w-full justify-center px-3 py-2 text-sm font-semibold border border-line bg-white text-stone-700 hover:border-orange-300 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-800">
                {d} days
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Notes">
        <p className="mb-3 text-sm leading-relaxed text-stone-600">
          Anything your team should know about this account&apos;s preferences.
          Internal only.
        </p>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial.notes}
          placeholder="e.g., Reefer carriers only south of I-40. Avoid carriers with recent CSA basic violations on Unsafe Driving."
          className="w-full border border-line bg-background px-3 py-2 text-[15px] text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
        />
      </Section>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <div className="text-sm">
          {state.error && (
            <span className="border border-red-200 bg-red-50 px-2 py-1 text-red-800">
              {state.error}
            </span>
          )}
          {state.info && (
            <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
              {state.info}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-orange-600 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {pending ? 'Saving…' : 'Save defaults'}
        </button>
      </div>
    </form>
  );
}

// ----- field primitives -----

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-6 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {title}
        </h2>
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function FieldLabel({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={`font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500 ${className}`}
    >
      {children}
    </p>
  );
}

function NumberInput({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: number | string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={0}
        className="border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
      />
      {hint && <span className="text-[11px] text-stone-500">{hint}</span>}
    </label>
  );
}

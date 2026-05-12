'use client';

import { useActionState } from 'react';
import type {
  AudienceSpec,
  Criteria,
  Exclusions,
  SpecFormState,
} from '@/lib/audience-specs/types';
import { initialFormState } from '@/lib/audience-specs/types';

type Action = (state: SpecFormState, formData: FormData) => Promise<SpecFormState>;

type Props = {
  action: Action;
  initial?: AudienceSpec;
  submitLabel?: string;
};

const SAFETY_RATING_OPTIONS = [
  { value: 'satisfactory', label: 'Satisfactory' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'unsatisfactory', label: 'Unsatisfactory' },
  { value: 'none', label: 'No rating' },
] as const;

export default function SpecForm({ action, initial, submitLabel = 'Save spec' }: Props) {
  const [state, formAction, pending] = useActionState<SpecFormState, FormData>(
    action,
    initialFormState,
  );

  const c: Partial<Criteria> = initial?.criteria ?? {};
  const x: Partial<Exclusions> = initial?.exclusions ?? {};

  return (
    <form action={formAction} className="space-y-10">
      {/* Spec identity */}
      <section className="border border-line bg-surface">
        <header className="border-b border-line px-6 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Spec identity
          </h2>
        </header>
        <div className="space-y-4 px-6 py-5">
          <Field label="Spec name" name="name" defaultValue={initial?.name ?? ''} required />
          <SelectField
            label="Status"
            name="status"
            defaultValue={initial?.status ?? 'draft'}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
      </section>

      {/* Criteria */}
      <section className="border border-line bg-surface">
        <header className="border-b border-line px-6 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Criteria — carriers you want
          </h2>
        </header>
        <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
          <TextareaField
            label="Domicile states"
            name="domicile_states"
            hint="Comma- or newline-separated. e.g. TX, CA, FL"
            defaultValue={(c.domicile_states ?? []).join(', ')}
          />
          <TextareaField
            label="Equipment classes"
            name="equipment_classes"
            hint="Dry van, Reefer, Flatbed, Tanker, Auto carrier"
            defaultValue={(c.equipment_classes ?? []).join(', ')}
          />
          <NumberField
            label="Fleet size — min PUs"
            name="fleet_size_min"
            defaultValue={c.fleet_size_min ?? ''}
          />
          <NumberField
            label="Fleet size — max PUs"
            name="fleet_size_max"
            defaultValue={c.fleet_size_max ?? ''}
          />
          <NumberField
            label="Authority age — min years"
            name="authority_age_years_min"
            defaultValue={c.authority_age_years_min ?? ''}
          />
          <SelectField
            label="Hazmat"
            name="hazmat"
            defaultValue={c.hazmat ?? 'either'}
            options={[
              { value: 'either', label: 'Either (no preference)' },
              { value: 'required', label: 'Required — hazmat-endorsed only' },
              { value: 'excluded', label: 'Excluded — no hazmat carriers' },
            ]}
          />
          <CheckboxGroupField
            label="Acceptable safety ratings"
            name="safety_ratings"
            options={SAFETY_RATING_OPTIONS}
            defaultValues={c.safety_ratings ?? []}
            className="md:col-span-2"
          />
          <TextareaField
            label="Internal notes (criteria)"
            name="criteria_notes"
            defaultValue={c.notes ?? ''}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* Exclusions */}
      <section className="border border-line bg-surface">
        <header className="border-b border-line px-6 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Exclusions — carriers you don&apos;t want
          </h2>
        </header>
        <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
          <TextareaField
            label="Excluded USDOTs"
            name="excluded_usdots"
            hint="One per line or comma-separated."
            defaultValue={(x.excluded_usdots ?? []).join('\n')}
            rows={4}
          />
          <TextareaField
            label="Excluded states"
            name="excluded_states"
            hint="States to never match. e.g. NY, NJ"
            defaultValue={(x.excluded_states ?? []).join(', ')}
          />
          <NumberField
            label="Min insurance liability ($)"
            name="min_insurance_liability_usd"
            defaultValue={x.min_insurance_liability_usd ?? ''}
            hint="Whole USD. Carriers below this are excluded."
          />
          <CheckboxField
            label="Exclude out-of-service carriers"
            name="out_of_service_excluded"
            defaultChecked={x.out_of_service_excluded ?? true}
          />
          <TextareaField
            label="Internal notes (exclusions)"
            name="exclusions_notes"
            defaultValue={x.notes ?? ''}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* Budget + pricing */}
      <section className="border border-line bg-surface">
        <header className="border-b border-line px-6 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Budget &amp; pricing
          </h2>
        </header>
        <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
          <NumberField
            label="Budget cap ($)"
            name="budget_cap_dollars"
            defaultValue={
              initial?.budget_cap_cents != null ? initial.budget_cap_cents / 100 : ''
            }
            step="0.01"
            hint="Max spend this period. Leave blank for uncapped."
          />
          <NumberField
            label="Price per qualified transfer ($)"
            name="price_per_transfer_dollars"
            defaultValue={
              initial?.price_per_transfer_cents != null
                ? initial.price_per_transfer_cents / 100
                : ''
            }
            step="0.01"
            hint="What you pay per qualified carrier transfer."
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-between">
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
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ---------- field primitives ----------

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
        {children}
      </span>
      {hint && <span className="text-[11px] text-stone-500">{hint}</span>}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = 'text',
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
      />
    </label>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
  hint,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  hint?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        step={step}
        className="border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
      />
    </label>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  hint,
  rows = 2,
  className = '',
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        name={name}
        defaultValue={defaultValue}
        className="border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 border border-line accent-orange-600"
      />
      <span className="text-[14px] text-stone-800">{label}</span>
    </label>
  );
}

function CheckboxGroupField({
  label,
  name,
  options,
  defaultValues,
  className = '',
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValues: string[];
  className?: string;
}) {
  return (
    <fieldset className={`flex flex-col gap-1.5 ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={defaultValues.includes(o.value)}
              className="h-4 w-4 border border-line accent-orange-600"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { submitClaim, type ClaimState } from "@/lib/actions/claim";
import { Field, TextArea, TextInput } from "./Field";

const initial: ClaimState = { ok: false };

export default function ClaimForm({
  defaultDot,
  compact = false,
}: {
  defaultDot?: string;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState(submitClaim, initial);

  if (state.ok) {
    return (
      <div className="border border-orange-200 bg-orange-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-orange-600" />
        <h3 className="font-display mt-5 text-2xl text-stone-900">
          Authority claimed.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          {state.message}
        </p>
        {state.dotNumber && (
          <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-stone-500">
            USDOT {state.dotNumber}
          </p>
        )}
      </div>
    );
  }

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.ok && (
        <div className="border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          {state.message}
        </div>
      )}

      <Field name="dotNumber" label="USDOT Number" required error={err.dotNumber}>
        <TextInput
          name="dotNumber"
          inputMode="numeric"
          placeholder="e.g. 1234567"
          defaultValue={defaultDot}
          required
          invalid={!!err.dotNumber}
        />
      </Field>

      {!compact && (
        <Field name="company" label="Company / DBA" hint="Optional" error={err.company}>
          <TextInput
            name="company"
            placeholder="Your carrier name"
            invalid={!!err.company}
          />
        </Field>
      )}

      <div className={compact ? "space-y-5" : "grid gap-5 md:grid-cols-2"}>
        <Field name="name" label="Your Name" required error={err.name}>
          <TextInput
            name="name"
            placeholder="Full name"
            required
            invalid={!!err.name}
          />
        </Field>
        <Field name="email" label="Email" required error={err.email}>
          <TextInput
            name="email"
            type="email"
            placeholder="you@yourcompany.com"
            required
            invalid={!!err.email}
          />
        </Field>
      </div>

      {!compact && (
        <>
          <Field name="phone" label="Phone" hint="Optional" error={err.phone}>
            <TextInput
              name="phone"
              type="tel"
              placeholder="(555) 555-0100"
              invalid={!!err.phone}
            />
          </Field>

          <Field
            name="interests"
            label="What are you looking at right now?"
            hint="Optional — freight, insurance, financing, fuel cards, equipment, compliance. Pick none, one, or all."
            error={err.interests}
          >
            <TextArea
              name="interests"
              rows={3}
              placeholder="e.g. Insurance renewal in 60 days, looking at financing options."
              invalid={!!err.interests}
            />
          </Field>
        </>
      )}

      <div className="flex flex-col items-start gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-500">
          Dashboard link emailed within a few minutes.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 bg-orange-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Claiming
        </>
      ) : (
        <>
          Claim Authority
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

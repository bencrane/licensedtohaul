"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { submitContact, type ContactState } from "@/lib/actions/contact";
import { Field, TextArea, TextInput } from "./Field";

const initial: ContactState = { ok: false };

export default function ContactForm() {
  const [state, formAction] = useActionState(submitContact, initial);

  if (state.ok) {
    return (
      <div className="border border-orange-200 bg-orange-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-orange-600" />
        <h3 className="font-display mt-5 text-2xl text-stone-900">Sent.</h3>
        <p className="mt-3 text-sm text-stone-700">
          {state.message ?? "Got it. We'll be in touch."}
        </p>
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

      <div className="grid gap-5 md:grid-cols-2">
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

      <div className="grid gap-5 md:grid-cols-2">
        <Field name="company" label="Company" hint="Optional" error={err.company}>
          <TextInput
            name="company"
            placeholder="Your carrier name"
            invalid={!!err.company}
          />
        </Field>
        <Field name="dotNumber" label="USDOT Number" hint="Optional" error={err.dotNumber}>
          <TextInput
            name="dotNumber"
            inputMode="numeric"
            placeholder="e.g. 1234567"
            invalid={!!err.dotNumber}
          />
        </Field>
      </div>

      <Field name="message" label="Message" required error={err.message}>
        <TextArea
          name="message"
          rows={6}
          placeholder="What's on your mind?"
          invalid={!!err.message}
        />
      </Field>

      <div className="flex justify-end border-t border-line pt-5">
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
      className="inline-flex items-center justify-center gap-2 bg-orange-600 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending
        </>
      ) : (
        <>
          Send Message
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

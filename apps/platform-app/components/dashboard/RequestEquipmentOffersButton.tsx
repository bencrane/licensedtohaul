"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, ShieldCheck, CheckCircle2 } from "lucide-react";

type FinancingType = "purchase" | "lease-to-own" | "refinance";
type EquipmentKind = "tractor" | "trailer" | "both" | "other";

const FINANCING_OPTIONS: { value: FinancingType; label: string; helper: string }[] = [
  { value: "purchase", label: "Purchase", helper: "Term loan against new or used equipment" },
  { value: "lease-to-own", label: "Lease-to-own", helper: "Operating lease with end-of-term buyout" },
  { value: "refinance", label: "Refinance", helper: "Replace an existing note to lower APR or payment" },
];

const EQUIPMENT_OPTIONS: { value: EquipmentKind; label: string }[] = [
  { value: "tractor", label: "Tractor" },
  { value: "trailer", label: "Trailer" },
  { value: "both", label: "Tractor + trailer" },
  { value: "other", label: "Other" },
];

export default function RequestEquipmentOffersButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [financing, setFinancing] = useState<FinancingType>("purchase");
  const [equipment, setEquipment] = useState<EquipmentKind>("tractor");
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    // Reset after close animation would normally fire — none here, so reset on next tick
    setTimeout(() => {
      setSubmitted(false);
      setSubmitting(false);
      setFinancing("purchase");
      setEquipment("tractor");
    }, 150);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // No real backend on this demo path — simulate a brief network delay so the
    // submit state is visible to the user, then transition to the success view.
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
      >
        <Plus className="h-4 w-4" />
        Request offers for new equipment
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-equipment-title"
            className="w-full max-w-[640px] border border-line bg-surface"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-orange-600" />
                <h2
                  id="request-equipment-title"
                  className="font-display text-2xl text-stone-900"
                >
                  {submitted ? "Request sent" : "Request equipment offers"}
                </h2>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={close}
                className="inline-flex h-8 w-8 items-center justify-center border border-line bg-white text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              <div className="px-6 py-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                  <div className="space-y-2 text-sm leading-relaxed text-stone-700">
                    <p>
                      We&apos;ve sent your request to lenders matching your equipment
                      and financing type. Offers typically come back within{" "}
                      <span className="font-semibold text-stone-900">
                        1&ndash;3 business days
                      </span>{" "}
                      and will appear under <span className="font-semibold">Available offers</span>{" "}
                      on this page.
                    </p>
                    <p className="text-xs text-stone-500">
                      You&apos;ll get a notification when the first term sheet arrives.
                      All offers are soft-pull only at the qualification stage.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
                <fieldset className="space-y-2">
                  <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Financing type
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {FINANCING_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer flex-col gap-1 border p-3 text-sm transition-colors ${
                          financing === opt.value
                            ? "border-orange-400 bg-orange-50"
                            : "border-line bg-white hover:border-stone-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="financing"
                          value={opt.value}
                          checked={financing === opt.value}
                          onChange={() => setFinancing(opt.value)}
                          className="sr-only"
                        />
                        <span className="font-semibold text-stone-900">
                          {opt.label}
                        </span>
                        <span className="text-xs text-stone-500">
                          {opt.helper}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Equipment
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`cursor-pointer border px-3 py-2 text-sm transition-colors ${
                          equipment === opt.value
                            ? "border-orange-400 bg-orange-50 text-stone-900"
                            : "border-line bg-white text-stone-700 hover:border-stone-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="equipment"
                          value={opt.value}
                          checked={equipment === opt.value}
                          onChange={() => setEquipment(opt.value)}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Units
                    </span>
                    <input
                      type="number"
                      name="units"
                      min={1}
                      defaultValue={1}
                      required
                      className="border border-line bg-white px-3 py-2 text-sm text-stone-900 focus:border-orange-400 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Target amount (USD)
                    </span>
                    <input
                      type="number"
                      name="amount"
                      min={1000}
                      step={1000}
                      placeholder="125000"
                      required
                      className="border border-line bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Notes (optional)
                  </span>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Specific make/model, deal you're already considering, or anything else lenders should know."
                    className="resize-none border border-line bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
                  />
                </label>

                <p className="text-xs leading-relaxed text-stone-500">
                  Submitting shares your USDOT profile, fleet size, authority
                  history, and BASIC scores with matching lenders. All quotes
                  are soft-pull only at the qualification stage. Hard pull is
                  triggered only after you accept a term sheet.
                </p>

                <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={close}
                    className="border border-line bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
                  >
                    {submitting ? "Sending…" : "Send request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

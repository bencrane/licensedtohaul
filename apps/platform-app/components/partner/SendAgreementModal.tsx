"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { DocumentKind, FactorPartnerConfigRow } from "@/lib/factor-documents/types";
import Link from "next/link";

type Props = {
  factorSlug: string;
  carrierDot: string;
  carrierEmail: string;
  partnerConfig: FactorPartnerConfigRow | null;
  onClose: () => void;
  onSent?: () => void;
};

const KIND_OPTIONS: { kind: DocumentKind; label: string; configKey: keyof FactorPartnerConfigRow }[] = [
  { kind: "noa", label: "Notice of Assignment (NOA)", configKey: "documenso_noa_template_id" },
  { kind: "master_agreement", label: "Master Factoring Agreement", configKey: "documenso_master_agreement_template_id" },
  { kind: "addendum", label: "Addendum", configKey: "documenso_addendum_template_id" },
  { kind: "side_letter", label: "Side Letter", configKey: "documenso_side_letter_template_id" },
];

export default function SendAgreementModal({
  factorSlug,
  carrierDot,
  carrierEmail,
  partnerConfig,
  onClose,
  onSent,
}: Props) {
  const router = useRouter();
  const [selectedKind, setSelectedKind] = useState<DocumentKind>("noa");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isKindConfigured = (kind: DocumentKind): boolean => {
    const option = KIND_OPTIONS.find((o) => o.kind === kind);
    if (!option || !partnerConfig) return false;
    return !!(partnerConfig[option.configKey] as string | null);
  };

  const selectedConfigured = isKindConfigured(selectedKind);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigured) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/partner/${factorSlug}/documents/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierDot,
          carrierEmail,
          documentKind: selectedKind,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Failed (${res.status})`);
      }

      onSent?.();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md border border-line bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg text-stone-900">Send Agreement</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Document type
            </label>
            <div className="space-y-2">
              {KIND_OPTIONS.map((opt) => {
                const configured = isKindConfigured(opt.kind);
                return (
                  <label
                    key={opt.kind}
                    className={`flex cursor-pointer items-center gap-3 border px-4 py-3 ${
                      selectedKind === opt.kind
                        ? "border-orange-400 bg-orange-50"
                        : "border-line hover:border-stone-300"
                    } ${!configured ? "opacity-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="documentKind"
                      value={opt.kind}
                      checked={selectedKind === opt.kind}
                      onChange={() => setSelectedKind(opt.kind)}
                      disabled={!configured}
                      className="accent-orange-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">{opt.label}</p>
                      {!configured && (
                        <p className="text-xs text-stone-400">
                          Template not configured.{" "}
                          <Link
                            href={`/partner/${factorSlug}/settings/templates`}
                            className="text-orange-600 hover:underline"
                          >
                            Configure in Settings
                          </Link>
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a note for this document..."
              className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-line px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedConfigured}
              className="border border-orange-400 bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending..." : "Send document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

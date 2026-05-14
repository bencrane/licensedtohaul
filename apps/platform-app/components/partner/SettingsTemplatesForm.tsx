"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FactorPartnerConfigRow } from "@/lib/factor-documents/types";

type Props = {
  factorSlug: string;
  initialConfig: FactorPartnerConfigRow | null;
};

export default function SettingsTemplatesForm({ factorSlug, initialConfig }: Props) {
  const router = useRouter();
  const [noa, setNoa] = useState(initialConfig?.documenso_noa_template_id ?? "");
  const [masterAgreement, setMasterAgreement] = useState(
    initialConfig?.documenso_master_agreement_template_id ?? "",
  );
  const [addendum, setAddendum] = useState(initialConfig?.documenso_addendum_template_id ?? "");
  const [sideLetter, setSideLetter] = useState(
    initialConfig?.documenso_side_letter_template_id ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(`/api/partner/${factorSlug}/settings/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noa: noa.trim() || null,
          masterAgreement: masterAgreement.trim() || null,
          addendum: addendum.trim() || null,
          sideLetter: sideLetter.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Failed (${res.status})`);
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: "noa", label: "NOA Template ID", value: noa, onChange: setNoa },
    { id: "masterAgreement", label: "Master Factoring Agreement Template ID", value: masterAgreement, onChange: setMasterAgreement },
    { id: "addendum", label: "Addendum Template ID", value: addendum, onChange: setAddendum },
    { id: "sideLetter", label: "Side Letter Template ID", value: sideLetter, onChange: setSideLetter },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-stone-500">
        Enter the Documenso template IDs for each document type. Templates are created in your
        Documenso account. Leave blank to disable sending that document type.
      </p>

      {fields.map(({ id, label, value, onChange }) => (
        <div key={id}>
          <label
            htmlFor={id}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500"
          >
            {label}
          </label>
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 12345"
            className="w-full border border-line bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
          />
        </div>
      ))}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && <p className="text-xs text-emerald-600">Template IDs saved.</p>}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="border border-orange-400 bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save template IDs"}
        </button>
      </div>
    </form>
  );
}

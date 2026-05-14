"use client";

import { useState } from "react";
import { FileText, Clock, CheckCircle2, Plus } from "lucide-react";
import SendAgreementModal from "./SendAgreementModal";
import PartnerCountersignPanel from "./PartnerCountersignPanel";
import type { FactorDocumentRow, FactorPartnerConfigRow, DocumentState, DocumentKind } from "@/lib/factor-documents/types";

type Props = {
  factorSlug: string;
  carrierDot: string;
  carrierEmail: string;
  documents: FactorDocumentRow[];
  partnerConfig: FactorPartnerConfigRow | null;
};

const KIND_LABELS: Record<DocumentKind, string> = {
  noa: "Notice of Assignment",
  master_agreement: "Master Factoring Agreement",
  addendum: "Addendum",
  side_letter: "Side Letter",
  other: "Document",
};

function StateChip({ state }: { state: DocumentState }) {
  const variants: Record<DocumentState, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-stone-100 text-stone-600" },
    sent: { label: "Pending carrier", className: "bg-sky-100 text-sky-700" },
    opened: { label: "Opened", className: "bg-blue-100 text-blue-700" },
    signed_by_carrier: { label: "Awaiting countersign", className: "bg-amber-100 text-amber-700" },
    signed_by_factor: { label: "Signed by factor", className: "bg-violet-100 text-violet-700" },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
    voided: { label: "Voided", className: "bg-stone-100 text-stone-500" },
    expired: { label: "Expired", className: "bg-stone-100 text-stone-500" },
  };

  const v = variants[state] ?? { label: state, className: "bg-stone-100 text-stone-500" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${v.className}`}>
      {v.label}
    </span>
  );
}

export default function DocumentsPanel({
  factorSlug,
  carrierDot,
  carrierEmail,
  documents,
  partnerConfig,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showCountersign, setShowCountersign] = useState<string | null>(null);

  // Documents that need factor countersign
  const awaitingCountersign = documents.filter(
    (d) => d.state === "signed_by_carrier" && d.factor_signing_token,
  );

  const hasAnyTemplateConfigured =
    partnerConfig &&
    (partnerConfig.documenso_noa_template_id ||
      partnerConfig.documenso_master_agreement_template_id ||
      partnerConfig.documenso_addendum_template_id ||
      partnerConfig.documenso_side_letter_template_id);

  return (
    <div className="space-y-4">
      {/* Documents list */}
      <div className="border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line bg-stone-50/40 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Documents
          </p>
          <button
            onClick={() => setShowModal(true)}
            disabled={!hasAnyTemplateConfigured}
            title={!hasAnyTemplateConfigured ? "Configure template IDs in Settings first" : "Send agreement"}
            className="inline-flex items-center gap-1.5 border border-orange-400 bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Send agreement
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-stone-500">No documents sent yet.</p>
            {!hasAnyTemplateConfigured && (
              <p className="mt-1 text-xs text-stone-400">
                Configure template IDs in{" "}
                <a href={`/partner/${factorSlug}/settings/templates`} className="text-orange-600 hover:underline">
                  Settings
                </a>{" "}
                to enable sending agreements.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 flex-none text-stone-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {KIND_LABELS[doc.document_kind] ?? doc.document_kind}
                    </p>
                    <p className="text-xs text-stone-500">
                      Sent {new Date(doc.sent_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-none">
                  <StateChip state={doc.state} />

                  {doc.state === "completed" && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : ""}
                    </span>
                  )}

                  {doc.state === "signed_by_carrier" && doc.factor_signing_token && (
                    <button
                      onClick={() =>
                        setShowCountersign(showCountersign === doc.id ? null : doc.id)
                      }
                      className="inline-flex items-center gap-1.5 border border-orange-400 bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition-colors"
                    >
                      <Clock className="h-3 w-3" />
                      {showCountersign === doc.id ? "Close" : "Countersign"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Countersign panels */}
      {awaitingCountersign.map((doc) => (
        showCountersign === doc.id && (
          <PartnerCountersignPanel
            key={doc.id}
            document={doc}
            onCompleted={() => setShowCountersign(null)}
          />
        )
      ))}

      {/* Send agreement modal */}
      {showModal && (
        <SendAgreementModal
          factorSlug={factorSlug}
          carrierDot={carrierDot}
          carrierEmail={carrierEmail}
          partnerConfig={partnerConfig}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

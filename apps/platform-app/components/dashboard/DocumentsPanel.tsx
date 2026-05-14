"use client";

import { useState } from "react";
import { FileText, Clock, CheckCircle2, XCircle, FileSignature } from "lucide-react";
import DocumentSignPanel from "./DocumentSignPanel";
import type { FactorDocumentRow, DocumentState, DocumentKind } from "@/lib/factor-documents/types";

type Props = {
  documents: FactorDocumentRow[];
  carrierDot: string;
  factorSlug: string;
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
    sent: { label: "Pending signature", className: "bg-sky-100 text-sky-700" },
    opened: { label: "Opened", className: "bg-blue-100 text-blue-700" },
    signed_by_carrier: { label: "Signed — awaiting factor", className: "bg-amber-100 text-amber-700" },
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

function DocRow({ doc }: { doc: FactorDocumentRow }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = doc.state === "sent" || doc.state === "opened";
  const isCompleted = doc.state === "completed";
  const isAwaitingFactor = doc.state === "signed_by_carrier";

  return (
    <div className="border-b border-line last:border-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
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

          {isPending && doc.carrier_signing_token && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 border border-orange-400 bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              <FileSignature className="h-3 w-3" />
              {expanded ? "Close" : "Review & sign"}
            </button>
          )}

          {isCompleted && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Signed {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : ""}
            </span>
          )}

          {isAwaitingFactor && (
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Awaiting factor signature
            </span>
          )}

          {(doc.state === "rejected" || doc.state === "voided" || doc.state === "expired") && (
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <XCircle className="h-3.5 w-3.5" />
              {doc.state.charAt(0).toUpperCase() + doc.state.slice(1)}
            </span>
          )}
        </div>
      </div>

      {expanded && isPending && doc.carrier_signing_token && (
        <div className="border-t border-line bg-stone-50 px-5 py-4">
          <DocumentSignPanel
            documentId={doc.id}
            signingToken={doc.carrier_signing_token}
            onCompleted={() => setExpanded(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function DocumentsPanel({ documents, carrierDot: _carrierDot, factorSlug: _factorSlug }: Props) {
  if (documents.length === 0) {
    return (
      <div className="border border-line bg-white px-5 py-8 text-center">
        <p className="text-sm text-stone-500">No documents sent yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-white divide-y divide-line">
      <div className="bg-stone-50/40 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Documents
        </p>
      </div>
      {documents.map((doc) => (
        <DocRow key={doc.id} doc={doc} />
      ))}
    </div>
  );
}

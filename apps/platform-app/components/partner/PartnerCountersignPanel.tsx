"use client";

import dynamic from "next/dynamic";
import { ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FactorDocumentRow } from "@/lib/factor-documents/types";

// Client-only: @documenso/embed-react must NOT be imported in SSR context
const EmbedSignDocument = dynamic(
  () => import("@documenso/embed-react").then((m) => m.EmbedSignDocument),
  { ssr: false },
);

type Props = {
  document: FactorDocumentRow;
  onCompleted?: () => void;
};

export default function PartnerCountersignPanel({ document: doc, onCompleted }: Props) {
  const router = useRouter();
  const [embedError, setEmbedError] = useState(false);
  const [completed, setCompleted] = useState(false);

  const signingToken = doc.factor_signing_token;

  const handleCompleted = useCallback(() => {
    setCompleted(true);
    onCompleted?.();
    router.refresh();
  }, [onCompleted, router]);

  if (!signingToken) {
    return (
      <div className="border border-line bg-stone-50 px-6 py-8 text-center">
        <p className="text-sm text-stone-500">Factor signing link not available for this document.</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
        <p className="text-sm font-semibold text-emerald-800">Countersigned successfully.</p>
        <p className="mt-1 text-xs text-emerald-600">
          The NOA is now complete. The factor of record relationship will be created automatically.
        </p>
      </div>
    );
  }

  const documensoAppUrl =
    process.env.NEXT_PUBLIC_DOCUMENSO_APP_URL ?? "https://app.documenso.com";
  const fallbackUrl = `${documensoAppUrl}/sign/${signingToken}`;

  if (embedError) {
    return (
      <div className="flex flex-col items-center gap-3 border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <p className="text-sm text-stone-700">Unable to load the signing document inline.</p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-orange-400 bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Open in new tab
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border border-sky-200 bg-sky-50 px-5 py-3">
        <p className="text-sm font-medium text-sky-900">
          Carrier has signed — countersign to complete the NOA
        </p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-orange-700"
        >
          Open in new tab
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <EmbedSignDocument
        token={signingToken}
        onDocumentCompleted={handleCompleted}
        onDocumentError={() => setEmbedError(true)}
      />
    </div>
  );
}

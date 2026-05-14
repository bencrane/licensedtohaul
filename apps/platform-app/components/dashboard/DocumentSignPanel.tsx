"use client";

import dynamic from "next/dynamic";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// Client-only: @documenso/embed-react must NOT be imported in SSR context
const EmbedSignDocument = dynamic(
  () => import("@documenso/embed-react").then((m) => m.EmbedSignDocument),
  { ssr: false },
);

type Props = {
  documentId: string;
  signingToken: string;
  onCompleted?: () => void;
};

const DOCUMENSO_APP_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_DOCUMENSO_APP_URL ?? "https://app.documenso.com")
    : "https://app.documenso.com";

export default function DocumentSignPanel({ documentId: _documentId, signingToken, onCompleted }: Props) {
  const router = useRouter();
  const [embedError, setEmbedError] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleCompleted = useCallback(() => {
    setCompleted(true);
    onCompleted?.();
    router.refresh();
  }, [onCompleted, router]);

  if (!signingToken) {
    return (
      <div className="border border-line bg-stone-50 px-6 py-8 text-center">
        <p className="text-sm text-stone-500">Signing link not available.</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-emerald-800">Document signed successfully.</p>
        <p className="mt-1 text-xs text-emerald-600">
          The page will refresh automatically to reflect the updated status.
        </p>
      </div>
    );
  }

  if (embedError) {
    const fallbackUrl = `${DOCUMENSO_APP_URL}/sign/${signingToken}`;
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

  const fallbackUrl = `${DOCUMENSO_APP_URL}/sign/${signingToken}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500">Sign the document below. Your signature is legally binding.</p>
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

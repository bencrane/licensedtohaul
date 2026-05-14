"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";

type Props = {
  signUrl: string;
  onSigned?: () => void;
};

export default function NoaSignPanel({ signUrl, onSigned }: Props) {
  const [iframeError, setIframeError] = useState(false);
  const [signed, setSigned] = useState(false);

  // Listen for Documenso postMessage events for signing completion
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      // Documenso emits a postMessage when the document is signed
      // Shape: { type: 'documenso:document:signed' } or similar
      if (
        e.data &&
        typeof e.data === "object" &&
        (e.data.type === "documenso:document:signed" ||
          e.data.type === "documenso:signing:complete" ||
          e.data.event === "signed")
      ) {
        setSigned(true);
        onSigned?.();
      }
    },
    [onSigned],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (signed) {
    return (
      <div className="flex flex-col items-center gap-3 border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <p className="text-sm font-semibold text-emerald-800">
          NOA signed successfully
        </p>
        <p className="text-xs text-emerald-600">
          Your factor of record will be created shortly. Refresh the page to see the updated status.
        </p>
      </div>
    );
  }

  if (!signUrl) {
    return (
      <div className="border border-line bg-stone-50 px-6 py-8 text-center">
        <p className="text-sm text-stone-500">Sign URL not available.</p>
      </div>
    );
  }

  if (iframeError) {
    return (
      <div className="flex flex-col items-center gap-3 border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <p className="text-sm text-stone-700">
          Unable to load the signing document inline.
        </p>
        <a
          href={signUrl}
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500">
          Sign the NOA below. Your signature is legally binding.
        </p>
        <a
          href={signUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-orange-700"
        >
          Open in new tab
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <iframe
        src={signUrl}
        title="Sign NOA"
        className="h-[600px] w-full border border-line bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
        onError={() => setIframeError(true)}
      />
    </div>
  );
}

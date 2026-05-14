"use client";

import { Clock, CheckCircle2, FileSignature, Layers, Activity, Banknote } from "lucide-react";
import StagePipeline from "@/components/dashboard/StagePipeline";
import NoaSignPanel from "@/components/dashboard/NoaSignPanel";
import DisbursementTimeline from "@/components/dashboard/DisbursementTimeline";
import MessageList from "@/components/deal-room/MessageList";
import ComposeForm from "@/components/deal-room/ComposeForm";
import type { QuoteSubmission } from "@/lib/quote-submissions/types";
import type { DisbursementRow } from "@/lib/disbursements/types";
import type { DealRoomMessage } from "@/lib/deal-room/types";
import type { NoaEnvelopeRow } from "@/lib/factor-of-record/types";

type Props = {
  submission: QuoteSubmission;
  factorName: string;
  noaEnvelope?: NoaEnvelopeRow | null;
  disbursements?: DisbursementRow[];
  messages?: DealRoomMessage[];
};

function ActionPanel({
  submission,
  noaEnvelope,
}: {
  submission: QuoteSubmission;
  noaEnvelope?: NoaEnvelopeRow | null;
}) {
  const stage = submission.stage;

  if (stage === "submitted" || stage === "underwriting") {
    return (
      <div className="flex items-start gap-3 border border-line bg-stone-50 px-5 py-4">
        <Clock className="mt-0.5 h-4 w-4 flex-none text-stone-400" />
        <div>
          <p className="text-sm font-medium text-stone-900">Waiting on your factor</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {stage === "submitted"
              ? "Your submission is being reviewed. The factor will update your status within 1–2 business days."
              : "Underwriting is in progress. You'll hear back within 3–5 business days."}
          </p>
        </div>
      </div>
    );
  }

  if (stage === "approved") {
    return (
      <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-5 py-4">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Approved — awaiting NOA</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Congratulations! Your factor will send you a Notice of Assignment to sign in your deal
            room. It will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "noa_sent") {
    // Get sign URL from noa_envelopes row — store persists assembled URL in provider_envelope_id
    // Documenso stores the assembled sign URL separately via signUrls['carrier']
    // For now, we look at the envelope row's external_id to reconstruct if needed.
    // The sign URL is stored on the envelope row via the factor-of-record action.
    const signUrl = noaEnvelope
      ? `${process.env.NEXT_PUBLIC_DOCUMENSO_API_URL ?? ""}/sign/${noaEnvelope.provider_envelope_id ?? noaEnvelope.external_id}`
      : "";

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 border border-sky-200 bg-sky-50 px-5 py-4">
          <FileSignature className="mt-0.5 h-4 w-4 flex-none text-sky-600" />
          <div>
            <p className="text-sm font-medium text-sky-900">Your NOA is ready to sign</p>
            <p className="mt-0.5 text-xs text-sky-700">
              Review and sign the Notice of Assignment below. This document authorizes your factor to
              collect payments on your behalf.
            </p>
          </div>
        </div>
        {noaEnvelope && (
          <NoaSignPanel signUrl={signUrl} />
        )}
      </div>
    );
  }

  if (stage === "noa_signed") {
    return (
      <div className="flex items-start gap-3 border border-violet-200 bg-violet-50 px-5 py-4">
        <Layers className="mt-0.5 h-4 w-4 flex-none text-violet-600" />
        <div>
          <p className="text-sm font-medium text-violet-900">Onboarding in progress</p>
          <p className="mt-0.5 text-xs text-violet-700">
            Your NOA has been signed. Your factor is completing onboarding on their end. Your deal
            room will update once you&apos;re active.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "active" || stage === "disbursing") {
    return (
      <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-5 py-4">
        <Activity className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Active funding relationship</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Your factor is your active funding partner. Disbursements are tracked in the timeline
            below.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "declined") {
    return (
      <div className="flex items-start gap-3 border border-stone-300 bg-stone-100 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Submission declined</p>
          <p className="mt-0.5 text-xs text-stone-500">
            This factor passed on your profile. Other quotes may still be available.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "offboarded") {
    return (
      <div className="flex items-start gap-3 border border-stone-300 bg-stone-100 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Relationship ended</p>
          <p className="mt-0.5 text-xs text-stone-500">
            This factor relationship has been offboarded.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function DealRoomCarrierView({
  submission,
  factorName,
  noaEnvelope,
  disbursements = [],
  messages = [],
}: Props) {
  const showDisbursements =
    submission.stage === "active" || submission.stage === "disbursing" || disbursements.length > 0;

  return (
    <div className="space-y-6">
      {/* Stage pipeline */}
      <div className="border border-line bg-white px-5 py-4">
        <StagePipeline currentStage={submission.stage} />
      </div>

      {/* Quote summary card */}
      <div className="border border-line bg-white">
        <div className="border-b border-line bg-stone-50/40 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Quote terms
          </p>
        </div>
        <dl className="divide-y divide-line">
          <Row label="Factor" value={factorName} />
          <Row label="Rate" value={submission.rate} />
          <Row label="Recourse" value={submission.recourseLabel} />
          <Row label="Funding speed" value={submission.fundingSpeed} />
          {submission.monthlyMinimum && (
            <Row label="Monthly minimum" value={submission.monthlyMinimum} />
          )}
          {submission.notes && (
            <Row label="Notes" value={submission.notes} />
          )}
        </dl>
      </div>

      {/* Action panel */}
      <div>
        <ActionPanel submission={submission} noaEnvelope={noaEnvelope} />
      </div>

      {/* Disbursement timeline — only when active or has data */}
      {showDisbursements && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-stone-400" />
            <h2 className="font-display text-lg text-stone-900">Disbursements</h2>
          </div>
          <DisbursementTimeline disbursements={disbursements} />
        </div>
      )}

      {/* Message thread — always visible */}
      <div className="border border-line bg-white">
        <div className="border-b border-line bg-stone-50/40 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Messages
          </p>
        </div>
        <div className="px-5 py-4">
          <MessageList messages={messages} viewerSide="carrier" />
          <div className="mt-4">
            <ComposeForm
              carrierDot={submission.carrierDot}
              factorSlug={submission.factorSlug}
              senderSide="carrier"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-right text-xs font-medium text-stone-900">{value}</dd>
    </div>
  );
}

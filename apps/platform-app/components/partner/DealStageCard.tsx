"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteSubmission } from "@/lib/quote-submissions/types";

type Props = {
  submission: QuoteSubmission;
};

const STAGE_LABELS: Record<string, string> = {
  submitted: "Submitted",
  underwriting: "Underwriting",
  approved: "Approved",
  declined: "Declined",
  noa_sent: "NOA Sent",
  noa_signed: "NOA Signed",
  active: "Active",
  offboarded: "Offboarded",
};

export default function DealStageCard({ submission }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transition(toStage: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/submissions/${submission.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStage }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Transition failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setPending(false);
    }
  }

  async function sendNoa() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/submissions/${submission.id}/send-noa`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Send NOA failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send NOA failed");
    } finally {
      setPending(false);
    }
  }

  const stage = submission.stage;
  const stageBg: Record<string, string> = {
    submitted: "border-sky-200 bg-sky-50",
    underwriting: "border-amber-200 bg-amber-50",
    approved: "border-emerald-200 bg-emerald-50",
    declined: "border-stone-300 bg-stone-100",
    noa_sent: "border-violet-200 bg-violet-50",
    noa_signed: "border-violet-200 bg-violet-50",
    active: "border-emerald-300 bg-emerald-50",
    offboarded: "border-stone-300 bg-stone-100",
  };

  return (
    <div className="border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line bg-stone-50/40 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Deal stage
        </p>
        <span
          className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${stageBg[stage] ?? "border-stone-200 bg-stone-50"}`}
        >
          {STAGE_LABELS[stage] ?? stage}
        </span>
      </div>

      <div className="px-5 py-4">
        {error && (
          <p className="mb-3 text-xs text-red-600">{error}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {stage === "submitted" && (
            <>
              <ActionButton
                label="Start underwriting"
                onClick={() => transition("underwriting")}
                disabled={pending}
                variant="primary"
              />
              <ActionButton
                label="Decline"
                onClick={() => transition("declined")}
                disabled={pending}
                variant="danger"
              />
            </>
          )}

          {stage === "underwriting" && (
            <>
              <ActionButton
                label="Approve"
                onClick={() => transition("approved")}
                disabled={pending}
                variant="primary"
              />
              <ActionButton
                label="Decline"
                onClick={() => transition("declined")}
                disabled={pending}
                variant="danger"
              />
            </>
          )}

          {stage === "approved" && (
            <ActionButton
              label="Send NOA"
              onClick={sendNoa}
              disabled={pending}
              variant="primary"
            />
          )}

          {(stage === "noa_sent" ||
            stage === "noa_signed" ||
            stage === "active" ||
            stage === "offboarded" ||
            stage === "declined") && (
            <p className="text-xs text-stone-500">
              {stage === "noa_sent" && "Waiting for carrier to sign NOA."}
              {stage === "noa_signed" && "NOA signed. Carrier becoming active."}
              {stage === "active" && "Carrier is active. Disbursements tracked below."}
              {stage === "declined" && "Submission was declined."}
              {stage === "offboarded" && "Relationship ended."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant: "primary" | "danger" | "secondary";
}) {
  const styles = {
    primary:
      "bg-orange-600 text-white hover:bg-orange-700 disabled:bg-orange-300",
    danger:
      "border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50",
    secondary:
      "border border-line bg-white text-stone-700 hover:border-stone-400 disabled:opacity-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${styles[variant]}`}
    >
      {disabled ? "…" : label}
    </button>
  );
}

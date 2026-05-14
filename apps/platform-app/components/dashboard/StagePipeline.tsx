"use client";

import { Check } from "lucide-react";
import type { QuoteSubmissionStage } from "@/lib/quote-submissions/types";

const STAGES: { stage: QuoteSubmissionStage; label: string }[] = [
  { stage: "submitted", label: "Submitted" },
  { stage: "underwriting", label: "Underwriting" },
  { stage: "approved", label: "Approved" },
  { stage: "noa_sent", label: "NOA Sent" },
  { stage: "noa_signed", label: "NOA Signed" },
  { stage: "active", label: "Active" },
  { stage: "disbursing", label: "Disbursing" },
];

// Stages that are terminal (past the happy path — show differently)
const DECLINED_STAGES: QuoteSubmissionStage[] = ["declined", "offboarded"];

// Map stages to an ordinal index for past/current/future classification
const STAGE_ORDER: Record<string, number> = {
  submitted: 0,
  underwriting: 1,
  approved: 2,
  noa_sent: 3,
  noa_signed: 4,
  active: 5,
  disbursing: 6,
  // declined/offboarded don't have a position in the happy path
};

type Props = {
  currentStage: QuoteSubmissionStage;
};

export default function StagePipeline({ currentStage }: Props) {
  const isDeclined = DECLINED_STAGES.includes(currentStage);
  const currentIdx = STAGE_ORDER[currentStage] ?? -1;

  if (isDeclined) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm font-medium text-red-800">
          {currentStage === "declined" ? "Submission declined" : "Relationship ended"}
        </p>
        <p className="mt-0.5 text-xs text-red-600">
          {currentStage === "declined"
            ? "This factor passed on your profile."
            : "This factor relationship has been offboarded."}
        </p>
      </div>
    );
  }

  return (
    <nav aria-label="Deal room progress" className="w-full">
      <ol className="flex items-center gap-0 overflow-x-auto">
        {STAGES.map((step, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          const isLast = i === STAGES.length - 1;

          return (
            <li key={step.stage} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center min-w-0 flex-1">
                {/* Step indicator */}
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={`
                    flex h-7 w-7 flex-none items-center justify-center border-2 text-xs font-semibold
                    ${isPast ? "border-emerald-500 bg-emerald-500 text-white" : ""}
                    ${isCurrent ? "border-orange-500 bg-orange-50 text-orange-700" : ""}
                    ${isFuture ? "border-stone-300 bg-white text-stone-400" : ""}
                  `}
                >
                  {isPast ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={`
                    mt-1.5 whitespace-nowrap text-center text-[10px] font-medium uppercase tracking-[0.1em]
                    ${isPast ? "text-emerald-600" : ""}
                    ${isCurrent ? "text-orange-700" : ""}
                    ${isFuture ? "text-stone-400" : ""}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {!isLast && (
                <div
                  className={`
                    mx-1 h-0.5 flex-1
                    ${i < currentIdx ? "bg-emerald-400" : "bg-stone-200"}
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

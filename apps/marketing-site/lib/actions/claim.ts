"use server";

import { redirect } from "next/navigation";
import {
  claimAuthoritySchema,
  deliverSubmission,
} from "@/lib/submissions";
import { buildDashboardRecap, sendEmail } from "@/lib/email";
import { getMockDashboard } from "@/lib/mock-dashboard";

export type ClaimState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  dotNumber?: string;
};

export async function submitClaim(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const raw = {
    dotNumber: String(formData.get("dotNumber") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    interests: String(formData.get("interests") ?? "").trim(),
  };

  const parsed = claimAuthoritySchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  // 1. Submission goes to whatever webhook is configured (Slack / Zapier / DB).
  await deliverSubmission({
    kind: "claim_authority",
    receivedAt: new Date().toISOString(),
    source: "licensedtohaul.com",
    data: parsed.data,
  });

  // 2. Fire the dashboard-recap email. Most carriers will engage with the
  //    email more often than the web app — design accordingly. Stubbed via
  //    console + optional webhook until a real provider is wired in.
  const dashboard = getMockDashboard(parsed.data.dotNumber);
  const recap = buildDashboardRecap(parsed.data.email, dashboard);
  await sendEmail(recap);

  // 3. Drop the carrier straight into their dashboard.
  redirect(`/dashboard/${parsed.data.dotNumber}`);
}

"use server";

import { redirect } from "next/navigation";
import {
  claimAuthoritySchema,
  deliverSubmission,
} from "@/lib/submissions";

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

  await deliverSubmission({
    kind: "claim_authority",
    receivedAt: new Date().toISOString(),
    source: "licensedtohaul.com",
    data: parsed.data,
  });

  // Hand the carrier off to the platform app to sign in / claim their dashboard.
  // The dashboard-recap email is platform-side work, wired in a later phase.
  const platformUrl =
    process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://app.licensedtohaul.com";
  redirect(`${platformUrl}/login?email=${encodeURIComponent(parsed.data.email)}`);
}

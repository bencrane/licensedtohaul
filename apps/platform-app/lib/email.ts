// Email-as-product layer.
//
// Once an authority is claimed, the dashboard recap email is the primary
// channel — most carriers will interact with the email more often than the
// web app. This file is the seam where the real send integration plugs in.
//
// For now we log to stdout and (optionally) POST to a webhook for visibility.
// Swap in Resend, Postmark, Loops, etc. when ready.

import type { DashboardData } from "./mock-dashboard";

export type EmailPayload = {
  kind: "dashboard_recap" | "compliance_reminder" | "freight_match" | "quote_arrival";
  to: string;
  subject: string;
  preview: string;
  dotNumber: string;
  sections: { title: string; body: string }[];
};

export function buildDashboardRecap(
  email: string,
  data: DashboardData,
): EmailPayload {
  const { carrier, mcs150, insurance, worstBasic, compliance } = data;

  return {
    kind: "dashboard_recap",
    to: email,
    subject: `Your USDOT ${carrier.dotNumber} dashboard is live`,
    preview: `Authority ${carrier.status}. Next compliance items: IFTA ${compliance.ifta.due}, MCS-150 ${compliance.mcs150.nextDue}.`,
    dotNumber: carrier.dotNumber,
    sections: [
      {
        title: "Authority",
        body: `${carrier.legalName} (USDOT ${carrier.dotNumber}). Status: ${carrier.status}. Authority age: ${carrier.authorityAge.years}y ${carrier.authorityAge.months}mo. ${carrier.powerUnits} power units, ${carrier.drivers} drivers.`,
      },
      {
        title: "Next compliance items",
        body: `MCS-150 refresh due in ${mcs150.nextDueIn} days. IFTA ${compliance.ifta.quarter} due ${compliance.ifta.due}. IRP renewal ${compliance.irp.renewalDue}.`,
      },
      {
        title: "Insurance on file",
        body: `${insurance.bipdLimit} BIPD / ${insurance.cargoLimit} cargo with ${insurance.insurer}. Expires ${insurance.expires} (${insurance.daysToExpiration} days).`,
      },
      {
        title: "Worst BASIC",
        body: `${worstBasic.name} at the ${worstBasic.percentile}th percentile.`,
      },
      {
        title: "Dashboard link",
        body: `https://licensedtohaul.com/dashboard/${carrier.dotNumber}`,
      },
    ],
  };
}

export async function sendEmail(payload: EmailPayload) {
  // Real provider integration plugs in here (Resend / Postmark / Loops / ...).
  // For now: log + optional webhook for visibility during the build phase.
  console.log(
    `[lth/email] would send ${payload.kind} to ${payload.to}`,
    JSON.stringify(payload),
  );

  const webhookUrl = process.env.EMAIL_INTENT_WEBHOOK_URL;
  if (!webhookUrl) return { sent: false, reason: "no_provider" as const };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "email_send",
        payload,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return { sent: response.ok, status: response.status };
  } catch (err) {
    console.error(`[lth/email] webhook failed`, err);
    return { sent: false, reason: "network_error" as const };
  }
}

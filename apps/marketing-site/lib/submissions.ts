import { z } from "zod";

export const claimAuthoritySchema = z.object({
  dotNumber: z
    .string()
    .min(2, "USDOT number is required")
    .max(20)
    .regex(/^[0-9]+$/, "USDOT number must be digits only"),
  name: z.string().min(2, "Your name is required").max(120),
  email: z.string().email("Valid email is required").max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(200).optional().or(z.literal("")),
  interests: z.string().max(2000).optional().or(z.literal("")),
});

export type ClaimAuthorityInput = z.infer<typeof claimAuthoritySchema>;

export const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  company: z.string().max(200).optional().or(z.literal("")),
  dotNumber: z.string().max(20).optional().or(z.literal("")),
  message: z.string().min(5).max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type SubmissionKind = "claim_authority" | "contact";

export type SubmissionPayload = {
  kind: SubmissionKind;
  receivedAt: string;
  source: "licensedtohaul.com";
  data: Record<string, unknown>;
};

export async function deliverSubmission(payload: SubmissionPayload) {
  const webhookUrl = process.env.APPLICATIONS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(
      `[lth/submission] webhook not configured — logging only`,
      JSON.stringify(payload),
    );
    return { delivered: false, reason: "no_webhook" as const };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(
        `[lth/submission] webhook returned ${response.status}`,
        await response.text(),
      );
      return {
        delivered: false,
        reason: "webhook_error" as const,
        status: response.status,
      };
    }

    return { delivered: true as const };
  } catch (err) {
    console.error(`[lth/submission] webhook fetch failed`, err);
    return { delivered: false, reason: "network_error" as const };
  }
}

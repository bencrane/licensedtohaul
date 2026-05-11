"use server";

import { contactSchema, deliverSubmission } from "@/lib/submissions";

export type ContactState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    dotNumber: String(formData.get("dotNumber") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  const parsed = contactSchema.safeParse(raw);

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
    kind: "contact",
    receivedAt: new Date().toISOString(),
    source: "licensedtohaul.com",
    data: parsed.data,
  });

  return {
    ok: true,
    message: "Got it. We'll be in touch within two business days.",
  };
}

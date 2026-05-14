import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  SignatureProvider,
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  EnvelopeSnapshot,
  WebhookVerificationResult,
  EnvelopeStatus,
  NormalizedSignatureEvent,
} from './types';

function getApiUrl(): string {
  const url = process.env.DOCUMENSO_API_URL;
  if (!url) throw new Error('Missing DOCUMENSO_API_URL');
  return url.replace(/\/$/, '');
}

function getApiKey(): string {
  const key = process.env.DOCUMENSO_API_KEY;
  if (!key) throw new Error('Missing DOCUMENSO_API_KEY');
  return key;
}

function mapDocumensoStatus(status: string | undefined): EnvelopeStatus {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'DECLINED':
      return 'declined';
    case 'EXPIRED':
      return 'expired';
    case 'DRAFT':
    case 'PENDING':
    case 'SENT':
    default:
      return 'sent';
  }
}

interface DocumensoRecipient {
  id: number;
  name: string;
  email: string;
  role: string;
  token: string;
  signingStatus?: string;
  readStatus?: string;
  signedAt?: string | null;
}

interface DocumensoDocumentResponse {
  id: number;
  externalId?: string | null;
  status: string;
  recipients: DocumensoRecipient[];
}

/**
 * DocumensoProvider — implements SignatureProvider against the Documenso v1 REST API.
 * Env vars required:
 *   DOCUMENSO_API_URL  — e.g. https://app.documenso.com
 *   DOCUMENSO_API_KEY  — Bearer token
 *   DOCUMENSO_WEBHOOK_SECRET — for HMAC verify
 */
export class DocumensoProvider implements SignatureProvider {
  readonly name = 'documenso' as const;

  private authHeader(): Record<string, string> {
    return {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    };
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    const apiUrl = getApiUrl();

    const recipients = input.signers.map((s, i) => ({
      name: s.name,
      email: s.email,
      role: 'SIGNER',
      // Preserve role label in metadata for signUrls keying
      _role: s.role,
      orderId: i + 1,
    }));

    const body: Record<string, unknown> = {
      title: input.subject,
      externalId: input.externalId,
      recipients: recipients.map((r) => ({
        name: r.name,
        email: r.email,
        role: r.role,
      })),
    };

    if (input.templateId) {
      body.templateId = input.templateId;
    }

    if (input.expiresAt) {
      body.expiresAt = input.expiresAt.toISOString();
    }

    const res = await fetch(`${apiUrl}/api/v1/documents`, {
      method: 'POST',
      headers: this.authHeader(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Documenso createEnvelope failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as DocumensoDocumentResponse;

    // Build signUrls: for embedded mode, assemble ${apiUrl}/sign/${token}
    const signUrls: Record<string, string> = {};
    for (let i = 0; i < input.signers.length; i++) {
      const signer = input.signers[i];
      const recipient = data.recipients[i];
      if (recipient?.token) {
        signUrls[signer.role] = `${apiUrl}/sign/${recipient.token}`;
      }
    }

    return {
      providerEnvelopeId: String(data.id),
      signUrls,
      status: mapDocumensoStatus(data.status),
    };
  }

  async getEnvelope(providerEnvelopeId: string): Promise<EnvelopeSnapshot> {
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/documents/${providerEnvelopeId}`, {
      method: 'GET',
      headers: this.authHeader(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Documenso getEnvelope failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as DocumensoDocumentResponse;

    const signers = (data.recipients ?? []).map((r) => {
      let status: EnvelopeSnapshot['signers'][number]['status'] = 'pending';
      if (r.signingStatus === 'SIGNED') status = 'signed';
      else if (r.signingStatus === 'DECLINED') status = 'declined';
      else if (r.readStatus === 'OPENED') status = 'viewed';

      return {
        role: r.role?.toLowerCase() ?? 'carrier',
        email: r.email,
        status,
        signedAt: r.signedAt ? new Date(r.signedAt) : undefined,
      };
    });

    const completedAt =
      data.status === 'COMPLETED'
        ? signers
            .map((s) => s.signedAt)
            .filter((d): d is Date => d !== undefined)
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : undefined;

    return {
      providerEnvelopeId: String(data.id),
      externalId: data.externalId ?? '',
      status: mapDocumensoStatus(data.status),
      signers,
      completedAt,
    };
  }

  async voidEnvelope(providerEnvelopeId: string, _reason: string): Promise<void> {
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/documents/${providerEnvelopeId}`, {
      method: 'DELETE',
      headers: this.authHeader(),
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Documenso voidEnvelope failed (${res.status}): ${text}`);
    }
  }

  async getDownloadUrl(
    providerEnvelopeId: string,
    _kind: 'signed' | 'certificate' | 'combined',
  ): Promise<{ url: string; expiresAt: Date }> {
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/documents/${providerEnvelopeId}/download`, {
      method: 'GET',
      headers: this.authHeader(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Documenso getDownloadUrl failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { url: string; expiresAt?: string };

    return {
      url: data.url,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 3600_000),
    };
  }

  /**
   * Verify Documenso webhook HMAC.
   * Header: X-Documenso-Signature = hex(HMAC-SHA256(rawBody, DOCUMENSO_WEBHOOK_SECRET))
   * Use timing-safe compare to prevent timing attacks.
   */
  handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): WebhookVerificationResult {
    const secret = process.env.DOCUMENSO_WEBHOOK_SECRET ?? '';
    if (!secret) {
      return { verified: false, events: [] };
    }

    const signature =
      headers['x-documenso-signature'] ?? headers['X-Documenso-Signature'] ?? '';

    if (!signature) {
      return { verified: false, events: [] };
    }

    // Compute expected: HMAC-SHA256(rawBody, secret)
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    let verified = false;
    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const sigBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length === sigBuf.length) {
        verified = timingSafeEqual(expectedBuf, sigBuf);
      }
    } catch {
      verified = false;
    }

    if (!verified) {
      return { verified: false, events: [] };
    }

    // Parse and normalize events
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf-8')) as Record<string, unknown>;
    } catch {
      return { verified: true, events: [] };
    }

    const events: NormalizedSignatureEvent[] = [];
    const docEvent = payload.event as string | undefined;
    const docData = payload.data as Record<string, unknown> | undefined;

    const envSnapshot: EnvelopeSnapshot = {
      providerEnvelopeId: String(docData?.id ?? ''),
      externalId: String(docData?.externalId ?? ''),
      status: mapDocumensoStatus(String(docData?.status ?? '')),
      signers: [],
      completedAt: docData?.completedAt ? new Date(String(docData.completedAt)) : undefined,
    };

    // Map recipients if present
    const recipients = docData?.recipients as DocumensoRecipient[] | undefined;
    if (recipients) {
      envSnapshot.signers = recipients.map((r) => ({
        role: r.role?.toLowerCase() ?? 'carrier',
        email: r.email,
        status:
          r.signingStatus === 'SIGNED'
            ? 'signed'
            : r.signingStatus === 'DECLINED'
            ? 'declined'
            : 'pending',
        signedAt: r.signedAt ? new Date(r.signedAt) : undefined,
      }));
    }

    // Determine signerRole from a per-recipient event context if present
    const signerEmail = String(payload.signerEmail ?? payload.recipient_email ?? '');
    const signerRole =
      envSnapshot.signers.find((s) => s.email === signerEmail)?.role ?? 'carrier';

    switch (docEvent) {
      case 'document.sent':
        events.push({ kind: 'envelope.sent', envelope: envSnapshot });
        break;
      case 'document.opened':
        events.push({ kind: 'envelope.viewed', envelope: envSnapshot, signerRole });
        break;
      case 'document.signed':
        events.push({ kind: 'envelope.signed', envelope: envSnapshot, signerRole });
        break;
      case 'document.completed':
        events.push({ kind: 'envelope.completed', envelope: envSnapshot });
        break;
      case 'document.rejected':
        events.push({
          kind: 'envelope.declined',
          envelope: envSnapshot,
          signerRole,
          reason: String(payload.reason ?? ''),
        });
        break;
      case 'document.expired':
        events.push({ kind: 'envelope.expired', envelope: envSnapshot });
        break;
      default:
        // Unknown event — return verified=true with empty events (don't crash)
        break;
    }

    return { verified: true, events };
  }
}

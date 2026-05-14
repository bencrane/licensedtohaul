import { timingSafeEqual } from 'node:crypto';
import type {
  SignatureProvider,
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  EnvelopeSnapshot,
  WebhookVerificationResult,
  EnvelopeStatus,
  NormalizedSignatureEvent,
  CreateDocumentFromTemplateInput,
  CreateDocumentFromTemplateResult,
} from './types';

function getApiUrl(): string {
  const url = process.env.DOCUMENSO_API_URL ?? 'https://app.documenso.com';
  return url.replace(/\/$/, '');
}

function getApiKey(): string {
  const key = process.env.DOCUMENSO_API_KEY;
  if (!key) throw new Error('Missing DOCUMENSO_API_KEY');
  return key;
}

function authHeader(): Record<string, string> {
  return {
    Authorization: `api_${getApiKey()}`,
    'Content-Type': 'application/json',
  };
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
  id: string | number;
  externalId?: string | null;
  status: string;
  recipients: DocumensoRecipient[];
}

/**
 * DocumensoProvider — implements SignatureProvider against the Documenso v2 Platform API.
 * Env vars:
 *   DOCUMENSO_API_URL  — e.g. https://app.documenso.com (default)
 *   DOCUMENSO_API_KEY  — auth key (header value: api_<key>)
 *   DOCUMENSO_WEBHOOK_SECRET — shared secret for webhook verification via X-Documenso-Secret
 */
export class DocumensoProvider implements SignatureProvider {
  readonly name = 'documenso' as const;

  /**
   * createDocumentFromTemplate — Documenso v2 Platform path.
   * POST /api/v2/template/use with { templateId, recipients, externalId?, distributeDocument?, prefillFields? }
   * Response includes per-recipient signing tokens for embedded signing.
   */
  async createDocumentFromTemplate(
    input: CreateDocumentFromTemplateInput,
  ): Promise<CreateDocumentFromTemplateResult> {
    const apiUrl = getApiUrl();

    const body: Record<string, unknown> = {
      templateId: input.templateId,
      recipients: input.signers.map((s) => ({
        id: s.recipientId,
        email: s.email,
        name: s.name,
      })),
      distributeDocument: input.distributeDocument ?? true,
    };

    if (input.externalId) body.externalId = input.externalId;
    if (input.prefillFields) body.prefillFields = input.prefillFields;

    const res = await fetch(`${apiUrl}/api/v2/template/use`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Documenso createDocumentFromTemplate failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as DocumensoDocumentResponse;

    const recipients: CreateDocumentFromTemplateResult['recipients'] = (
      data.recipients ?? []
    ).map((r) => ({
      role: r.role?.toLowerCase() ?? 'carrier',
      email: r.email,
      signingToken: r.token ?? '',
    }));

    return {
      documentId: String(data.id),
      recipients,
    };
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    const apiUrl = getApiUrl();

    // If a templateId is provided, use createDocumentFromTemplate
    if (input.templateId) {
      // For legacy createEnvelope path with templateId, we need recipientId.
      // Map signers to template recipients by order (carrier=0, factor=1).
      const result = await this.createDocumentFromTemplate({
        templateId: Number(input.templateId),
        externalId: input.externalId,
        distributeDocument: true,
        signers: input.signers.map((s, i) => ({
          recipientId: i + 1, // convention: template recipient IDs are 1-indexed
          role: s.role,
          name: s.name,
          email: s.email,
        })),
      });

      const signUrls: Record<string, string> = {};
      for (const r of result.recipients) {
        signUrls[r.role] = `${apiUrl}/sign/${r.signingToken}`;
      }

      return {
        providerEnvelopeId: result.documentId,
        signUrls,
        status: 'sent',
      };
    }

    // File-based path (no template)
    const body: Record<string, unknown> = {
      title: input.subject,
      externalId: input.externalId,
      recipients: input.signers.map((s) => ({
        name: s.name,
        email: s.email,
        role: 'SIGNER',
      })),
    };

    if (input.expiresAt) {
      body.expiresAt = input.expiresAt.toISOString();
    }

    const res = await fetch(`${apiUrl}/api/v2/documents`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Documenso createEnvelope failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as DocumensoDocumentResponse;

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

    const res = await fetch(`${apiUrl}/api/v2/documents/${providerEnvelopeId}`, {
      method: 'GET',
      headers: authHeader(),
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

    const res = await fetch(`${apiUrl}/api/v2/documents/${providerEnvelopeId}`, {
      method: 'DELETE',
      headers: authHeader(),
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

    const res = await fetch(`${apiUrl}/api/v2/documents/${providerEnvelopeId}/download`, {
      method: 'GET',
      headers: authHeader(),
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
   * Verify Documenso webhook via X-Documenso-Secret header (plain shared-secret equality).
   * Documenso sends the literal configured secret in the header — NOT HMAC.
   * Uses timingSafeEqual to prevent timing attacks.
   */
  handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): WebhookVerificationResult {
    const secret = process.env.DOCUMENSO_WEBHOOK_SECRET ?? '';
    if (!secret) {
      return { verified: false, events: [] };
    }

    // Case-insensitive header lookup
    const headerValue =
      headers['x-documenso-secret'] ??
      headers['X-Documenso-Secret'] ??
      '';

    if (!headerValue) {
      return { verified: false, events: [] };
    }

    // Constant-time compare
    let verified = false;
    try {
      const secretBuf = Buffer.from(secret, 'utf-8');
      const headerBuf = Buffer.from(headerValue, 'utf-8');
      if (secretBuf.length === headerBuf.length) {
        verified = timingSafeEqual(secretBuf, headerBuf);
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
    // Documenso v2 webhook shape: { event, payload: { id, externalId, recipients, ... }, createdAt }
    const docEvent = payload.event as string | undefined;
    // Support both v2 ({ event, payload }) and v1 ({ event, data }) shapes
    const docData = (payload.payload ?? payload.data) as Record<string, unknown> | undefined;

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

    // Determine signerRole from event context
    const signerEmail = String(
      (docData?.currentSigner as Record<string, unknown> | undefined)?.email ??
      payload.signerEmail ??
      payload.recipient_email ??
      '',
    );
    const signerRole =
      envSnapshot.signers.find((s) => s.email === signerEmail)?.role ?? 'carrier';

    // Documenso v2 event names: DOCUMENT_SENT, DOCUMENT_OPENED, DOCUMENT_SIGNED,
    // DOCUMENT_COMPLETED, DOCUMENT_REJECTED, DOCUMENT_CANCELLED
    // Also support v1 lowercase forms for backward compat.
    switch (docEvent) {
      case 'DOCUMENT_SENT':
      case 'document.sent':
        events.push({ kind: 'envelope.sent', envelope: envSnapshot });
        break;
      case 'DOCUMENT_OPENED':
      case 'document.opened':
        events.push({ kind: 'envelope.viewed', envelope: envSnapshot, signerRole });
        break;
      case 'DOCUMENT_SIGNED':
      case 'document.signed':
        events.push({ kind: 'envelope.signed', envelope: envSnapshot, signerRole });
        break;
      case 'DOCUMENT_COMPLETED':
      case 'document.completed':
        events.push({ kind: 'envelope.completed', envelope: envSnapshot });
        break;
      case 'DOCUMENT_REJECTED':
      case 'document.rejected':
        events.push({
          kind: 'envelope.declined',
          envelope: envSnapshot,
          signerRole,
          reason: String(docData?.reason ?? payload.reason ?? ''),
        });
        break;
      case 'DOCUMENT_CANCELLED':
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

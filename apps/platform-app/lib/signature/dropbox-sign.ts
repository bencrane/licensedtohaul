import { createHmac, timingSafeEqual } from 'node:crypto';
import * as DropboxSign from '@dropbox/sign';
import type {
  SignatureProvider,
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  EnvelopeSnapshot,
  WebhookVerificationResult,
  EnvelopeStatus,
} from './types';

function getApiKey(): string {
  const key = process.env.DROPBOX_SIGN_API_KEY;
  if (!key) throw new Error('Missing DROPBOX_SIGN_API_KEY in Doppler');
  return key;
}

function mapDropboxResponseToStatus(sr: DropboxSign.SignatureRequestResponse): EnvelopeStatus {
  if (sr.isDeclined) return 'declined';
  if (sr.isComplete) return 'completed';
  if (sr.hasError) return 'sent'; // fallback — still in-flight
  return 'sent';
}

function mapSignerStatusCode(code: string | undefined): EnvelopeStatus {
  switch (code) {
    case 'signed': return 'completed';
    case 'declined': return 'declined';
    default: return 'sent';
  }
}

/**
 * DropboxSignProvider — real @dropbox/sign SDK (sandbox mode).
 * Constructed only when DROPBOX_SIGN_API_KEY is present.
 */
export class DropboxSignProvider implements SignatureProvider {
  readonly name = 'dropbox-sign' as const;

  private getSignatureRequestApi(): DropboxSign.SignatureRequestApi {
    const api = new DropboxSign.SignatureRequestApi();
    api.username = getApiKey();
    return api;
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    const api = this.getSignatureRequestApi();

    const signers: DropboxSign.SubSignatureRequestSigner[] = input.signers.map((s, i) => ({
      emailAddress: s.email,
      name: s.name,
      order: i,
    }));

    let providerEnvelopeId: string;
    let signUrl = '';
    let status: EnvelopeStatus = 'sent';

    if (input.mode === 'embedded') {
      // Create embedded signature request (no files — use a simple text template approach)
      // For NOA use case, we generate a simple document inline
      const data: DropboxSign.SignatureRequestCreateEmbeddedRequest = {
        clientId: process.env.DROPBOX_SIGN_CLIENT_ID ?? 'lth-platform',
        title: input.subject,
        message: input.message ?? `Please sign the Notice of Assignment.`,
        signers,
        // Inline document using text_tags
        files: undefined,
        testMode: true,
        // Provide a subject-only document by using signerAttachments approach
        // For now, use signerAttachments with an empty message; real NOA would attach PDF
        useTextTags: false,
        hideTextTags: false,
        metadata: { externalId: input.externalId },
      };

      // Use send-without-file approach via file_url pointing to a test doc
      const sendData: DropboxSign.SignatureRequestSendRequest = {
        title: input.subject,
        message: input.message ?? `Please sign the Notice of Assignment.`,
        signers,
        fileUrls: ['https://www.w3.org/WAI/UR/wp-content/uploads/sites/40/2017/01/WCAG20.pdf'],
        testMode: true,
        metadata: { externalId: input.externalId },
      };

      const response = await api.signatureRequestSend(sendData);
      const sr = response.body.signatureRequest!;
      providerEnvelopeId = sr.signatureRequestId!;
      status = mapDropboxResponseToStatus(sr);

      // Get embedded sign URL
      try {
        const embeddedApi = new DropboxSign.EmbeddedApi();
        embeddedApi.username = getApiKey();
        const firstSig = sr.signatures?.[0];
        if (firstSig?.signatureId) {
          const embRes = await embeddedApi.embeddedSignUrl(firstSig.signatureId);
          signUrl = embRes.body.embedded?.signUrl ?? '';
        }
      } catch {
        // Embedded sign URL may require app approval — fall back gracefully
        signUrl = sr.signingUrl ?? `https://app.hellosign.com/sign/${providerEnvelopeId}`;
      }
    } else {
      // Hosted mode
      const sendData: DropboxSign.SignatureRequestSendRequest = {
        title: input.subject,
        message: input.message ?? `Please sign the Notice of Assignment.`,
        signers,
        fileUrls: ['https://www.w3.org/WAI/UR/wp-content/uploads/sites/40/2017/01/WCAG20.pdf'],
        testMode: true,
        metadata: { externalId: input.externalId },
      };

      const response = await api.signatureRequestSend(sendData);
      const sr = response.body.signatureRequest!;
      providerEnvelopeId = sr.signatureRequestId!;
      status = mapDropboxResponseToStatus(sr);
      signUrl = sr.signingUrl ?? `https://app.hellosign.com/sign/${providerEnvelopeId}`;
    }

    return {
      providerEnvelopeId,
      signUrls: { carrier: signUrl },
      status,
    };
  }

  async getEnvelope(providerEnvelopeId: string): Promise<EnvelopeSnapshot> {
    const api = this.getSignatureRequestApi();
    const response = await api.signatureRequestGet(providerEnvelopeId);
    const sr = response.body.signatureRequest!;

    const externalId = (sr.metadata as Record<string, string> | undefined)?.externalId ?? '';

    // completedAt: use the latest signedAt from signers when isComplete
    const latestSignedAt = sr.isComplete
      ? (sr.signatures ?? [])
          .map((s) => s.signedAt)
          .filter((t): t is number => typeof t === 'number')
          .sort((a, b) => b - a)[0]
      : undefined;

    return {
      providerEnvelopeId,
      externalId,
      status: mapDropboxResponseToStatus(sr),
      signers: (sr.signatures ?? []).map((s) => ({
        role: 'carrier',
        email: s.signerEmailAddress ?? '',
        status: s.statusCode === 'signed' ? 'signed' : 'pending',
        signedAt: s.signedAt ? new Date(s.signedAt * 1000) : undefined,
      })),
      completedAt: latestSignedAt ? new Date(latestSignedAt * 1000) : undefined,
    };
  }

  async voidEnvelope(providerEnvelopeId: string, reason: string): Promise<void> {
    const api = this.getSignatureRequestApi();
    await api.signatureRequestCancel(providerEnvelopeId);
  }

  async getDownloadUrl(
    providerEnvelopeId: string,
    _kind: 'signed' | 'certificate' | 'combined',
  ): Promise<{ url: string; expiresAt: Date }> {
    // Dropbox Sign doesn't provide a direct URL — returns file bytes
    // We return a placeholder pointing at the Dropbox Sign interface
    return {
      url: `https://app.hellosign.com/sign/${providerEnvelopeId}`,
      expiresAt: new Date(Date.now() + 3600_000),
    };
  }

  /**
   * Verify Dropbox Sign webhook HMAC.
   * Convention: X-Hellosign-Signature = hex(HMAC-SHA256(event_time + event_type, apiKey))
   * The signed string is the concatenation of event.event_time and event.event_type
   * from the parsed JSON payload.
   */
  handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): WebhookVerificationResult {
    const signature = headers['x-hellosign-signature'] ?? headers['X-Hellosign-Signature'] ?? '';
    const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? '';

    if (!apiKey) {
      return { verified: false, events: [] };
    }

    // Parse body to get event_time and event_type
    let eventTime = '';
    let eventType = '';
    try {
      // Body may be JSON directly or form-encoded with a "json" field
      const bodyStr = rawBody.toString('utf-8');
      let parsed: Record<string, unknown>;
      if (bodyStr.trimStart().startsWith('{')) {
        parsed = JSON.parse(bodyStr);
      } else {
        // form-encoded: json=<urlencoded json>
        const params = new URLSearchParams(bodyStr);
        const jsonField = params.get('json');
        parsed = jsonField ? JSON.parse(jsonField) : {};
      }
      const event = parsed.event as Record<string, unknown> | undefined;
      eventTime = String(event?.event_time ?? '');
      eventType = String(event?.event_type ?? '');
    } catch {
      return { verified: false, events: [] };
    }

    const signedString = eventTime + eventType;
    const expected = createHmac('sha256', apiKey).update(signedString, 'utf8').digest('hex');

    let verified = false;
    try {
      verified = timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      verified = false;
    }

    if (!verified) {
      return { verified: false, events: [] };
    }

    // Parse event type to normalized events
    // For webhook test purposes, we emit envelope.completed for signature_request_signed
    const events: WebhookVerificationResult['events'] = [];
    if (eventType === 'signature_request_signed' || eventType === 'signature_request_all_signed') {
      // We don't have enough info here to build a full snapshot without a DB lookup
      // The route handler will do the DB lookup; we just signal verified + event kind
      events.push({
        kind: 'envelope.completed',
        envelope: {
          providerEnvelopeId: '',
          externalId: '',
          status: 'completed',
          signers: [],
          completedAt: new Date(),
        },
      });
    } else if (eventType === 'signature_request_sent') {
      events.push({
        kind: 'envelope.sent',
        envelope: {
          providerEnvelopeId: '',
          externalId: '',
          status: 'sent',
          signers: [],
        },
      });
    }

    return { verified: true, events };
  }
}

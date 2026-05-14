import type {
  SignatureProvider,
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  EnvelopeSnapshot,
  EnvelopeStatus,
  NormalizedSignatureEvent,
  WebhookVerificationResult,
  CreateDocumentFromTemplateInput,
  CreateDocumentFromTemplateResult,
} from './types';

interface StoredEnvelope {
  providerEnvelopeId: string;
  externalId: string;
  status: EnvelopeStatus;
  signers: {
    role: string;
    email: string;
    status: 'pending' | 'viewed' | 'signed' | 'declined';
    signedAt?: Date;
    ip?: string;
  }[];
  completedAt?: Date;
}

export class FakeSignatureProvider implements SignatureProvider {
  readonly name = 'fake' as const;

  private envelopes = new Map<string, StoredEnvelope>();
  // index: externalId -> providerEnvelopeId
  private externalIndex = new Map<string, string>();

  createDocumentFromTemplate(
    input: CreateDocumentFromTemplateInput,
  ): Promise<CreateDocumentFromTemplateResult> {
    const documentId = `fake-tmpl-doc-${input.templateId}-${input.externalId ?? Date.now()}`;
    const recipients: CreateDocumentFromTemplateResult['recipients'] = input.signers.map((s) => ({
      role: s.role,
      email: s.email,
      signingToken: `fake-token-${s.role}-${documentId}`,
    }));
    return Promise.resolve({ documentId, recipients });
  }

  createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    const providerEnvelopeId = `fake-env-${input.externalId}`;
    const stored: StoredEnvelope = {
      providerEnvelopeId,
      externalId: input.externalId,
      status: 'sent',
      signers: input.signers.map((s) => ({
        role: s.role,
        email: s.email,
        status: 'pending' as const,
      })),
    };
    this.envelopes.set(providerEnvelopeId, stored);
    this.externalIndex.set(input.externalId, providerEnvelopeId);

    const signUrls: Record<string, string> = {};
    for (const signer of input.signers) {
      signUrls[signer.role] = `https://fake-sign.local/${providerEnvelopeId}/${signer.role}`;
    }

    return Promise.resolve({
      providerEnvelopeId,
      signUrls,
      status: 'sent',
    });
  }

  getEnvelope(providerEnvelopeId: string): Promise<EnvelopeSnapshot> {
    const stored = this.envelopes.get(providerEnvelopeId);
    if (!stored) {
      return Promise.reject(
        new Error(`FakeSignatureProvider: unknown envelope ${providerEnvelopeId}`),
      );
    }
    return Promise.resolve({ ...stored, signers: stored.signers.map((s) => ({ ...s })) });
  }

  voidEnvelope(providerEnvelopeId: string, _reason: string): Promise<void> {
    const stored = this.envelopes.get(providerEnvelopeId);
    if (stored) stored.status = 'voided';
    return Promise.resolve();
  }

  getDownloadUrl(
    providerEnvelopeId: string,
    kind: 'signed' | 'certificate' | 'combined',
  ): Promise<{ url: string; expiresAt: Date }> {
    return Promise.resolve({
      url: `https://fake-download.local/${providerEnvelopeId}/${kind}`,
      expiresAt: new Date(Date.now() + 3600_000),
    });
  }

  /**
   * handleWebhook for FakeSignatureProvider:
   * Accepts JSON body: { kind, externalId, signerIp?, signedAt? }
   * No signature verification — just parse and emit.
   */
  handleWebhook(rawBody: Buffer, _headers: Record<string, string>): WebhookVerificationResult {
    let payload: {
      kind: string;
      externalId: string;
      signerIp?: string;
      signedAt?: string;
    };
    try {
      payload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      return { verified: false, events: [] };
    }

    const providerEnvelopeId = this.externalIndex.get(payload.externalId);
    if (!providerEnvelopeId) {
      return { verified: false, events: [] };
    }

    const stored = this.envelopes.get(providerEnvelopeId);
    if (!stored) {
      return { verified: false, events: [] };
    }

    const events: NormalizedSignatureEvent[] = [];

    if (payload.kind === 'envelope.completed') {
      const signedAt = payload.signedAt ? new Date(payload.signedAt) : new Date();
      stored.status = 'completed';
      stored.completedAt = signedAt;
      for (const signer of stored.signers) {
        signer.status = 'signed';
        signer.signedAt = signedAt;
        if (payload.signerIp) signer.ip = payload.signerIp;
      }
      const snapshot: EnvelopeSnapshot = {
        ...stored,
        signers: stored.signers.map((s) => ({ ...s })),
      };
      events.push({ kind: 'envelope.completed', envelope: snapshot });
    }

    return { verified: true, events };
  }

  /**
   * Test helper: simulate an event by externalId, mutating internal state.
   */
  simulateEvent(
    kind: 'envelope.completed' | 'envelope.declined' | 'envelope.expired',
    externalId: string,
    opts?: { signerIp?: string; signedAt?: Date },
  ): void {
    const providerEnvelopeId = this.externalIndex.get(externalId);
    if (!providerEnvelopeId) {
      throw new Error(`FakeSignatureProvider: unknown externalId ${externalId}`);
    }
    const stored = this.envelopes.get(providerEnvelopeId)!;
    if (kind === 'envelope.completed') {
      const signedAt = opts?.signedAt ?? new Date();
      stored.status = 'completed';
      stored.completedAt = signedAt;
      for (const signer of stored.signers) {
        signer.status = 'signed';
        signer.signedAt = signedAt;
        if (opts?.signerIp) signer.ip = opts.signerIp;
      }
    } else if (kind === 'envelope.declined') {
      stored.status = 'declined';
    } else if (kind === 'envelope.expired') {
      stored.status = 'expired';
    }
  }
}

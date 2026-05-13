import type {
  SignatureProvider,
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  EnvelopeSnapshot,
  WebhookVerificationResult,
} from './types';

/**
 * DropboxSignProvider — stub for follow-up cycle (factor-workflow-platform-v2-dropbox-sign-live).
 * All methods throw "not implemented" until the real integration is wired.
 */
export class DropboxSignProvider implements SignatureProvider {
  readonly name = 'dropbox-sign' as const;

  createEnvelope(_input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    throw new Error('DropboxSignProvider: not implemented — use FakeSignatureProvider in tests');
  }

  getEnvelope(_providerEnvelopeId: string): Promise<EnvelopeSnapshot> {
    throw new Error('DropboxSignProvider: not implemented');
  }

  voidEnvelope(_providerEnvelopeId: string, _reason: string): Promise<void> {
    throw new Error('DropboxSignProvider: not implemented');
  }

  getDownloadUrl(
    _providerEnvelopeId: string,
    _kind: 'signed' | 'certificate' | 'combined',
  ): Promise<{ url: string; expiresAt: Date }> {
    throw new Error('DropboxSignProvider: not implemented');
  }

  handleWebhook(
    _rawBody: Buffer,
    _headers: Record<string, string>,
  ): WebhookVerificationResult {
    throw new Error('DropboxSignProvider: not implemented');
  }
}

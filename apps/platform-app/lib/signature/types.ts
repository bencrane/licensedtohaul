export type SignatureRoutingMode = 'sequential' | 'parallel';
export type EnvelopeStatus =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'expired';

export interface SignatureSigner {
  role: string; // "carrier" | "factor" | "broker"
  name: string;
  email: string;
  smsPhone?: string;
  prefillFields?: Record<string, string | number | boolean>;
}

export interface CreateEnvelopeInput {
  templateId?: string;
  files?: { name: string; bytes: Uint8Array; contentType: 'application/pdf' }[];
  subject: string;
  message?: string;
  signers: SignatureSigner[];
  routing?: SignatureRoutingMode;
  mode: 'embedded' | 'hosted';
  externalId: string; // our envelope row UUID
  expiresAt?: Date;
  returnUrl?: string;
}

export interface CreateEnvelopeResult {
  providerEnvelopeId: string;
  signUrls: Record<string, string>; // role -> url
  status: EnvelopeStatus;
}

export interface EnvelopeSnapshot {
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

export type NormalizedSignatureEvent =
  | { kind: 'envelope.sent'; envelope: EnvelopeSnapshot }
  | { kind: 'envelope.viewed'; envelope: EnvelopeSnapshot; signerRole: string }
  | { kind: 'envelope.signed'; envelope: EnvelopeSnapshot; signerRole: string }
  | { kind: 'envelope.completed'; envelope: EnvelopeSnapshot }
  | {
      kind: 'envelope.declined';
      envelope: EnvelopeSnapshot;
      signerRole: string;
      reason?: string;
    }
  | { kind: 'envelope.expired'; envelope: EnvelopeSnapshot }
  | { kind: 'envelope.bounced'; envelope: EnvelopeSnapshot; signerRole: string };

export interface WebhookVerificationResult {
  verified: boolean;
  events: NormalizedSignatureEvent[];
}

export interface TemplateSigner {
  recipientId: number; // Documenso template recipient ID (assigned at template authoring time)
  role: string; // 'carrier' | 'factor'
  name: string;
  email: string;
}

export interface CreateDocumentFromTemplateInput {
  templateId: number;
  externalId?: string;
  distributeDocument?: boolean;
  signers: TemplateSigner[];
  prefillFields?: Array<{ id: string | number; value: string | number | boolean }>;
}

export interface CreateDocumentFromTemplateResult {
  documentId: string;
  recipients: Array<{
    role: string;
    email: string;
    signingToken: string;
  }>;
}

export interface SignatureProvider {
  readonly name: 'dropbox-sign' | 'boldsign' | 'documenso' | 'fake';
  createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult>;
  createDocumentFromTemplate(
    input: CreateDocumentFromTemplateInput,
  ): Promise<CreateDocumentFromTemplateResult>;
  getEnvelope(providerEnvelopeId: string): Promise<EnvelopeSnapshot>;
  voidEnvelope(providerEnvelopeId: string, reason: string): Promise<void>;
  getDownloadUrl(
    providerEnvelopeId: string,
    kind: 'signed' | 'certificate' | 'combined',
  ): Promise<{ url: string; expiresAt: Date }>;
  handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): WebhookVerificationResult;
}

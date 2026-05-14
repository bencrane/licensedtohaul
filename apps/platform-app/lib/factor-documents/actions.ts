import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type {
  FactorDocumentRow,
  FactorPartnerConfigRow,
  DocumentKind,
  DocumentState,
} from './types';
import { templateIdColumnForKind } from './types';
import {
  getDocumentById,
  getPartnerConfig,
  _memSetDocument,
  _memSetConfig,
} from './queries';
import { getSignatureProvider } from '@/lib/signature/index';
import { getFactorDisplayName } from '@/lib/factor-of-record/types';
import { recordForTransition, writeAuditLog } from '@/lib/factor-of-record/queries';
import { transitionSubmissionStageByDotSlug } from '@/lib/quote-submissions/actions';

// ---------------------------------------------------------------------------
// DB pool (lazy)
// ---------------------------------------------------------------------------
let _pool: Pool | null | undefined;

function pool(): Pool | null {
  if (_pool === undefined) {
    const connString = process.env.LTH_DB_POOLED_URL;
    _pool = connString ? new Pool({ connectionString: connString, max: 4 }) : null;
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Insert helpers with in-memory fallback
// ---------------------------------------------------------------------------

async function insertDocument(row: FactorDocumentRow): Promise<void> {
  const db = pool();
  if (db) {
    try {
      await db.query(
        `INSERT INTO factor_documents (
           id, factor_slug, carrier_dot, document_kind, state,
           documenso_document_id, documenso_template_id,
           carrier_signing_token, factor_signing_token,
           notes, payload, sent_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)`,
        [
          row.id,
          row.factor_slug,
          row.carrier_dot,
          row.document_kind,
          row.state,
          row.documenso_document_id,
          row.documenso_template_id,
          row.carrier_signing_token,
          row.factor_signing_token,
          row.notes,
          row.payload ? JSON.stringify(row.payload) : null,
          row.sent_at,
          row.updated_at,
        ],
      );
      return;
    } catch {
      // fall through to in-memory
    }
  }
  _memSetDocument(row);
}

async function updateDocumentState(
  documentId: string,
  updates: Partial<FactorDocumentRow> & { state: DocumentState },
): Promise<FactorDocumentRow | null> {
  const db = pool();
  if (db) {
    try {
      const setClauses: string[] = ['state = $2', 'updated_at = now()'];
      const params: unknown[] = [documentId, updates.state];
      let i = 3;
      if (updates.carrier_signed_at !== undefined) {
        setClauses.push(`carrier_signed_at = $${i++}`);
        params.push(updates.carrier_signed_at);
      }
      if (updates.factor_signed_at !== undefined) {
        setClauses.push(`factor_signed_at = $${i++}`);
        params.push(updates.factor_signed_at);
      }
      if (updates.completed_at !== undefined) {
        setClauses.push(`completed_at = $${i++}`);
        params.push(updates.completed_at);
      }
      if (updates.voided_at !== undefined) {
        setClauses.push(`voided_at = $${i++}`);
        params.push(updates.voided_at);
      }
      if (updates.void_reason !== undefined) {
        setClauses.push(`void_reason = $${i++}`);
        params.push(updates.void_reason);
      }
      const { rows } = await db.query<FactorDocumentRow>(
        `UPDATE factor_documents SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        params,
      );
      return rows[0] ?? null;
    } catch {
      // fall through
    }
  }
  // In-memory fallback
  const { _memSetDocument: setDoc } = await import('./queries');
  const existing = await getDocumentById(documentId);
  if (!existing) return null;
  const updated: FactorDocumentRow = {
    ...existing,
    ...updates,
    updated_at: new Date(),
  };
  setDoc(updated);
  return updated;
}

async function insertDocumentEvent(
  documentId: string,
  eventType: string,
  actor?: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const db = pool();
  if (db) {
    try {
      await db.query(
        `INSERT INTO factor_document_events (id, document_id, event_type, actor, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [randomUUID(), documentId, eventType, actor ?? null, payload ? JSON.stringify(payload) : null],
      );
      return;
    } catch {
      // non-fatal — events are audit trail only
    }
  }
}

// ---------------------------------------------------------------------------
// sendDocument
// ---------------------------------------------------------------------------

export interface SendDocumentInput {
  factorSlug: string;
  carrierDot: string;
  carrierEmail: string;
  carrierName?: string;
  factorEmail?: string;
  factorName?: string;
  documentKind: DocumentKind;
  notes?: string;
  /**
   * Template recipient IDs discovered from the factor's Documenso template.
   * Convention: carrierRecipientId = recipient at index 0; factorRecipientId = at index 1.
   * Both must be passed for dual-signer templates (e.g. NOA).
   * For single-signer templates, factorRecipientId may be omitted.
   */
  carrierRecipientId?: number;
  factorRecipientId?: number;
}

export async function sendDocument(input: SendDocumentInput): Promise<{
  documentId: string;
  signingTokens: { carrier?: string; factor?: string };
}> {
  // Load partner config to get template ID
  const config = await getPartnerConfig(input.factorSlug);
  const col = templateIdColumnForKind(input.documentKind);
  const templateIdStr = col ? (config?.[col] ?? null) : null;

  if (!templateIdStr) {
    throw new Error(`No template ID configured for ${input.documentKind} on ${input.factorSlug}`);
  }

  const templateId = Number(templateIdStr);
  const externalId = randomUUID();
  const provider = getSignatureProvider();

  // Build signers list based on document kind
  // NOA requires carrier (index 0) + factor (index 1); others are carrier-only
  const signers = [];
  signers.push({
    recipientId: input.carrierRecipientId ?? 1,
    role: 'carrier',
    name: input.carrierName ?? `Carrier ${input.carrierDot}`,
    email: input.carrierEmail,
  });

  if (input.factorEmail) {
    signers.push({
      recipientId: input.factorRecipientId ?? 2,
      role: 'factor',
      name: input.factorName ?? input.factorSlug,
      email: input.factorEmail,
    });
  }

  const result = await provider.createDocumentFromTemplate({
    templateId,
    externalId,
    distributeDocument: true,
    signers,
  });

  // Parse tokens
  const carrierRecipient = result.recipients.find((r) => r.role === 'carrier');
  const factorRecipient = result.recipients.find((r) => r.role === 'factor');

  const row: FactorDocumentRow = {
    id: randomUUID(),
    factor_slug: input.factorSlug,
    carrier_dot: input.carrierDot,
    document_kind: input.documentKind,
    state: 'sent',
    documenso_document_id: result.documentId,
    documenso_template_id: String(templateId),
    carrier_signing_token: carrierRecipient?.signingToken ?? null,
    factor_signing_token: factorRecipient?.signingToken ?? null,
    carrier_signed_at: null,
    factor_signed_at: null,
    completed_at: null,
    voided_at: null,
    void_reason: null,
    notes: input.notes ?? null,
    payload: { externalId, recipients: result.recipients },
    sent_at: new Date(),
    updated_at: new Date(),
  };

  await insertDocument(row);
  await insertDocumentEvent(row.id, 'document.sent', 'system', {
    documenso_document_id: result.documentId,
  });

  return {
    documentId: row.id,
    signingTokens: {
      carrier: row.carrier_signing_token ?? undefined,
      factor: row.factor_signing_token ?? undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

export async function markCarrierSigned(opts: {
  documentId: string;
  signedAt?: Date;
  signerInfo?: Record<string, unknown>;
}): Promise<FactorDocumentRow | null> {
  const signedAt = opts.signedAt ?? new Date();
  const doc = await getDocumentById(opts.documentId);
  if (!doc) return null;

  // For single-signer docs (no factor token), signing by carrier = completed
  const newState: DocumentState = doc.factor_signing_token ? 'signed_by_carrier' : 'completed';

  const updated = await updateDocumentState(doc.id, {
    state: newState,
    carrier_signed_at: signedAt,
    ...(newState === 'completed' ? { completed_at: signedAt } : {}),
  });

  await insertDocumentEvent(doc.id, 'carrier.signed', opts.signerInfo?.email as string | undefined, {
    signed_at: signedAt.toISOString(),
    ...opts.signerInfo,
  });

  if (newState === 'completed' && updated) {
    await handleCompletionSideEffects(updated);
  }

  return updated;
}

export async function markFactorSigned(opts: {
  documentId: string;
  signedAt?: Date;
  signerInfo?: Record<string, unknown>;
}): Promise<FactorDocumentRow | null> {
  const signedAt = opts.signedAt ?? new Date();
  const doc = await getDocumentById(opts.documentId);
  if (!doc) return null;

  const updated = await updateDocumentState(doc.id, {
    state: 'completed',
    factor_signed_at: signedAt,
    completed_at: signedAt,
  });

  await insertDocumentEvent(doc.id, 'factor.signed', opts.signerInfo?.email as string | undefined, {
    signed_at: signedAt.toISOString(),
    ...opts.signerInfo,
  });

  if (updated) {
    await handleCompletionSideEffects(updated);
  }

  return updated;
}

export async function markCompleted(opts: {
  documentId: string;
  completedAt?: Date;
}): Promise<FactorDocumentRow | null> {
  const completedAt = opts.completedAt ?? new Date();
  const existing = await getDocumentById(opts.documentId);
  if (!existing) return null;

  // Determine new state: if not already signed by both, mark both as signed now
  const newCarrierSignedAt = existing.carrier_signed_at ?? completedAt;
  const newFactorSignedAt =
    existing.factor_signing_token ? (existing.factor_signed_at ?? completedAt) : null;

  const updated = await updateDocumentState(existing.id, {
    state: 'completed',
    completed_at: completedAt,
    ...(newFactorSignedAt && !existing.factor_signed_at
      ? { factor_signed_at: newFactorSignedAt }
      : {}),
    ...(!existing.carrier_signed_at ? { carrier_signed_at: newCarrierSignedAt } : {}),
  });

  await insertDocumentEvent(existing.id, 'document.completed', 'system', {
    completed_at: completedAt.toISOString(),
  });

  if (updated) {
    await handleCompletionSideEffects(updated);
  }

  return updated;
}

export async function markRejected(opts: {
  documentId: string;
  reason?: string;
}): Promise<FactorDocumentRow | null> {
  const existing = await getDocumentById(opts.documentId);
  if (!existing) return null;

  const updated = await updateDocumentState(existing.id, {
    state: 'rejected',
    void_reason: opts.reason ?? null,
  });
  await insertDocumentEvent(existing.id, 'document.rejected', 'system', {
    reason: opts.reason ?? '',
  });
  return updated;
}

export async function markVoided(opts: {
  documentId: string;
  reason?: string;
}): Promise<FactorDocumentRow | null> {
  const existing = await getDocumentById(opts.documentId);
  if (!existing) return null;

  const voidedAt = new Date();
  const updated = await updateDocumentState(existing.id, {
    state: 'voided',
    voided_at: voidedAt,
    void_reason: opts.reason ?? null,
  });
  await insertDocumentEvent(existing.id, 'document.voided', 'system', {
    reason: opts.reason ?? '',
  });
  return updated;
}

export async function savePartnerConfig(opts: {
  factorSlug: string;
  templateIds: {
    noa?: string | null;
    masterAgreement?: string | null;
    addendum?: string | null;
    sideLetter?: string | null;
  };
}): Promise<FactorPartnerConfigRow> {
  const row: FactorPartnerConfigRow = {
    factor_slug: opts.factorSlug,
    documenso_noa_template_id: opts.templateIds.noa ?? null,
    documenso_master_agreement_template_id: opts.templateIds.masterAgreement ?? null,
    documenso_addendum_template_id: opts.templateIds.addendum ?? null,
    documenso_side_letter_template_id: opts.templateIds.sideLetter ?? null,
    updated_at: new Date(),
  };

  const db = pool();
  if (db) {
    try {
      const { rows } = await db.query<FactorPartnerConfigRow>(
        `INSERT INTO factor_partner_config (
           factor_slug,
           documenso_noa_template_id,
           documenso_master_agreement_template_id,
           documenso_addendum_template_id,
           documenso_side_letter_template_id,
           updated_at
         ) VALUES ($1,$2,$3,$4,$5,now())
         ON CONFLICT (factor_slug) DO UPDATE SET
           documenso_noa_template_id = EXCLUDED.documenso_noa_template_id,
           documenso_master_agreement_template_id = EXCLUDED.documenso_master_agreement_template_id,
           documenso_addendum_template_id = EXCLUDED.documenso_addendum_template_id,
           documenso_side_letter_template_id = EXCLUDED.documenso_side_letter_template_id,
           updated_at = now()
         RETURNING *`,
        [
          row.factor_slug,
          row.documenso_noa_template_id,
          row.documenso_master_agreement_template_id,
          row.documenso_addendum_template_id,
          row.documenso_side_letter_template_id,
        ],
      );
      return rows[0] ?? row;
    } catch {
      // fall through
    }
  }
  _memSetConfig(row);
  return row;
}

// ---------------------------------------------------------------------------
// NOA backward-compat: on completion of a NOA, fire FoR creation path
// ---------------------------------------------------------------------------

async function handleCompletionSideEffects(doc: FactorDocumentRow): Promise<void> {
  if (doc.document_kind !== 'noa') return;

  const db = pool();
  if (!db) return; // In-memory fallback: can't run DB-side FoR logic

  const completedAt = doc.completed_at ?? new Date();

  try {
    // Upsert noa_envelopes row (use documenso_document_id as provider_envelope_id)
    const externalId = (doc.payload as Record<string, unknown> | null)?.externalId as string | undefined
      ?? doc.id;

    const { rows: envRows } = await db.query<{ id: string }>(
      `INSERT INTO noa_envelopes (
         id, external_id, carrier_dot, factor_slug, provider,
         provider_envelope_id, state, signed_at, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, 'documenso',
         $4, 'completed', $5, now(), now()
       )
       ON CONFLICT (external_id) DO UPDATE SET
         state = 'completed', signed_at = EXCLUDED.signed_at, updated_at = now()
       RETURNING id`,
      [externalId, doc.carrier_dot, doc.factor_slug, doc.documenso_document_id, completedAt],
    );

    const noaEnvelopeId = envRows[0]?.id;
    if (!noaEnvelopeId) return;

    // Record FoR transition
    const factorDisplayName = getFactorDisplayName(doc.factor_slug);
    const { newForId, revokedForId } = await recordForTransition({
      pool: db,
      carrierDot: doc.carrier_dot,
      factorSlug: doc.factor_slug,
      factorDisplayName,
      noaEnvelopeId,
      assignedAt: completedAt,
      signedAt: completedAt,
    });

    await writeAuditLog(
      {
        carrierDot: doc.carrier_dot,
        factorSlug: doc.factor_slug,
        event: 'for.assigned',
        payload: { document_id: doc.id, new_for_id: newForId, revoked_for_id: revokedForId },
        noaEnvelopeId,
        forId: newForId,
      },
      { pool: db },
    );

    if (revokedForId) {
      await writeAuditLog(
        {
          carrierDot: doc.carrier_dot,
          factorSlug: doc.factor_slug,
          event: 'for.revoked',
          payload: { document_id: doc.id, revoked_for_id: revokedForId },
          noaEnvelopeId,
          forId: revokedForId,
        },
        { pool: db },
      );
    }

    // Queue billing event
    await db.query(
      `INSERT INTO factor_billing_events (factor_slug, event_name, payload)
       VALUES ($1, 'noa.transition', $2::jsonb)`,
      [doc.factor_slug, JSON.stringify({ document_id: doc.id, for_id: newForId })],
    );

    // Advance quote_submissions.stage to 'active'
    await transitionSubmissionStageByDotSlug({
      pool: db,
      carrierDot: doc.carrier_dot,
      factorSlug: doc.factor_slug,
      toStage: 'active',
      actor: 'system',
      note: 'NOA signed — factor_documents DOCUMENT_COMPLETED',
      factorOfRecordId: newForId,
    }).catch(() => {
      // Non-fatal: quote_submissions row may not exist
    });
  } catch (err) {
    console.error('handleCompletionSideEffects error:', err);
    // Non-fatal: FoR creation failure shouldn't block the webhook response
  }
}

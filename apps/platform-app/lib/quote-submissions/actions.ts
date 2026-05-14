import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { QuoteSubmission, QuoteSubmissionStage } from './types';
import { ALLOWED_TRANSITIONS, rowToSubmission } from './types';
import { FIELDS_SHARED } from './constants';
import {
  _setInMemory,
  _getFromMemory,
  getSubmissionById,
} from './queries';
import type { _QuoteSubmissionPgRow } from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isConnectionError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const code = (err as { code?: string }).code;
    if (typeof code === 'string' && code.startsWith('08')) return true;
    const msg = (err as { message?: string }).message ?? '';
    if (
      msg.includes('LTH_DB_POOLED_URL not set') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ENOTFOUND')
    )
      return true;
  }
  return false;
}

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error('LTH_DB_POOLED_URL not set');
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null = null;
function defaultPool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

// ---------------------------------------------------------------------------
// submitQuote — idempotent on (carrier_dot, factor_slug)
// ---------------------------------------------------------------------------

export interface SubmitQuoteInput {
  carrierDot: string;
  factorSlug: string;
  quoteId: string;
  rate: string;
  recourseLabel: string;
  fundingSpeed: string;
  monthlyMinimum?: string;
  notes?: string;
  fieldsShared?: string[];
}

export async function submitQuote(
  input: SubmitQuoteInput,
  opts?: { pool?: Pool },
): Promise<QuoteSubmission> {
  const fields = input.fieldsShared ?? [...FIELDS_SHARED];

  try {
    const db = opts?.pool ?? defaultPool();
    const { rows } = await db.query<_QuoteSubmissionPgRow>(
      `INSERT INTO quote_submissions
         (carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
          monthly_minimum, notes, fields_shared)
       VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7, $8, $9)
       ON CONFLICT (carrier_dot, factor_slug)
       DO UPDATE SET updated_at = quote_submissions.updated_at  -- no-op on conflict; return existing
       RETURNING id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
                 monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
                 submitted_at, updated_at`,
      [
        input.carrierDot,
        input.factorSlug,
        input.quoteId,
        input.rate,
        input.recourseLabel,
        input.fundingSpeed,
        input.monthlyMinimum ?? null,
        input.notes ?? null,
        fields,
      ],
    );

    const submission = rowToSubmission(rows[0]!);

    // Insert initial stage history row only if this is a new submission (stage='submitted' and no history yet)
    try {
      await db.query(
        `INSERT INTO quote_submission_stage_history
           (submission_id, from_stage, to_stage, actor)
         VALUES ($1, NULL, 'submitted', 'carrier')
         ON CONFLICT DO NOTHING`,
        [submission.id],
      );
    } catch {
      // Stage history is best-effort; don't fail the submission on history insert error
    }

    _setInMemory(submission);
    return submission;
  } catch (err) {
    if (isConnectionError(err)) {
      // In-memory fallback: check for existing
      const existing = _getFromMemory(input.carrierDot, input.factorSlug);
      if (existing) return existing;

      const now = new Date();
      const submission: QuoteSubmission = {
        id: randomUUID(),
        carrierDot: input.carrierDot,
        factorSlug: input.factorSlug,
        quoteId: input.quoteId,
        stage: 'submitted',
        rate: input.rate,
        recourseLabel: input.recourseLabel,
        fundingSpeed: input.fundingSpeed,
        monthlyMinimum: input.monthlyMinimum ?? null,
        notes: input.notes ?? null,
        fieldsShared: fields,
        noaEnvelopeId: null,
        factorOfRecordId: null,
        submittedAt: now,
        updatedAt: now,
      };
      _setInMemory(submission);
      return submission;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// transitionStage
// ---------------------------------------------------------------------------

export interface TransitionStageInput {
  submissionId: string;
  toStage: QuoteSubmissionStage;
  actor: string;
  note?: string;
}

export async function transitionStage(
  input: TransitionStageInput,
  opts?: { pool?: Pool },
): Promise<QuoteSubmission> {
  const { submissionId, toStage, actor, note } = input;

  try {
    const db = opts?.pool ?? defaultPool();

    // Get current row with FOR UPDATE to lock
    const { rows: current } = await db.query<_QuoteSubmissionPgRow>(
      `SELECT id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
              monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
              submitted_at, updated_at
       FROM quote_submissions
       WHERE id = $1
       FOR UPDATE`,
      [submissionId],
    );

    if (!current[0]) throw new Error(`Quote submission ${submissionId} not found`);
    const fromStage = current[0].stage as QuoteSubmissionStage;

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[fromStage] ?? [];
    if (!allowed.includes(toStage)) {
      throw new Error(`Invalid stage transition: ${fromStage} → ${toStage}`);
    }

    // Update stage
    const { rows: updated } = await db.query<_QuoteSubmissionPgRow>(
      `UPDATE quote_submissions
       SET stage = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
                 monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
                 submitted_at, updated_at`,
      [toStage, submissionId],
    );

    // Insert stage history
    await db.query(
      `INSERT INTO quote_submission_stage_history
         (submission_id, from_stage, to_stage, actor, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [submissionId, fromStage, toStage, actor, note ?? null],
    );

    const submission = rowToSubmission(updated[0]!);
    _setInMemory(submission);
    return submission;
  } catch (err) {
    if (isConnectionError(err)) {
      // In-memory fallback: look up by ID (scans the memory store)
      const found = await getSubmissionById(submissionId);
      if (!found) throw new Error(`Quote submission ${submissionId} not found`);

      const fromStage = found.stage;
      const allowed = ALLOWED_TRANSITIONS[fromStage] ?? [];
      if (!allowed.includes(toStage)) {
        throw new Error(`Invalid stage transition: ${fromStage} → ${toStage}`);
      }

      const updated: QuoteSubmission = {
        ...found,
        stage: toStage,
        updatedAt: new Date(),
      };
      _setInMemory(updated);
      return updated;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// attachNoaEnvelope
// ---------------------------------------------------------------------------

export async function attachNoaEnvelope(
  input: { submissionId: string; envelopeId: string },
  opts?: { pool?: Pool },
): Promise<QuoteSubmission> {
  const { submissionId, envelopeId } = input;

  try {
    const db = opts?.pool ?? defaultPool();
    const { rows } = await db.query<_QuoteSubmissionPgRow>(
      `UPDATE quote_submissions
       SET noa_envelope_id = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
                 monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
                 submitted_at, updated_at`,
      [envelopeId, submissionId],
    );
    if (!rows[0]) throw new Error(`Quote submission ${submissionId} not found`);
    const submission = rowToSubmission(rows[0]);
    _setInMemory(submission);
    return submission;
  } catch (err) {
    if (isConnectionError(err)) {
      const found = await getSubmissionById(submissionId);
      if (!found) throw new Error(`Quote submission ${submissionId} not found`);
      const updated: QuoteSubmission = { ...found, noaEnvelopeId: envelopeId, updatedAt: new Date() };
      _setInMemory(updated);
      return updated;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// markActive — after NOA signed, attach FoR id
// ---------------------------------------------------------------------------

export async function markActive(
  input: { submissionId: string; factorOfRecordId: string },
  opts?: { pool?: Pool },
): Promise<QuoteSubmission> {
  const { submissionId, factorOfRecordId } = input;

  try {
    const db = opts?.pool ?? defaultPool();
    const { rows } = await db.query<_QuoteSubmissionPgRow>(
      `UPDATE quote_submissions
       SET factor_of_record_id = $1, stage = 'active', updated_at = now()
       WHERE id = $2
       RETURNING id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
                 monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
                 submitted_at, updated_at`,
      [factorOfRecordId, submissionId],
    );
    if (!rows[0]) throw new Error(`Quote submission ${submissionId} not found`);

    // Write history row
    await db.query(
      `INSERT INTO quote_submission_stage_history
         (submission_id, from_stage, to_stage, actor, note)
       VALUES ($1, $2, 'active', 'system', 'NOA signed — FoR created')`,
      [submissionId, rows[0].stage],
    );

    const submission = rowToSubmission(rows[0]);
    _setInMemory(submission);
    return submission;
  } catch (err) {
    if (isConnectionError(err)) {
      const found = await getSubmissionById(submissionId);
      if (!found) throw new Error(`Quote submission ${submissionId} not found`);
      const updated: QuoteSubmission = {
        ...found,
        factorOfRecordId,
        stage: 'active',
        updatedAt: new Date(),
      };
      _setInMemory(updated);
      return updated;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// transitionSubmissionStage — webhook-callable helper that also writes history
// (used by the signature webhook route on envelope.completed)
// ---------------------------------------------------------------------------

export async function transitionSubmissionStageByDotSlug(
  opts: {
    pool: Pool;
    carrierDot: string;
    factorSlug: string;
    toStage: QuoteSubmissionStage;
    actor: string;
    note?: string;
    factorOfRecordId?: string;
  },
): Promise<void> {
  const { pool: db, carrierDot, factorSlug, toStage, actor, note, factorOfRecordId } = opts;

  const { rows: current } = await db.query<{ id: string; stage: string }>(
    `SELECT id, stage FROM quote_submissions WHERE carrier_dot = $1 AND factor_slug = $2 LIMIT 1`,
    [carrierDot, factorSlug],
  );

  if (!current[0]) return; // No submission found — skip (pre-submission webhook edge case)

  const fromStage = current[0].stage as QuoteSubmissionStage;
  const submissionId = current[0].id;

  const setClause = factorOfRecordId
    ? `stage = $1, factor_of_record_id = $2, updated_at = now()`
    : `stage = $1, updated_at = now()`;

  const queryParams = factorOfRecordId
    ? [toStage, factorOfRecordId, submissionId]
    : [toStage, submissionId];

  const whereIdx = factorOfRecordId ? 3 : 2;

  await db.query(
    `UPDATE quote_submissions SET ${setClause} WHERE id = $${whereIdx}`,
    queryParams,
  );

  await db.query(
    `INSERT INTO quote_submission_stage_history
       (submission_id, from_stage, to_stage, actor, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [submissionId, fromStage, toStage, actor, note ?? null],
  );
}

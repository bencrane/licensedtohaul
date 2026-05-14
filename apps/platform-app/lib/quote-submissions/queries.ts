import { Pool } from 'pg';
import type { QuoteSubmission, _QuoteSubmissionPgRow } from './types';
import { rowToSubmission } from './types';

// ---------------------------------------------------------------------------
// In-memory fallback store (used when LTH_DB_POOLED_URL is absent)
// ---------------------------------------------------------------------------

const _memoryStore = new Map<string, QuoteSubmission>();

function memKey(carrierDot: string, factorSlug: string): string {
  return `${carrierDot}:${factorSlug}`;
}

/** Read from in-memory store — used by both DB-fallback and direct in-memory ops */
export function _getFromMemory(carrierDot: string, factorSlug: string): QuoteSubmission | null {
  return _memoryStore.get(memKey(carrierDot, factorSlug)) ?? null;
}

export function _setInMemory(submission: QuoteSubmission): void {
  _memoryStore.set(memKey(submission.carrierDot, submission.factorSlug), submission);
}

export function _getOpenSubmissionsFromMemory(carrierDot: string): QuoteSubmission[] {
  return Array.from(_memoryStore.values()).filter(
    (s) =>
      s.carrierDot === carrierDot &&
      s.stage !== 'declined' &&
      s.stage !== 'offboarded',
  );
}

export function _getOpenSubmissionsForFactorFromMemory(factorSlug: string): QuoteSubmission[] {
  return Array.from(_memoryStore.values()).filter(
    (s) =>
      s.factorSlug === factorSlug &&
      s.stage !== 'declined' &&
      s.stage !== 'offboarded',
  );
}

/** Clear memory store — for tests only */
export function _clearMemoryStore(): void {
  _memoryStore.clear();
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function isConnectionError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const code = (err as { code?: string }).code;
    // PG connection-class error codes start with 08
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
// Query functions
// ---------------------------------------------------------------------------

export async function getSubmission(
  carrierDot: string,
  factorSlug: string,
  opts?: { pool?: Pool },
): Promise<QuoteSubmission | null> {
  try {
    const db = opts?.pool ?? defaultPool();
    const { rows } = await db.query<_QuoteSubmissionPgRow>(
      `SELECT id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
              monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
              submitted_at, updated_at
       FROM quote_submissions
       WHERE carrier_dot = $1 AND factor_slug = $2
       LIMIT 1`,
      [carrierDot, factorSlug],
    );
    if (rows[0]) {
      const sub = rowToSubmission(rows[0]);
      _setInMemory(sub); // keep in-memory mirror warm
      return sub;
    }
    return null;
  } catch (err) {
    if (isConnectionError(err)) {
      return _getFromMemory(carrierDot, factorSlug);
    }
    throw err;
  }
}

export async function getOpenSubmissionsForCarrier(
  carrierDot: string,
  opts?: { pool?: Pool },
): Promise<QuoteSubmission[]> {
  try {
    const db = opts?.pool ?? defaultPool();
    const { rows } = await db.query<_QuoteSubmissionPgRow>(
      `SELECT id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
              monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
              submitted_at, updated_at
       FROM quote_submissions
       WHERE carrier_dot = $1
         AND stage NOT IN ('declined', 'offboarded')
       ORDER BY updated_at DESC`,
      [carrierDot],
    );
    return rows.map(rowToSubmission);
  } catch (err) {
    if (isConnectionError(err)) {
      return _getOpenSubmissionsFromMemory(carrierDot);
    }
    throw err;
  }
}

export async function getOpenSubmissionsForFactor(
  factorSlug: string,
  opts?: { pool?: Pool },
): Promise<QuoteSubmission[]> {
  try {
    const db = opts?.pool ?? defaultPool();
    const { rows } = await db.query<_QuoteSubmissionPgRow>(
      `SELECT id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
              monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
              submitted_at, updated_at
       FROM quote_submissions
       WHERE factor_slug = $1
         AND stage NOT IN ('declined', 'offboarded')
       ORDER BY submitted_at DESC`,
      [factorSlug],
    );
    return rows.map(rowToSubmission);
  } catch (err) {
    if (isConnectionError(err)) {
      return _getOpenSubmissionsForFactorFromMemory(factorSlug);
    }
    throw err;
  }
}

export async function getSubmissionById(
  id: string,
  opts?: { pool?: Pool },
): Promise<QuoteSubmission | null> {
  try {
    const db = opts?.pool ?? defaultPool();
    const { rows } = await db.query<_QuoteSubmissionPgRow>(
      `SELECT id, carrier_dot, factor_slug, quote_id, stage, rate, recourse_label, funding_speed,
              monthly_minimum, notes, fields_shared, noa_envelope_id, factor_of_record_id,
              submitted_at, updated_at
       FROM quote_submissions
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    if (rows[0]) return rowToSubmission(rows[0]);
    return null;
  } catch (err) {
    if (isConnectionError(err)) {
      // Search memory by id
      for (const sub of _memoryStore.values()) {
        if (sub.id === id) return sub;
      }
      return null;
    }
    throw err;
  }
}

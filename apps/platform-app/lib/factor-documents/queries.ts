import { Pool } from 'pg';
import type {
  FactorDocumentRow,
  FactorPartnerConfigRow,
  DocumentState,
} from './types';

// ---------------------------------------------------------------------------
// DB connection (lazy singleton)
// ---------------------------------------------------------------------------
function getPool(): Pool | null {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) return null;
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null | undefined;
function pool(): Pool | null {
  if (_pool === undefined) _pool = getPool();
  return _pool;
}

// ---------------------------------------------------------------------------
// In-memory fallback (process-local singleton)
// ---------------------------------------------------------------------------
const _memDocs = new Map<string, FactorDocumentRow>();
const _memConfig = new Map<string, FactorPartnerConfigRow>();

export function _memSetDocument(doc: FactorDocumentRow): void {
  _memDocs.set(doc.id, doc);
}

export function _memSetConfig(config: FactorPartnerConfigRow): void {
  _memConfig.set(config.factor_slug, config);
}

export function _memClear(): void {
  _memDocs.clear();
  _memConfig.clear();
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getDocumentsForCarrier(
  dot: string,
  factorSlug?: string,
): Promise<FactorDocumentRow[]> {
  const db = pool();
  if (db) {
    try {
      const params: unknown[] = [dot];
      let sql = `SELECT * FROM factor_documents WHERE carrier_dot = $1`;
      if (factorSlug) {
        sql += ` AND factor_slug = $2`;
        params.push(factorSlug);
      }
      sql += ` ORDER BY updated_at DESC`;
      const { rows } = await db.query<FactorDocumentRow>(sql, params);
      return rows;
    } catch {
      // fall through to in-memory
    }
  }
  const all = Array.from(_memDocs.values()).filter(
    (d) => d.carrier_dot === dot && (!factorSlug || d.factor_slug === factorSlug),
  );
  return all.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
}

export async function getDocumentsForFactor(
  slug: string,
  carrierDot?: string,
): Promise<FactorDocumentRow[]> {
  const db = pool();
  if (db) {
    try {
      const params: unknown[] = [slug];
      let sql = `SELECT * FROM factor_documents WHERE factor_slug = $1`;
      if (carrierDot) {
        sql += ` AND carrier_dot = $2`;
        params.push(carrierDot);
      }
      sql += ` ORDER BY updated_at DESC`;
      const { rows } = await db.query<FactorDocumentRow>(sql, params);
      return rows;
    } catch {
      // fall through to in-memory
    }
  }
  const all = Array.from(_memDocs.values()).filter(
    (d) => d.factor_slug === slug && (!carrierDot || d.carrier_dot === carrierDot),
  );
  return all.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
}

export async function getDocumentById(id: string): Promise<FactorDocumentRow | null> {
  const db = pool();
  if (db) {
    try {
      const { rows } = await db.query<FactorDocumentRow>(
        `SELECT * FROM factor_documents WHERE id = $1 LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    } catch {
      // fall through
    }
  }
  return _memDocs.get(id) ?? null;
}

export async function getDocumentByDocumensoId(
  documentId: string,
): Promise<FactorDocumentRow | null> {
  const db = pool();
  if (db) {
    try {
      const { rows } = await db.query<FactorDocumentRow>(
        `SELECT * FROM factor_documents WHERE documenso_document_id = $1 LIMIT 1`,
        [documentId],
      );
      return rows[0] ?? null;
    } catch {
      // fall through
    }
  }
  for (const doc of _memDocs.values()) {
    if (doc.documenso_document_id === documentId) return doc;
  }
  return null;
}

export async function getPendingForCarrier(dot: string): Promise<FactorDocumentRow[]> {
  const pendingStates: DocumentState[] = ['sent', 'opened', 'signed_by_carrier'];
  const db = pool();
  if (db) {
    try {
      const { rows } = await db.query<FactorDocumentRow>(
        `SELECT * FROM factor_documents
         WHERE carrier_dot = $1 AND state = ANY($2::text[])
         ORDER BY updated_at DESC`,
        [dot, pendingStates],
      );
      return rows;
    } catch {
      // fall through
    }
  }
  return Array.from(_memDocs.values()).filter(
    (d) => d.carrier_dot === dot && (pendingStates as string[]).includes(d.state),
  );
}

export async function getPendingForFactor(slug: string): Promise<FactorDocumentRow[]> {
  const pendingStates: DocumentState[] = ['sent', 'opened', 'signed_by_carrier'];
  const db = pool();
  if (db) {
    try {
      const { rows } = await db.query<FactorDocumentRow>(
        `SELECT * FROM factor_documents
         WHERE factor_slug = $1 AND state = ANY($2::text[])
         ORDER BY updated_at DESC`,
        [slug, pendingStates],
      );
      return rows;
    } catch {
      // fall through
    }
  }
  return Array.from(_memDocs.values()).filter(
    (d) => d.factor_slug === slug && (pendingStates as string[]).includes(d.state),
  );
}

export async function getPartnerConfig(
  slug: string,
): Promise<FactorPartnerConfigRow | null> {
  const db = pool();
  if (db) {
    try {
      const { rows } = await db.query<FactorPartnerConfigRow>(
        `SELECT * FROM factor_partner_config WHERE factor_slug = $1 LIMIT 1`,
        [slug],
      );
      return rows[0] ?? null;
    } catch {
      // fall through
    }
  }
  return _memConfig.get(slug) ?? null;
}

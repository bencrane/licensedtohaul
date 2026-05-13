'use server';

import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { getSignatureProvider, resetSignatureProvider } from '@/lib/signature/index';
import { getFactorDisplayName } from './types';
import { writeAuditLog } from './queries';

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

export interface InitiateNoaInput {
  carrierDot: string;
  factorSlug: string;
  loadId?: string;
}

export interface InitiateNoaResult {
  envelopeId: string;
  signUrl: string;
}

export async function initiateNoaSignature(
  input: InitiateNoaInput,
  opts?: { pool?: Pool },
): Promise<InitiateNoaResult> {
    const db = opts?.pool ?? defaultPool();
  const provider = getSignatureProvider();

  const externalId = randomUUID();
  const factorDisplayName = getFactorDisplayName(input.factorSlug);

  // Create envelope via provider
  const result = await provider.createEnvelope({
    externalId,
    subject: `Notice of Assignment — ${factorDisplayName}`,
    signers: [
      {
        role: 'carrier',
        name: `Carrier DOT ${input.carrierDot}`,
        email: `carrier-${input.carrierDot}@example.test`,
      },
    ],
    mode: 'embedded',
  });

  // Persist envelope row
  const { rows: envRows } = await db.query<{ id: string }>(
    `INSERT INTO noa_envelopes
       (external_id, carrier_dot, factor_slug, load_id, provider, provider_envelope_id, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      externalId,
      input.carrierDot,
      input.factorSlug,
      input.loadId ?? null,
      provider.name,
      result.providerEnvelopeId,
      result.status,
    ],
  );
  const envelopeRowId = envRows[0]!.id;

  // Write audit log
  await writeAuditLog(
    {
      carrierDot: input.carrierDot,
      factorSlug: input.factorSlug,
      event: 'noa.initiated',
      payload: {
        envelope_id: externalId,
        provider: provider.name,
        provider_envelope_id: result.providerEnvelopeId,
      },
      noaEnvelopeId: envelopeRowId,
    },
    { pool: db },
  );

  const signUrl = result.signUrls['carrier'] ?? '';
  return { envelopeId: externalId, signUrl };
}

export { resetSignatureProvider };

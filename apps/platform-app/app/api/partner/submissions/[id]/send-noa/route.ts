import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getSubmissionById } from '@/lib/quote-submissions/queries';
import { transitionStage, attachNoaEnvelope } from '@/lib/quote-submissions/actions';
import { initiateNoaSignature } from '@/lib/factor-of-record/actions';

export const dynamic = 'force-dynamic';

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error('LTH_DB_POOLED_URL not set');
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const submission = await getSubmissionById(id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.stage !== 'approved') {
      return NextResponse.json(
        { error: `Cannot send NOA from stage: ${submission.stage}. Must be 'approved'.` },
        { status: 400 },
      );
    }

    let opts: { pool?: Pool } = {};
    try {
      opts = { pool: pool() };
    } catch {
      opts = {};
    }

    // Initiate NOA signature via Documenso (provider-agnostic)
    const { envelopeId, signUrl } = await initiateNoaSignature(
      {
        carrierDot: submission.carrierDot,
        factorSlug: submission.factorSlug,
      },
      opts,
    );

    // Attach envelope to submission
    await attachNoaEnvelope({ submissionId: id, envelopeId });

    // Transition stage to noa_sent
    const updated = await transitionStage({
      submissionId: id,
      toStage: 'noa_sent',
      actor: 'factor',
      note: 'NOA sent via partner action',
    });

    return NextResponse.json({
      submissionId: id,
      envelopeId,
      signUrl,
      stage: updated.stage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'internal server error';
    console.error('POST /api/partner/submissions/[id]/send-noa error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

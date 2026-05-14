import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { submitQuote } from '@/lib/quote-submissions/actions';
import { pushInboxMessage } from '@/lib/inbox-store';

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

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
      dot: string;
      factorSlug: string;
      quoteId: string;
      rate: string;
      recourseLabel: string;
      fundingSpeed: string;
      monthlyMinimum?: string;
      notes?: string;
      fieldsShared?: string[];
      factorName?: string;
    };

    const { dot, factorSlug, quoteId, rate, recourseLabel, fundingSpeed, monthlyMinimum, notes, fieldsShared, factorName } = body;

    if (!dot || !factorSlug || !quoteId || !rate || !recourseLabel || !fundingSpeed) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Attempt to get pool (may fail if DB not configured)
    let opts: { pool?: Pool } = {};
    try {
      opts = { pool: pool() };
    } catch {
      // No DB — will use in-memory fallback in submitQuote
      opts = {};
    }

    const submission = await submitQuote(
      {
        carrierDot: dot,
        factorSlug,
        quoteId,
        rate,
        recourseLabel,
        fundingSpeed,
        monthlyMinimum,
        notes,
        fieldsShared,
      },
      opts,
    );

    // Ensure deal_room_threads row exists (best-effort, non-fatal)
    if (opts.pool) {
      try {
        await opts.pool.query(
          `INSERT INTO deal_room_threads (carrier_dot, factor_slug)
           VALUES ($1, $2)
           ON CONFLICT (carrier_dot, factor_slug) DO NOTHING`,
          [dot, factorSlug],
        );
      } catch {
        // Non-fatal: threads table may not exist in preview
      }
    }

    // Push inbox message
    pushInboxMessage(dot, factorName ?? factorSlug, quoteId, factorSlug);

    const dealRoomUrl = `/dashboard/${dot}/financing/${factorSlug}`;

    return NextResponse.json({
      submissionId: submission.id,
      dealRoomUrl,
      stage: submission.stage,
    });
  } catch (err) {
    console.error('submit-quote error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

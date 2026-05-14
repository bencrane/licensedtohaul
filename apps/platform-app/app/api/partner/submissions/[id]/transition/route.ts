import { NextResponse } from 'next/server';
import { transitionStage } from '@/lib/quote-submissions/actions';
import type { QuoteSubmissionStage } from '@/lib/quote-submissions/types';
import { ALLOWED_TRANSITIONS } from '@/lib/quote-submissions/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json() as { toStage: QuoteSubmissionStage; note?: string };
    const { toStage, note } = body;

    if (!toStage) {
      return NextResponse.json({ error: 'Missing toStage' }, { status: 400 });
    }

    // Validate toStage is a known stage
    const knownStages = Object.keys(ALLOWED_TRANSITIONS);
    if (!knownStages.includes(toStage)) {
      return NextResponse.json({ error: `Unknown stage: ${toStage}` }, { status: 400 });
    }

    const updated = await transitionStage({
      submissionId: id,
      toStage,
      actor: 'factor',
      note,
    });

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'internal server error';
    if (msg.includes('Invalid stage transition') || msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('POST /api/partner/submissions/[id]/transition error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

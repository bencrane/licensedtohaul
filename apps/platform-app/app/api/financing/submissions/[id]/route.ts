import { NextResponse } from 'next/server';
import { getSubmissionById } from '@/lib/quote-submissions/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const submission = await getSubmissionById(id);
    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(submission);
  } catch (err) {
    console.error('GET /api/financing/submissions/[id] error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { markVoided } from '@/lib/factor-documents/actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Props): Promise<Response> {
  try {
    const { id } = await params;
    const body = (await req.json()) as { reason?: string };

    const updated = await markVoided({ documentId: id, reason: body.reason });
    if (!updated) {
      return NextResponse.json({ error: 'document not found' }, { status: 404 });
    }
    return NextResponse.json({ document: updated });
  } catch (err) {
    console.error('POST /api/partner/documents/[id]/void error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

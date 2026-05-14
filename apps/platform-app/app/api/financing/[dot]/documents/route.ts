import { NextResponse } from 'next/server';
import { getDocumentsForCarrier } from '@/lib/factor-documents/queries';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ dot: string }> };

export async function GET(req: Request, { params }: Props): Promise<Response> {
  try {
    const { dot } = await params;
    const url = new URL(req.url);
    const factorSlug = url.searchParams.get('factorSlug') ?? undefined;

    const documents = await getDocumentsForCarrier(dot, factorSlug);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('GET /api/financing/[dot]/documents error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

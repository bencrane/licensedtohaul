import { NextResponse } from 'next/server';
import { getDocumentsForFactor } from '@/lib/factor-documents/queries';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Props): Promise<Response> {
  try {
    const { slug } = await params;
    const url = new URL(req.url);
    const carrierDot = url.searchParams.get('carrierDot') ?? undefined;

    const documents = await getDocumentsForFactor(slug, carrierDot);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('GET /api/partner/[slug]/documents error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getOpenSubmissionsForFactor } from '@/lib/quote-submissions/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Missing ?slug=' }, { status: 400 });
    }

    const submissions = await getOpenSubmissionsForFactor(slug);
    return NextResponse.json(submissions);
  } catch (err) {
    console.error('GET /api/partner/submissions error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

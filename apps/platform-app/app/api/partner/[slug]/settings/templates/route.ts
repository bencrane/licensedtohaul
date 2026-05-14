import { NextResponse } from 'next/server';
import { savePartnerConfig } from '@/lib/factor-documents/actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props): Promise<Response> {
  try {
    const { slug } = await params;
    const body = (await req.json()) as {
      noa?: string | null;
      masterAgreement?: string | null;
      addendum?: string | null;
      sideLetter?: string | null;
    };

    const config = await savePartnerConfig({
      factorSlug: slug,
      templateIds: {
        noa: body.noa,
        masterAgreement: body.masterAgreement,
        addendum: body.addendum,
        sideLetter: body.sideLetter,
      },
    });

    return NextResponse.json({ config });
  } catch (err) {
    console.error('POST /api/partner/[slug]/settings/templates error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

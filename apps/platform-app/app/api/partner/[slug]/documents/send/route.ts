import { NextResponse } from 'next/server';
import { sendDocument } from '@/lib/factor-documents/actions';
import { getPartnerConfig } from '@/lib/factor-documents/queries';
import { templateIdColumnForKind } from '@/lib/factor-documents/types';
import type { DocumentKind } from '@/lib/factor-documents/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props): Promise<Response> {
  try {
    const { slug } = await params;

    const body = (await req.json()) as {
      carrierDot?: string;
      carrierEmail?: string;
      carrierName?: string;
      factorEmail?: string;
      factorName?: string;
      documentKind?: DocumentKind;
      notes?: string;
      carrierRecipientId?: number;
      factorRecipientId?: number;
    };

    const { carrierDot, carrierEmail, documentKind } = body;

    if (!carrierDot || !carrierEmail || !documentKind) {
      return NextResponse.json(
        { error: 'carrierDot, carrierEmail, and documentKind are required' },
        { status: 400 },
      );
    }

    // Check template ID configured
    const config = await getPartnerConfig(slug);
    const col = templateIdColumnForKind(documentKind);
    const templateId = col ? (config?.[col] ?? null) : null;

    if (!templateId) {
      return NextResponse.json(
        {
          error: `No template ID configured for document kind '${documentKind}' on factor '${slug}'. Configure template IDs in Settings.`,
        },
        { status: 422 },
      );
    }

    const result = await sendDocument({
      factorSlug: slug,
      carrierDot,
      carrierEmail,
      carrierName: body.carrierName,
      factorEmail: body.factorEmail,
      factorName: body.factorName,
      documentKind,
      notes: body.notes,
      carrierRecipientId: body.carrierRecipientId,
      factorRecipientId: body.factorRecipientId,
    });

    const documensoAppUrl =
      (process.env.DOCUMENSO_API_URL ?? 'https://app.documenso.com').replace(/\/$/, '');
    const dealRoomUrl = result.signingTokens.carrier
      ? `${documensoAppUrl}/sign/${result.signingTokens.carrier}`
      : null;

    return NextResponse.json({
      documentId: result.documentId,
      dealRoomUrl,
      signingTokens: result.signingTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal server error';
    console.error('POST /api/partner/[slug]/documents/send error:', err);
    if (message.includes('No template ID configured')) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

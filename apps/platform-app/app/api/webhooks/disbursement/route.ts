import { NextResponse } from 'next/server';
import { verifyDisbursementHmac } from '@/lib/disbursements/hmac';
import { recordDisbursement } from '@/lib/disbursements/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.DISBURSEMENT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'missing DISBURSEMENT_WEBHOOK_SECRET in Doppler' },
      { status: 503 },
    );
  }

  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    const incomingSignature =
      req.headers.get('x-disbursement-signature') ?? req.headers.get('X-Disbursement-Signature') ?? '';

    if (!verifyDisbursementHmac(rawBody, incomingSignature, secret)) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody.toString('utf-8')) as {
      factorSlug?: string;
      carrierDot?: string;
      amount?: number;
      disbursedAt?: string;
      referenceId?: string;
    };

    if (!body.factorSlug || !body.carrierDot || !body.amount || !body.disbursedAt) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const { disbursementId } = await recordDisbursement({
      factorSlug: body.factorSlug,
      carrierDot: body.carrierDot,
      amount: body.amount,
      disbursedAt: body.disbursedAt,
      referenceId: body.referenceId,
      source: 'webhook',
    });

    return NextResponse.json({ ok: true, disbursementId });
  } catch (err) {
    console.error('webhooks/disbursement error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { sendDealRoomMessage } from '@/lib/deal-room/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
      carrierDot?: string;
      factorSlug?: string;
      body?: string;
      senderSide?: 'carrier' | 'partner';
    };

    if (!body.carrierDot || !body.factorSlug || !body.body || !body.senderSide) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const message = await sendDealRoomMessage({
      carrierDot: body.carrierDot,
      factorSlug: body.factorSlug,
      body: body.body,
      senderSide: body.senderSide,
    });

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    console.error('api/deal-room/messages error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

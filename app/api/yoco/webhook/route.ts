import { NextResponse } from "next/server";
import { markDepositPaid } from "@/lib/store";

/**
 * Yoco webhook receiver. When YOCO_SECRET_KEY is configured and a real
 * hosted checkout completes, Yoco POSTs a payment event here and we
 * transition the booking to confirmed (deposit HELD).
 *
 * SECURITY TODO before go-live (non-negotiable):
 * 1. Register the webhook in the Yoco dashboard and store the webhook
 *    secret in YOCO_WEBHOOK_SECRET.
 * 2. Verify the webhook signature headers per Yoco's current docs and
 *    reject anything that doesn't verify. Without this, anyone who can
 *    reach this URL can mark bookings as paid.
 */
export async function POST(req: Request) {
  if (!process.env.YOCO_SECRET_KEY) {
    return NextResponse.json({ error: "Yoco not configured" }, { status: 400 });
  }
  if (!process.env.YOCO_WEBHOOK_SECRET) {
    // Refuse to process unverifiable payment events.
    return NextResponse.json({ error: "Webhook secret not configured — refusing unverified events" }, { status: 400 });
  }

  // TODO: implement HMAC signature verification against YOCO_WEBHOOK_SECRET
  // using the webhook-id / webhook-timestamp / webhook-signature headers,
  // per https://developer.yoco.com webhook docs. Fail closed.
  const verified = false;
  if (!verified) {
    return NextResponse.json({ error: "Signature verification not yet implemented — failing closed" }, { status: 501 });
  }

  const event = (await req.json()) as {
    type?: string;
    payload?: { metadata?: { bookingId?: string }; id?: string };
  };

  if (event.type === "payment.succeeded" && event.payload?.metadata?.bookingId) {
    await markDepositPaid(event.payload.metadata.bookingId, event.payload.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, ignored: true });
}

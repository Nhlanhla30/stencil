/* ============================================================
   Yoco Checkout integration.

   Two modes:
   - YOCO_SECRET_KEY set   -> creates a real hosted checkout via
     Yoco's Checkout API and redirects the client there. Payment
     confirmation arrives on the webhook route.
   - No key (default)      -> "simulate" mode: /pay/[id] shows a
     mock checkout with a Pay button so the whole flow can be
     demoed end-to-end with zero setup.

   Docs: https://developer.yoco.com/ (Checkout API)
   NOTE: verify request/response fields against current Yoco docs
   before going live — treat this as scaffolding, not gospel.
   ============================================================ */

export interface CheckoutResult {
  mode: "yoco" | "simulate";
  redirectUrl: string;
  checkoutId?: string;
}

export function yocoConfigured(): boolean {
  return Boolean(process.env.YOCO_SECRET_KEY);
}

export async function createDepositCheckout(opts: {
  bookingId: string;
  amountRand: number; // deposit + booking fee
  baseUrl: string; // e.g. https://stencil.vercel.app
}): Promise<CheckoutResult> {
  const successUrl = `${opts.baseUrl}/b/${opts.bookingId}?paid=1`;
  const cancelUrl = `${opts.baseUrl}/pay/${opts.bookingId}`;

  if (!yocoConfigured()) {
    // Simulate mode: our own /pay page acts as the checkout
    return { mode: "simulate", redirectUrl: `/pay/${opts.bookingId}` };
  }

  const res = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
    },
    body: JSON.stringify({
      amount: Math.round(opts.amountRand * 100), // cents
      currency: "ZAR",
      successUrl,
      cancelUrl,
      metadata: { bookingId: opts.bookingId },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yoco checkout failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { id: string; redirectUrl: string };
  return { mode: "yoco", redirectUrl: data.redirectUrl, checkoutId: data.id };
}

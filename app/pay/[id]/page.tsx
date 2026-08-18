import { notFound, redirect } from "next/navigation";
import { simulatePayDeposit } from "@/app/actions";
import { getArtistById, getBooking } from "@/lib/store";
import { createDepositCheckout, yocoConfigured } from "@/lib/yoco";

export default async function PayPage({ params }: { params: { id: string } }) {
  const booking = await getBooking(params.id);
  if (!booking) notFound();
  const artist = await getArtistById(booking.artistId);
  if (!artist) notFound();

  if (booking.status !== "awaiting_deposit") {
    redirect(`/b/${booking.id}`);
  }

  const total = booking.deposit.amount + booking.deposit.bookingFee;

  // With a real Yoco key configured, hand off to Yoco's hosted checkout.
  if (yocoConfigured()) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const checkout = await createDepositCheckout({ bookingId: booking.id, amountRand: total, baseUrl });
    redirect(checkout.redirectUrl);
  }

  // Simulate mode: mock checkout so the full flow demos with zero setup.
  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <div className="flash-card p-7">
        <span className="tick-b" />
        <div className="font-mono text-xs tracking-widest text-inksoft">SECURE CHECKOUT · SIMULATED</div>
        <h1 className="mt-2 font-head text-3xl font-extrabold uppercase">Protected deposit</h1>
        <div className="mt-4 text-sm leading-relaxed">
          <strong>{booking.type}</strong> with <strong>{artist.name}</strong>
          <br />
          {booking.preferredSlot}
        </div>

        <div className="mt-5 border-2 border-stencil bg-stencilsoft p-4 font-mono text-sm">
          <div className="flex justify-between"><span>Deposit (escrow)</span><strong>R{booking.deposit.amount}</strong></div>
          <div className="mt-1 flex justify-between"><span>Booking fee</span><strong>R{booking.deposit.bookingFee}</strong></div>
          <div className="mt-2 flex justify-between border-t border-stencil pt-2 text-stencil"><strong>Total</strong><strong>R{total}</strong></div>
        </div>

        <ul className="mt-5 list-disc pl-5 text-xs leading-relaxed text-inksoft">
          <li>Held by Stencil and released to the artist automatically 48 hours after your session.</li>
          <li>Artist cancels? Automatic full refund, same day.</li>
          <li>You cancel inside 72 hours? The deposit goes to the artist.</li>
        </ul>

        <form action={simulatePayDeposit} className="mt-6">
          <input type="hidden" name="bookingId" value={booking.id} />
          <button type="submit" className="btn-ink w-full">Pay R{total} · Card / Yoco / SnapScan</button>
        </form>
        <p className="mt-3 text-center font-mono text-[10px] text-inksoft">
          Set YOCO_SECRET_KEY to switch this to a real Yoco hosted checkout.
        </p>
      </div>
    </div>
  );
}

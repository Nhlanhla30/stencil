import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistById, getBooking } from "@/lib/store";
import type { BookingStatus } from "@/lib/types";

const STATUS_COPY: Record<BookingStatus, { title: string; body: string; tone: string }> = {
  requested: {
    title: "Request sent",
    body: "Your request is with the artist. You'll be able to pay the deposit here once they accept — no money moves until then.",
    tone: "text-inksoft",
  },
  declined: {
    title: "Request declined",
    body: "The artist can't take this one on. No payment was made. Browse other artists to find a fit.",
    tone: "text-flashred",
  },
  awaiting_deposit: {
    title: "Accepted — deposit due",
    body: "The artist accepted your request. Pay the deposit and Stencil holds it automatically — your slot is locked the moment payment clears.",
    tone: "text-stencil",
  },
  confirmed: {
    title: "Booked & protected",
    body: "Your deposit is held safely in Stencil escrow and releases to the artist automatically 48 hours after your session. If the artist cancels, it refunds the same day.",
    tone: "text-flashgreen",
  },
  completed: {
    title: "Session complete",
    body: "Hope you love it. Your deposit has been released to the artist and was deducted from your session price.",
    tone: "text-flashgreen",
  },
  cancelled_by_artist: {
    title: "Cancelled by artist — refunded",
    body: "The artist cancelled this booking. Your full deposit has been automatically refunded.",
    tone: "text-flashred",
  },
  cancelled_by_client_late: {
    title: "Cancelled inside 72 hours",
    body: "Per the cancellation terms you accepted, the deposit was paid to the artist for the lost slot.",
    tone: "text-flashred",
  },
  client_no_show: {
    title: "Marked as no-show",
    body: "The artist reported a no-show for this slot. Per the terms, the deposit was paid to the artist.",
    tone: "text-flashred",
  },
};

export default async function BookingStatusPage({ params }: { params: { id: string } }) {
  const booking = await getBooking(params.id);
  if (!booking) notFound();
  const artist = await getArtistById(booking.artistId);
  if (!artist) notFound();

  const copy = STATUS_COPY[booking.status];
  const totalDue = booking.deposit.amount + booking.deposit.bookingFee;

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <div className="flash-card p-7 text-center">
        <span className="tick-b" />
        <div className="font-mono text-xs font-semibold tracking-widest text-stencil">REF {booking.ref}</div>
        <h1 className={`mt-2 font-head text-4xl font-extrabold uppercase ${copy.tone}`}>{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-inksoft">{copy.body}</p>

        <div className="mt-6 border-t-2 border-ink pt-5 text-left text-sm leading-relaxed">
          <div><strong>{booking.type}</strong> with <strong>{artist.name}</strong></div>
          <div>{booking.preferredSlot} · {artist.studio}, {artist.area}</div>
          <div>{booking.size}{booking.placement ? ` · ${booking.placement}` : ""}</div>
        </div>

        {booking.status === "awaiting_deposit" && (
          <div className="mt-6">
            <div className="mb-4 border-2 border-stencil bg-stencilsoft p-4 text-left font-mono text-sm">
              <div className="flex justify-between"><span>Deposit (held in escrow)</span><strong>R{booking.deposit.amount}</strong></div>
              <div className="mt-1 flex justify-between"><span>Stencil booking fee</span><strong>R{booking.deposit.bookingFee}</strong></div>
              <div className="mt-2 flex justify-between border-t border-stencil pt-2 text-stencil"><strong>Due now</strong><strong>R{totalDue}</strong></div>
            </div>
            <Link href={`/pay/${booking.id}`} className="btn-ink w-full text-center">
              Pay R{totalDue} deposit
            </Link>
          </div>
        )}

        {booking.deposit.state === "held" && (
          <div className="mt-5 font-mono text-xs text-flashgreen">● R{booking.deposit.amount} deposit held in escrow</div>
        )}
        {booking.deposit.state === "refunded" && (
          <div className="mt-5 font-mono text-xs text-flashgreen">● R{booking.deposit.amount} refunded to your card</div>
        )}
      </div>

      <p className="mt-6 text-center font-mono text-[11px] text-inksoft">
        Bookmark this page — it&apos;s your booking&apos;s live status. (Accounts &amp; notifications come in v2.)
      </p>
    </div>
  );
}

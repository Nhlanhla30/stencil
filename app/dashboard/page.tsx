import Link from "next/link";
import { dashboardAction } from "@/app/actions";
import { legalActions } from "@/lib/escrow";
import { getArtists, getBookingsForArtist, getLedgerForArtist } from "@/lib/store";
import type { ArtistAction, Booking, BookingStatus } from "@/lib/types";

/* NOTE: No auth in this MVP — the ?as= switcher stands in for login.
   Firebase Auth is the first thing to add before real artists use this. */

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "New request",
  declined: "Declined",
  awaiting_deposit: "Awaiting deposit",
  confirmed: "Confirmed · deposit held",
  completed: "Completed · released",
  cancelled_by_artist: "You cancelled · refunded",
  cancelled_by_client_late: "Late cancel · deposit yours",
  client_no_show: "No-show · deposit yours",
};

const ACTION_LABEL: Record<ArtistAction, string> = {
  accept: "Accept request",
  decline: "Decline",
  complete: "Mark session complete",
  cancel_by_artist: "Cancel booking (refunds client)",
  client_no_show: "Report client no-show",
  client_late_cancel: "Client cancelled (<72h)",
};

const ACTION_STYLE: Record<ArtistAction, string> = {
  accept: "btn-primary",
  decline: "btn-ghost",
  complete: "btn-ink",
  cancel_by_artist: "btn-ghost",
  client_no_show: "btn-ghost",
  client_late_cancel: "btn-ghost",
};

function statusTone(s: BookingStatus): string {
  if (s === "confirmed" || s === "completed") return "text-flashgreen";
  if (s === "requested" || s === "awaiting_deposit") return "text-stencil";
  return "text-flashred";
}

function BookingCard({ b }: { b: Booking }) {
  const actions = legalActions(b.status);
  return (
    <div className="flash-card p-5">
      <span className="tick-b" />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-head text-xl font-extrabold uppercase">{b.client.name}</div>
        <span className={`font-mono text-xs font-semibold ${statusTone(b.status)}`}>{STATUS_LABEL[b.status]}</span>
      </div>
      <div className="mt-1 font-mono text-[11px] text-inksoft">
        {b.ref} · {b.client.phone} · {b.client.email}
      </div>
      <div className="mt-3 text-sm leading-relaxed">
        <strong>{b.type}</strong> · {b.size} · {b.placement || "placement TBC"}
        <br />
        Preferred: {b.preferredSlot}
      </div>
      {b.brief && <p className="mt-2 border-l-2 border-stencil pl-3 text-sm italic text-inksoft">&ldquo;{b.brief}&rdquo;</p>}
      <div className="mt-3 font-mono text-xs text-inksoft">
        Deposit R{b.deposit.amount} — {b.deposit.state === "none" ? "not yet requested" : b.deposit.state}
      </div>
      {b.status === "awaiting_deposit" && (
        <div className="mt-2 font-mono text-[11px] text-stencil">
          Client&apos;s payment link: <Link href={`/b/${b.id}`} className="underline">/b/{b.id}</Link>
        </div>
      )}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((a) => (
            <form key={a} action={dashboardAction}>
              <input type="hidden" name="bookingId" value={b.id} />
              <input type="hidden" name="action" value={a} />
              <button type="submit" className={`${ACTION_STYLE[a]} !px-3 !py-1.5 !text-sm`}>
                {ACTION_LABEL[a]}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: { as?: string } }) {
  const artists = await getArtists();
  const me = artists.find((a) => a.slug === searchParams.as) ?? artists[0];
  const bookings = await getBookingsForArtist(me.id);
  const ledger = await getLedgerForArtist(me.id);

  const requests = bookings.filter((b) => b.status === "requested");
  const active = bookings.filter((b) => b.status === "awaiting_deposit" || b.status === "confirmed");
  const past = bookings.filter((b) => !["requested", "awaiting_deposit", "confirmed"].includes(b.status));

  const inEscrow = bookings.filter((b) => b.deposit.state === "held").reduce((s, b) => s + b.deposit.amount, 0);
  const earned = ledger
    .filter((l) => l.event === "deposit_released" || l.event === "deposit_forfeited")
    .reduce((s, l) => s + l.amount, 0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-head text-4xl font-extrabold uppercase">Artist dashboard</h1>
          <div className="mt-1 text-sm text-inksoft">
            {me.name} · {me.studio} · your booking link:{" "}
            <Link href={`/a/${me.slug}`} className="font-mono text-stencil underline">/a/{me.slug}</Link>
          </div>
        </div>
        <div className="font-mono text-xs text-inksoft">
          Demo login — view as:{" "}
          {artists.map((a) => (
            <Link key={a.id} href={`/dashboard?as=${a.slug}`} className={`ml-2 underline ${a.id === me.id ? "text-stencil" : ""}`}>
              {a.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      </div>

      {/* Money strip */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="flash-card p-4">
          <span className="tick-b" />
          <div className="font-mono text-xs text-inksoft">HELD IN ESCROW</div>
          <div className="font-head text-3xl font-extrabold text-stencil">R{inEscrow}</div>
        </div>
        <div className="flash-card p-4">
          <span className="tick-b" />
          <div className="font-mono text-xs text-inksoft">PAID OUT TO YOU</div>
          <div className="font-head text-3xl font-extrabold text-flashgreen">R{earned}</div>
        </div>
        <div className="flash-card p-4">
          <span className="tick-b" />
          <div className="font-mono text-xs text-inksoft">NEW REQUESTS</div>
          <div className="font-head text-3xl font-extrabold">{requests.length}</div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-head text-2xl font-extrabold uppercase">Requests</h2>
        <p className="mt-1 text-sm text-inksoft">No money moves until you accept. Decline anything that isn&apos;t a fit.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {requests.length === 0 && <p className="font-mono text-sm text-inksoft">No new requests. Share your booking link to fill this up.</p>}
          {requests.map((b) => <BookingCard key={b.id} b={b} />)}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-head text-2xl font-extrabold uppercase">Active bookings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {active.length === 0 && <p className="font-mono text-sm text-inksoft">Nothing active right now.</p>}
          {active.map((b) => <BookingCard key={b.id} b={b} />)}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-head text-2xl font-extrabold uppercase">Money ledger</h2>
        <div className="mt-4 flash-card p-0">
          <span className="tick-b" />
          {ledger.length === 0 ? (
            <p className="p-5 font-mono text-sm text-inksoft">No movements yet.</p>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b-2 border-ink text-inksoft">
                  <th className="p-3">WHEN</th>
                  <th className="p-3">EVENT</th>
                  <th className="p-3">NOTE</th>
                  <th className="p-3 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-b border-inksoft/30">
                    <td className="p-3 text-inksoft">{new Date(l.at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="p-3">{l.event.replace(/_/g, " ")}</td>
                    <td className="p-3 text-inksoft">{l.note}</td>
                    <td className={`p-3 text-right ${l.amount < 0 ? "text-flashred" : "text-flashgreen"}`}>
                      {l.amount < 0 ? "−" : "+"}R{Math.abs(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="font-head text-2xl font-extrabold uppercase">History</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {past.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}

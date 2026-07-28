/* ============================================================
   Escrow state machine.

   Pure functions only — no I/O. Every legal transition is listed
   explicitly; anything not listed throws. This is deliberately
   strict: with other people's money, "unexpected state" must be
   an error, never a silent pass-through.

   Money rules encoded here:
   - Money never moves until the ARTIST accepts a request.
   - Deposit is HELD by Stencil once paid (confirmed booking).
   - completed            -> deposit RELEASES to artist (48h hold window)
   - cancelled_by_artist  -> deposit REFUNDS to client, same day
   - client no-show or
     late cancel (<72h)   -> deposit FORFEITS to artist
   ============================================================ */

import type { ArtistAction, Booking, BookingStatus, LedgerEntry } from "./types";

interface TransitionResult {
  booking: Booking;
  ledger: LedgerEntry[];
}

const HOLD_WINDOW_HOURS = 48;

const uid = () => Math.random().toString(36).slice(2, 10);
const shortRef = () => "ST-" + Math.random().toString(36).slice(2, 7).toUpperCase();

export function newBookingRef(): string {
  return shortRef();
}

/** Which artist actions are legal from each booking status. */
const LEGAL: Record<BookingStatus, ArtistAction[]> = {
  requested: ["accept", "decline"],
  declined: [],
  awaiting_deposit: ["cancel_by_artist"], // artist can still withdraw before money moves
  confirmed: ["complete", "cancel_by_artist", "client_no_show", "client_late_cancel"],
  completed: [],
  cancelled_by_artist: [],
  cancelled_by_client_late: [],
  client_no_show: [],
};

export function legalActions(status: BookingStatus): ArtistAction[] {
  return LEGAL[status];
}

function entry(
  b: Booking,
  event: LedgerEntry["event"],
  amount: number,
  note: string,
  at: number
): LedgerEntry {
  return { id: uid(), bookingId: b.id, bookingRef: b.ref, artistId: b.artistId, at, event, amount, note };
}

/** Client paid the deposit (via Yoco webhook or simulated checkout). */
export function applyDepositPaid(b: Booking, now = Date.now()): TransitionResult {
  if (b.status !== "awaiting_deposit" || b.deposit.state !== "pending") {
    throw new Error(`Deposit payment not expected in status=${b.status}/${b.deposit.state}`);
  }
  const booking: Booking = {
    ...b,
    status: "confirmed",
    deposit: { ...b.deposit, state: "held", paidAt: now },
    updatedAt: now,
  };
  return {
    booking,
    ledger: [
      entry(booking, "deposit_held", b.deposit.amount, `Deposit held in escrow for ${b.ref}`, now),
      entry(booking, "booking_fee_earned", b.deposit.bookingFee, `Stencil booking fee for ${b.ref}`, now),
    ],
  };
}

/** Artist takes an action from the dashboard. */
export function applyArtistAction(b: Booking, action: ArtistAction, now = Date.now()): TransitionResult {
  if (!LEGAL[b.status].includes(action)) {
    throw new Error(`Action "${action}" is not legal from status "${b.status}"`);
  }

  switch (action) {
    case "accept": {
      const booking: Booking = {
        ...b,
        status: "awaiting_deposit",
        deposit: { ...b.deposit, state: "pending" },
        updatedAt: now,
      };
      return { booking, ledger: [] };
    }
    case "decline": {
      return { booking: { ...b, status: "declined", updatedAt: now }, ledger: [] };
    }
    case "complete": {
      const booking: Booking = {
        ...b,
        status: "completed",
        deposit: { ...b.deposit, state: "released", settledAt: now },
        updatedAt: now,
      };
      return {
        booking,
        ledger: [
          entry(
            booking,
            "deposit_released",
            b.deposit.amount,
            `Deposit released to artist (${HOLD_WINDOW_HOURS}h hold window) for ${b.ref}`,
            now
          ),
        ],
      };
    }
    case "cancel_by_artist": {
      const hadMoney = b.deposit.state === "held";
      const booking: Booking = {
        ...b,
        status: "cancelled_by_artist",
        deposit: hadMoney
          ? { ...b.deposit, state: "refunded", settledAt: now }
          : { ...b.deposit, state: "none" },
        updatedAt: now,
      };
      return {
        booking,
        ledger: hadMoney
          ? [entry(booking, "deposit_refunded", -b.deposit.amount, `Artist cancelled — auto-refund for ${b.ref}`, now)]
          : [],
      };
    }
    case "client_no_show":
    case "client_late_cancel": {
      const status: BookingStatus = action === "client_no_show" ? "client_no_show" : "cancelled_by_client_late";
      const reason = action === "client_no_show" ? "Client no-show" : "Client cancelled inside 72h";
      const booking: Booking = {
        ...b,
        status,
        deposit: { ...b.deposit, state: "forfeited", settledAt: now },
        updatedAt: now,
      };
      return {
        booking,
        ledger: [entry(booking, "deposit_forfeited", b.deposit.amount, `${reason} — deposit to artist for ${b.ref}`, now)],
      };
    }
  }
}

/* ------------------------------------------------------------
   Tiny invariant self-check, runnable with:  npx tsx lib/escrow.ts
   (also exercised by the seed data on boot)
   ------------------------------------------------------------ */
export function assertMachineInvariants() {
  const statuses = Object.keys(LEGAL) as BookingStatus[];
  for (const s of statuses) {
    for (const a of LEGAL[s]) {
      if (!a) throw new Error(`Empty action in ${s}`);
    }
  }
  // Terminal states allow no actions
  for (const terminal of ["declined", "completed", "cancelled_by_artist", "cancelled_by_client_late", "client_no_show"] as BookingStatus[]) {
    if (LEGAL[terminal].length !== 0) throw new Error(`${terminal} must be terminal`);
  }
}

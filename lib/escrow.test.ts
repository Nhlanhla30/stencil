import { describe, it, expect } from "vitest";
import { applyArtistAction, applyDepositPaid, legalActions, assertMachineInvariants } from "./escrow";
import type { ArtistAction, Booking, BookingStatus, DepositState } from "./types";

/* ------------------------------------------------------------------
   Test fixtures — a booking in any status/deposit state we want.
   escrow.ts is pure, so these exercise it directly with no I/O.
   ------------------------------------------------------------------ */

const AMOUNT = 500;
const FEE = 35;

function makeBooking(status: BookingStatus, depositState: DepositState): Booking {
  return {
    id: "bk_test",
    ref: "ST-TEST1",
    artistId: "art_test",
    client: { name: "Test Client", email: "t@example.com", phone: "+27 82 000 0000" },
    type: "Custom piece",
    size: "Medium",
    placement: "Forearm",
    preferredSlot: "Tue 14 Jul · 11:00",
    brief: "test",
    status,
    deposit: { state: depositState, amount: AMOUNT, bookingFee: FEE },
    createdAt: 1000,
    updatedAt: 1000,
  };
}

const ALL_STATUSES: BookingStatus[] = [
  "requested",
  "declined",
  "awaiting_deposit",
  "confirmed",
  "completed",
  "cancelled_by_artist",
  "cancelled_by_client_late",
  "client_no_show",
];

const ALL_ACTIONS: ArtistAction[] = [
  "accept",
  "decline",
  "complete",
  "cancel_by_artist",
  "client_no_show",
  "client_late_cancel",
];

/* ------------------------------------------------------------------
   Legal transitions
   ------------------------------------------------------------------ */

describe("applyArtistAction — legal transitions", () => {
  it("requested + accept → awaiting_deposit, deposit pending, no ledger", () => {
    const { booking, ledger } = applyArtistAction(makeBooking("requested", "none"), "accept");
    expect(booking.status).toBe("awaiting_deposit");
    expect(booking.deposit.state).toBe("pending");
    expect(ledger).toEqual([]);
  });

  it("requested + decline → declined, no money moved, no ledger", () => {
    const { booking, ledger } = applyArtistAction(makeBooking("requested", "none"), "decline");
    expect(booking.status).toBe("declined");
    expect(booking.deposit.state).toBe("none");
    expect(ledger).toEqual([]);
  });

  it("awaiting_deposit + cancel_by_artist (no money yet) → cancelled_by_artist, deposit none, no ledger", () => {
    const { booking, ledger } = applyArtistAction(makeBooking("awaiting_deposit", "pending"), "cancel_by_artist");
    expect(booking.status).toBe("cancelled_by_artist");
    expect(booking.deposit.state).toBe("none");
    expect(ledger).toEqual([]);
  });

  it("confirmed + complete → completed, deposit released, ledger releases full amount", () => {
    const { booking, ledger } = applyArtistAction(makeBooking("confirmed", "held"), "complete");
    expect(booking.status).toBe("completed");
    expect(booking.deposit.state).toBe("released");
    expect(booking.deposit.settledAt).toBeTypeOf("number");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].event).toBe("deposit_released");
    expect(ledger[0].amount).toBe(AMOUNT);
  });

  it("confirmed + cancel_by_artist (money held) → cancelled_by_artist, refunded, negative ledger entry", () => {
    const { booking, ledger } = applyArtistAction(makeBooking("confirmed", "held"), "cancel_by_artist");
    expect(booking.status).toBe("cancelled_by_artist");
    expect(booking.deposit.state).toBe("refunded");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].event).toBe("deposit_refunded");
    expect(ledger[0].amount).toBe(-AMOUNT);
  });

  it("confirmed + client_no_show → client_no_show, forfeited to artist", () => {
    const { booking, ledger } = applyArtistAction(makeBooking("confirmed", "held"), "client_no_show");
    expect(booking.status).toBe("client_no_show");
    expect(booking.deposit.state).toBe("forfeited");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].event).toBe("deposit_forfeited");
    expect(ledger[0].amount).toBe(AMOUNT);
  });

  it("confirmed + client_late_cancel → cancelled_by_client_late, forfeited to artist", () => {
    const { booking, ledger } = applyArtistAction(makeBooking("confirmed", "held"), "client_late_cancel");
    expect(booking.status).toBe("cancelled_by_client_late");
    expect(booking.deposit.state).toBe("forfeited");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].event).toBe("deposit_forfeited");
    expect(ledger[0].amount).toBe(AMOUNT);
  });
});

describe("applyDepositPaid — legal transition", () => {
  it("awaiting_deposit/pending → confirmed/held, with deposit_held + booking_fee_earned ledger", () => {
    const { booking, ledger } = applyDepositPaid(makeBooking("awaiting_deposit", "pending"));
    expect(booking.status).toBe("confirmed");
    expect(booking.deposit.state).toBe("held");
    expect(booking.deposit.paidAt).toBeTypeOf("number");

    const byEvent = Object.fromEntries(ledger.map((l) => [l.event, l.amount]));
    expect(ledger).toHaveLength(2);
    expect(byEvent.deposit_held).toBe(AMOUNT);
    expect(byEvent.booking_fee_earned).toBe(FEE);
  });
});

/* ------------------------------------------------------------------
   Illegal transitions — every (status, action) not in legalActions throws
   ------------------------------------------------------------------ */

describe("applyArtistAction — illegal transitions throw", () => {
  for (const status of ALL_STATUSES) {
    for (const action of ALL_ACTIONS) {
      const legal = legalActions(status).includes(action);
      it(`${status} + ${action} → ${legal ? "allowed" : "throws"}`, () => {
        // Deposit state here is irrelevant: applyArtistAction gates on status only.
        const booking = makeBooking(status, "held");
        if (legal) {
          expect(() => applyArtistAction(booking, action)).not.toThrow();
        } else {
          expect(() => applyArtistAction(booking, action)).toThrow();
        }
      });
    }
  }
});

/* ------------------------------------------------------------------
   Double payment is rejected
   ------------------------------------------------------------------ */

describe("applyDepositPaid — double payment rejected", () => {
  it("throws when the booking is already confirmed/held", () => {
    expect(() => applyDepositPaid(makeBooking("confirmed", "held"))).toThrow();
  });

  it("throws on a second payment after the first succeeds (nothing to write)", () => {
    const first = applyDepositPaid(makeBooking("awaiting_deposit", "pending"));
    expect(first.booking.status).toBe("confirmed");
    expect(() => applyDepositPaid(first.booking)).toThrow();
  });

  it("rejects payment from any non-(awaiting_deposit/pending) state", () => {
    for (const status of ALL_STATUSES) {
      for (const depositState of ["none", "pending", "held", "released", "refunded", "forfeited"] as DepositState[]) {
        const expectOk = status === "awaiting_deposit" && depositState === "pending";
        const call = () => applyDepositPaid(makeBooking(status, depositState));
        if (expectOk) expect(call).not.toThrow();
        else expect(call).toThrow();
      }
    }
  });
});

/* ------------------------------------------------------------------
   Machine invariants
   ------------------------------------------------------------------ */

describe("assertMachineInvariants", () => {
  it("does not throw", () => {
    expect(() => assertMachineInvariants()).not.toThrow();
  });
});

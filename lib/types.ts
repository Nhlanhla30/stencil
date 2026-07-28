/* ============================================================
   Stencil — domain types
   Booking status and deposit state are modelled separately:
   the booking tracks the appointment, the deposit tracks the money.
   ============================================================ */

export type BookingStatus =
  | "requested" // client submitted the form; artist hasn't responded
  | "declined" // artist declined the request; no money ever moved
  | "awaiting_deposit" // artist accepted; client has a deposit link
  | "confirmed" // deposit held in escrow; slot is locked
  | "completed" // session happened; deposit releases to artist after hold window
  | "cancelled_by_artist" // artist cancelled; deposit auto-refunds to client
  | "cancelled_by_client_late" // client cancelled inside 72h; deposit forfeits to artist
  | "client_no_show"; // client didn't arrive; deposit forfeits to artist

export type DepositState =
  | "none" // no deposit yet (requested / declined)
  | "pending" // deposit link issued, unpaid
  | "held" // paid, held by Stencil (escrow)
  | "released" // paid out to artist
  | "refunded" // returned to client
  | "forfeited"; // paid out to artist due to client cancellation/no-show

export interface Artist {
  id: string;
  slug: string;
  name: string;
  studio: string;
  area: string;
  styles: string[];
  bio: string;
  depositAmount: number; // in Rand
  hourlyRate: number; // in Rand
  instagram: string;
  active: boolean;
}

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
}

export interface Deposit {
  state: DepositState;
  amount: number; // Rand
  bookingFee: number; // Rand, Stencil's flat fee, paid by client on top
  paidAt?: number;
  settledAt?: number; // when released / refunded / forfeited
  yocoCheckoutId?: string;
}

export interface Booking {
  id: string;
  ref: string; // short human ref e.g. ST-8KQ2M
  artistId: string;
  client: ClientInfo;
  type: string; // Custom piece | Artist's flash | Consultation only
  size: string;
  placement: string;
  preferredSlot: string;
  brief: string;
  status: BookingStatus;
  deposit: Deposit;
  createdAt: number;
  updatedAt: number;
}

export interface LedgerEntry {
  id: string;
  bookingId: string;
  bookingRef: string;
  artistId: string;
  at: number;
  event:
    | "deposit_held"
    | "deposit_released"
    | "deposit_refunded"
    | "deposit_forfeited"
    | "booking_fee_earned";
  amount: number; // Rand; positive = into escrow/artist, negative = out
  note: string;
}

/** Actions an artist can take from the dashboard. */
export type ArtistAction =
  | "accept"
  | "decline"
  | "complete"
  | "cancel_by_artist"
  | "client_no_show"
  | "client_late_cancel";

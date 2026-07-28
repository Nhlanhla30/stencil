/* ============================================================
   Data store.

   MVP: in-memory, persisted across hot reloads via globalThis.
   This is fine for local demos and artist pitches. Before real
   users: swap the internals of these functions for Firestore
   (each function maps 1:1 to a collection read/write — see README).

   Nothing outside this file knows how data is stored.
   ============================================================ */

import { applyArtistAction, applyDepositPaid, assertMachineInvariants, newBookingRef } from "./escrow";
import type { Artist, ArtistAction, Booking, ClientInfo, LedgerEntry } from "./types";

const BOOKING_FEE = 35; // Rand, flat, paid by client on top of deposit

interface DB {
  artists: Artist[];
  bookings: Booking[];
  ledger: LedgerEntry[];
}

const uid = () => Math.random().toString(36).slice(2, 12);

function seed(): DB {
  assertMachineInvariants();
  const artists: Artist[] = [
    {
      id: "art_thandi",
      slug: "thandi",
      name: "Thandi Mokoena",
      studio: "Blackline Collective",
      area: "Braamfontein, JHB",
      styles: ["Fine line", "Blackwork"],
      bio: "Fine line botanicals and micro-blackwork. Custom work only — bring references, leave with something yours.",
      depositAmount: 500,
      hourlyRate: 1100,
      instagram: "@thandi.ink",
      active: true,
    },
    {
      id: "art_ruan",
      slug: "ruan",
      name: "Ruan Kotze",
      studio: "Iron & Ivy Tattoo",
      area: "Melville, JHB",
      styles: ["Traditional", "Neo-traditional"],
      bio: "Bold will hold. American traditional and neo-trad. Walk-up flash days first Saturday of the month.",
      depositAmount: 600,
      hourlyRate: 1200,
      instagram: "@ruan.tattoos",
      active: true,
    },
    {
      id: "art_lerato",
      slug: "lerato",
      name: "Lerato Dube",
      studio: "Needlepoint Studio",
      area: "Maboneng, JHB",
      styles: ["Realism", "Blackwork"],
      bio: "Black and grey realism — portraits, wildlife, large-scale sleeves. Consultation required for custom pieces.",
      depositAmount: 800,
      hourlyRate: 1400,
      instagram: "@lerato.needlepoint",
      active: true,
    },
  ];

  // A couple of seeded bookings so the dashboard demos well
  const now = Date.now();
  const b1: Booking = {
    id: uid(),
    ref: newBookingRef(),
    artistId: "art_thandi",
    client: { name: "Sipho M.", email: "sipho@example.com", phone: "+27 82 000 0001" },
    type: "Custom piece",
    size: "Medium",
    placement: "Forearm",
    preferredSlot: "Tue 14 Jul · 11:00",
    brief: "Protea with fine-line stem wrapping the forearm, ~10cm.",
    status: "requested",
    deposit: { state: "none", amount: 500, bookingFee: BOOKING_FEE },
    createdAt: now - 1000 * 60 * 60 * 5,
    updatedAt: now - 1000 * 60 * 60 * 5,
  };
  const b2: Booking = {
    id: uid(),
    ref: newBookingRef(),
    artistId: "art_thandi",
    client: { name: "Jess V.", email: "jess@example.com", phone: "+27 82 000 0002" },
    type: "Artist's flash",
    size: "Small",
    placement: "Calf",
    preferredSlot: "Wed 15 Jul · 15:00",
    brief: "Flash #012 (moth), as-is.",
    status: "confirmed",
    deposit: { state: "held", amount: 500, bookingFee: BOOKING_FEE, paidAt: now - 1000 * 60 * 60 * 24 },
    createdAt: now - 1000 * 60 * 60 * 30,
    updatedAt: now - 1000 * 60 * 60 * 24,
  };
  const l2: LedgerEntry = {
    id: uid(),
    bookingId: b2.id,
    bookingRef: b2.ref,
    artistId: "art_thandi",
    at: now - 1000 * 60 * 60 * 24,
    event: "deposit_held",
    amount: 500,
    note: `Deposit held in escrow for ${b2.ref}`,
  };

  return { artists, bookings: [b1, b2], ledger: [l2] };
}

// Persist across Next.js dev hot-reloads
const g = globalThis as unknown as { __stencilDb?: DB };
function db(): DB {
  if (!g.__stencilDb) g.__stencilDb = seed();
  return g.__stencilDb;
}

/* ---------------- reads ---------------- */

export async function getArtists(): Promise<Artist[]> {
  return db().artists.filter((a) => a.active);
}

export async function getArtistBySlug(slug: string): Promise<Artist | undefined> {
  return db().artists.find((a) => a.slug === slug && a.active);
}

export async function getArtistById(id: string): Promise<Artist | undefined> {
  return db().artists.find((a) => a.id === id);
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  return db().bookings.find((b) => b.id === id);
}

export async function getBookingsForArtist(artistId: string): Promise<Booking[]> {
  return db()
    .bookings.filter((b) => b.artistId === artistId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getLedgerForArtist(artistId: string): Promise<LedgerEntry[]> {
  return db()
    .ledger.filter((l) => l.artistId === artistId)
    .sort((a, b) => b.at - a.at);
}

/* ---------------- writes ---------------- */

export async function createBookingRequest(input: {
  artistSlug: string;
  client: ClientInfo;
  type: string;
  size: string;
  placement: string;
  preferredSlot: string;
  brief: string;
}): Promise<Booking> {
  const artist = await getArtistBySlug(input.artistSlug);
  if (!artist) throw new Error("Artist not found");
  const now = Date.now();
  const booking: Booking = {
    id: uid(),
    ref: newBookingRef(),
    artistId: artist.id,
    client: input.client,
    type: input.type,
    size: input.size,
    placement: input.placement,
    preferredSlot: input.preferredSlot,
    brief: input.brief,
    status: "requested",
    deposit: { state: "none", amount: artist.depositAmount, bookingFee: BOOKING_FEE },
    createdAt: now,
    updatedAt: now,
  };
  db().bookings.push(booking);
  return booking;
}

export async function performArtistAction(bookingId: string, action: ArtistAction): Promise<Booking> {
  const d = db();
  const idx = d.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) throw new Error("Booking not found");
  const { booking, ledger } = applyArtistAction(d.bookings[idx], action);
  d.bookings[idx] = booking;
  d.ledger.push(...ledger);
  return booking;
}

export async function markDepositPaid(bookingId: string, yocoCheckoutId?: string): Promise<Booking> {
  const d = db();
  const idx = d.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) throw new Error("Booking not found");
  const { booking, ledger } = applyDepositPaid(d.bookings[idx]);
  if (yocoCheckoutId) booking.deposit.yocoCheckoutId = yocoCheckoutId;
  d.bookings[idx] = booking;
  d.ledger.push(...ledger);
  return booking;
}

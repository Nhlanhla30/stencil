/* ============================================================
   Data store — Firestore.

   This is the ONLY file that knows how data is stored. Every
   exported function maps 1:1 to a Firestore collection op; nothing
   outside this file imports firebase-admin or learns about Firestore.

   Collections:
   - artists  (doc id = artist.id, the future Firebase Auth UID)
   - bookings (top-level; doc id = crypto.randomUUID())
   - ledger   (append-only; never updated or deleted)
   - slugs    (reservation docs enforcing artist slug uniqueness)
   ============================================================ */

import { db } from "./firebase-admin";
import { applyArtistAction, applyDepositPaid, newBookingRef } from "./escrow";
import type { Artist, ArtistAction, Booking, ClientInfo, LedgerEntry } from "./types";

const BOOKING_FEE = 35; // Rand, flat, paid by client on top of deposit

const artists = () => db.collection("artists");
const bookings = () => db.collection("bookings");
const ledger = () => db.collection("ledger");
const slugs = () => db.collection("slugs");

/* ---------------- reads ---------------- */

export async function getArtists(): Promise<Artist[]> {
  const snap = await artists().where("active", "==", true).get();
  // Sort in memory (by name) so no composite index is needed for the listing.
  return snap.docs
    .map((d) => d.data() as Artist)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getArtistBySlug(slug: string): Promise<Artist | undefined> {
  // Equality-only query — served without a composite index.
  const snap = await artists().where("slug", "==", slug).where("active", "==", true).limit(1).get();
  return snap.empty ? undefined : (snap.docs[0].data() as Artist);
}

export async function getArtistById(id: string): Promise<Artist | undefined> {
  const doc = await artists().doc(id).get();
  return doc.exists ? (doc.data() as Artist) : undefined;
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  const doc = await bookings().doc(id).get();
  return doc.exists ? (doc.data() as Booking) : undefined;
}

export async function getBookingsForArtist(artistId: string): Promise<Booking[]> {
  // Composite index: bookings (artistId ASC, updatedAt DESC) — firestore.indexes.json
  const snap = await bookings().where("artistId", "==", artistId).orderBy("updatedAt", "desc").get();
  return snap.docs.map((d) => d.data() as Booking);
}

export async function getLedgerForArtist(artistId: string): Promise<LedgerEntry[]> {
  // Composite index: ledger (artistId ASC, at DESC) — firestore.indexes.json
  const snap = await ledger().where("artistId", "==", artistId).orderBy("at", "desc").get();
  return snap.docs.map((d) => d.data() as LedgerEntry);
}

/* ---------------- writes ---------------- */

/**
 * Create an artist, reserving its slug atomically. The slugs/{slug} doc is
 * created with tx.create() in the same transaction as the artist — if the slug
 * is taken, create() fails and neither write commits. This is race-safe in a
 * way a query-then-write check is not.
 */
export async function createArtist(artist: Artist): Promise<Artist> {
  await db.runTransaction(async (tx) => {
    const slugRef = slugs().doc(artist.slug);
    const artistRef = artists().doc(artist.id);
    tx.create(slugRef, { artistId: artist.id });
    tx.create(artistRef, artist);
  });
  return artist;
}

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
  // crypto.randomUUID(): /b/[id] is public and the id is the only thing
  // protecting the client's details, so it must be unguessable.
  const booking: Booking = {
    id: crypto.randomUUID(),
    ref: newBookingRef(), // ST-xxxxx — human-facing display only, never a lookup key
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
  await bookings().doc(booking.id).set(booking);
  return booking;
}

export async function performArtistAction(bookingId: string, action: ArtistAction): Promise<Booking> {
  return db.runTransaction(async (tx) => {
    const ref = bookings().doc(bookingId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Booking not found");

    // Pure escrow function decides the transition. If it throws (illegal
    // transition), we throw before any write and the transaction aborts.
    const { booking, ledger: entries } = applyArtistAction(snap.data() as Booking, action);

    tx.set(ref, booking);
    for (const e of entries) tx.create(ledger().doc(e.id), e); // append-only
    return booking;
  });
}

export async function markDepositPaid(bookingId: string, yocoCheckoutId?: string): Promise<Booking> {
  return db.runTransaction(async (tx) => {
    const ref = bookings().doc(bookingId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Booking not found");

    // applyDepositPaid throws unless status/deposit are awaiting_deposit/pending,
    // so a second payment on an already-confirmed booking aborts the transaction
    // and writes nothing.
    const { booking, ledger: entries } = applyDepositPaid(snap.data() as Booking);
    if (yocoCheckoutId) booking.deposit.yocoCheckoutId = yocoCheckoutId;

    tx.set(ref, booking);
    for (const e of entries) tx.create(ledger().doc(e.id), e); // append-only
    return booking;
  });
}

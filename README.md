# Stencil

The booking layer for South African tattoo artists. One link in the artist's
Instagram bio turns booking requests out of their DMs into structured bookings,
with deposits held in escrow by Stencil and no-show deposits paid out to the
artist automatically.

**Live demo:** https://stencil-beige-mu.vercel.app/

## Business model

No commission. A flat R35 booking fee is paid by the client, the same model
Venue.ink proved in the US. The competitive moat against international players
(Venue, Porter, Tattoo Studio Pro) is local payment rails: those platforms run
on Stripe, which does not serve South African merchants.

## Tech stack

Next.js (App Router) and TypeScript, with server actions as the only write path.
Designed to run on Firestore (africa-south1) and Yoco for payments, with an
in-memory store and simulated checkout used for local demos.

## Running locally

npm install
npm run dev


The app runs against an in-memory store and a simulated payment provider by
default, so no database or payment credentials are needed to demo it.

### Pages

- `/` — landing page, pitches artists
- `/a/thandi` — an artist's public link-in-bio booking page (the front door)
- `/dashboard` — artist dashboard: requests, active bookings, money ledger
- `/b/[id]` — a client's live booking-status page, where they pay the deposit

### Walking through the full loop

Submit a request on `/a/thandi`, open `/dashboard` and accept it, open the
client's `/b/...` link and pay the simulated deposit, then return to the
dashboard to mark the booking complete, no-show, or cancelled and watch the
ledger update.

## Architecture

- `lib/escrow.ts` — the escrow state machine. Pure functions, no I/O, with every
  legal transition explicit and illegal transitions throwing. This is the core
  of the product and is intentionally kept simple so it can be tested thoroughly.
- `lib/store.ts` — the only file that knows how data is stored. Currently
  in-memory (resets on server restart, which is fine for demos and artist
  pitches). Every exported function maps directly to a Firestore read or write.
- `lib/yoco.ts` — payment provider. Simulated checkout by default; setting
  `YOCO_SECRET_KEY` switches to Yoco's hosted checkout.
- `app/actions.ts` — server actions, the only write path from the UI.

## Roadmap to real users

1. Firebase Auth for artists. The `?as=` switcher on `/dashboard` is a demo
   stand-in, not security.
2. Firestore. Swap the internals of `lib/store.ts` for `artists`, `bookings`,
   and `ledger` collections (africa-south1). Booking transitions run inside a
   Firestore transaction so a webhook and a dashboard action cannot race.
3. Yoco live mode. Set `YOCO_SECRET_KEY`, `YOCO_WEBHOOK_SECRET`, and
   `NEXT_PUBLIC_BASE_URL`, and implement webhook signature verification in
   `app/api/yoco/webhook/route.ts` (it currently fails closed on purpose).
   Verify API field names against current Yoco documentation.
4. Notifications. WhatsApp and SMS on request, accept, and payment, plus 72-hour
   and 24-hour reminders. Reminders alone measurably reduce no-shows.
5. Refund execution. The ledger records refunds; issuing them requires wiring
   Yoco's refund API into the `cancel_by_artist` path.

## Compliance note

Holding client funds in escrow may make Stencil a payment intermediary under
South African regulation (SARB directives on third-party payments). There are
two safe routes: use a licensed escrow or split-payment provider (such as
TradeSafe, or split settlements via Paystack or Peach) so the licence is theirs
rather than yours, or obtain a one-off legal opinion before holding funds in
your own account. This step should not be skipped. The concierge workaround —
deposits into a dedicated account, manually managed, in a small pilot with
artists who know you — is the standard pre-licence validation path, but it is a
stopgap rather than a destination.

## Design system

Bone paper `#EDEAE0`, ink `#17150F`, stencil purple `#5A3FB5` (thermal stencil
paper, the signature colour), flash red `#BE3A2C`, flash green `#3E5C43`.
Typefaces: Pirata One (wordmark), Big Shoulders Display (headings), Archivo
(body), IBM Plex Mono (data and money). Corner-ticked flash-card framing is used
throughout (`.flash-card` in `globals.css`).

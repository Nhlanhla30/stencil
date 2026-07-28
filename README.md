# Stencil

The booking layer for South African tattoo artists. One link in the artist's Instagram bio; booking requests out of their DMs; deposits held in escrow by Stencil; no-shows paid out to the artist automatically.

**Model:** no commission. Flat R35 booking fee paid by the client (same model Venue.ink proved in the US). The moat vs international players (Venue, Porter, Tattoo Studio Pro, etc.) is local payment rails — they all run on Stripe, which doesn't serve SA merchants.

## Run it

```bash
npm install
npm run dev
```

- `/` — landing page (pitches artists)
- `/a/thandi` — an artist's public link-in-bio booking page (the front door)
- `/dashboard` — artist dashboard (requests, active bookings, money ledger)
- `/b/[id]` — a client's live booking-status page (where they pay the deposit)

**Demo the full loop:** submit a request on `/a/thandi` → open `/dashboard` → Accept → open the client's `/b/...` link → pay the (simulated) deposit → back in the dashboard, mark it complete / no-show / cancelled and watch the ledger.

## Architecture

- `lib/escrow.ts` — the escrow **state machine**. Pure functions, no I/O, every legal transition explicit, illegal transitions throw. This is the heart of the product; keep it boring and heavily tested.
- `lib/store.ts` — the only file that knows how data is stored. Currently in-memory (resets on server restart; fine for demos and artist pitches). Every exported function maps 1:1 to a Firestore read/write.
- `lib/yoco.ts` — payment provider. Simulated checkout by default; set `YOCO_SECRET_KEY` to switch to Yoco's real hosted checkout.
- `app/actions.ts` — server actions; the only write path from the UI.

## Roadmap to real users (in order)

1. **Firebase Auth** for artists — the `?as=` switcher on `/dashboard` is a demo stand-in, not security.
2. **Firestore** — swap `lib/store.ts` internals: `artists`, `bookings`, `ledger` collections (africa-south1, same as your LJ Trading setup). Do booking transitions inside a Firestore transaction so a webhook and a dashboard action can't race.
3. **Yoco live mode** — set `YOCO_SECRET_KEY`, `YOCO_WEBHOOK_SECRET`, `NEXT_PUBLIC_BASE_URL`; implement webhook signature verification in `app/api/yoco/webhook/route.ts` (it currently **fails closed** on purpose). Verify API field names against current Yoco docs.
4. **Notifications** — WhatsApp/SMS on request, accept, payment, and 72h/24h reminders. Reminders alone measurably cut no-shows.
5. **Refund execution** — the ledger records refunds; actually issuing them needs Yoco's refund API call wired into the `cancel_by_artist` path.

## ⚠️ Compliance flag (before taking real money)

Holding client funds in escrow may make Stencil a payment intermediary under SA regulation (SARB directives on third-party payments). Two safe routes:

1. Use a licensed escrow/split-payment provider (e.g. TradeSafe, or split settlements via Paystack/Peach) so the license is theirs, not yours.
2. Get a one-off legal opinion before holding funds in your own account.

Do **not** skip this step. The concierge workaround (deposits into a dedicated account, manually managed, small pilot with artists who know you) is the standard pre-license validation path, but it is a stopgap, not a destination.

## Design system

Bone paper `#EDEAE0` / ink `#17150F` / stencil purple `#5A3FB5` (thermal stencil paper — the signature) / flash red `#BE3A2C` / flash green `#3E5C43`. Type: Pirata One (wordmark), Big Shoulders Display (headings), Archivo (body), IBM Plex Mono (data & money). Corner-ticked "flash card" framing throughout (`.flash-card` in `globals.css`).

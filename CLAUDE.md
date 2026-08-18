# CLAUDE.md — Stencil

The booking layer for South African tattoo artists. One link in the artist's Instagram bio; booking requests out of their DMs; deposits held in escrow by Stencil; no-shows paid out to the artist automatically.

## Project structure

```
app/
  page.tsx                        — landing page (pitches artists, "How the money moves")
  layout.tsx                      — root layout, fonts, global nav
  globals.css                     — design system: flash-card, btn-*, field-label, tick-b
  actions.ts                      — server actions; the only write path from the UI
  a/[slug]/page.tsx               — artist's public link-in-bio booking page (the front door)
  b/[id]/page.tsx                 — client's live booking-status page (where they pay the deposit)
  pay/[id]/page.tsx               — deposit checkout (Yoco hosted or simulated)
  dashboard/page.tsx              — artist dashboard: requests, active bookings, money ledger
  artists/page.tsx                — public artist directory
  api/yoco/webhook/route.ts       — Yoco payment webhook (fails closed — see rules below)

lib/
  escrow.ts                       — escrow state machine (pure functions, no I/O — see rules below)
  store.ts                        — the only file that knows how data is stored (in-memory → Firestore)
  types.ts                        — domain types: BookingStatus, DepositState, Artist, Booking, LedgerEntry
  yoco.ts                         — payment provider; simulated by default, live when YOCO_SECRET_KEY is set
```

### Domain types (lib/types.ts)

**BookingStatus:** `requested` → `declined` | `awaiting_deposit` → `confirmed` → `completed` | `cancelled_by_artist` | `cancelled_by_client_late` | `client_no_show`

**DepositState:** `none` → `pending` → `held` → `released` | `refunded` | `forfeited`

### Design system

Bone paper `#EDEAE0` / ink `#17150F` / stencil purple `#5A3FB5` / flash red `#BE3A2C` / flash green `#3E5C43`. Type: Pirata One (wordmark), Big Shoulders Display (headings), Archivo (body), IBM Plex Mono (data & money). Corner-ticked `.flash-card` throughout.

---

## Critical rules

### lib/escrow.ts is the heart of the product
Pure functions only — no I/O, no async, no database calls. Every legal state
transition is listed explicitly; anything not listed throws. This is deliberate:
with other people's money, "unexpected state" must be an error, never a silent
pass-through. Do not "tidy" this file, do not add convenience fallbacks, and do
not loosen a transition to make a UI flow easier. If a new transition is needed,
add it explicitly and update the tests.

### The Yoco webhook fails closed on purpose
`app/api/yoco/webhook/route.ts` returns 501 until HMAC signature verification is
implemented against YOCO_WEBHOOK_SECRET. Do not stub this to "true" to make
testing easier — an unverified webhook lets anyone mark bookings as paid.

### Money rules (encoded in lib/escrow.ts)
- No money moves until the ARTIST accepts a request
- Deposit is HELD by Stencil once paid (booking confirmed)
- completed → deposit RELEASES to artist (48h hold window)
- cancelled_by_artist → deposit REFUNDS to client, same day
- client no-show or late cancel (<72h) → deposit FORFEITS to artist

### lib/store.ts is the only file that knows how data is stored
Currently in-memory (resets on restart). Every exported function maps 1:1 to a
Firestore collection op. When migrating to Firestore, change only the internals
of these functions — nothing outside this file should learn about Firestore.

### Version decision
Pinned to Next.js 14.2.35 (final patched release of the 14.2 line). Do NOT
upgrade to 15/16 casually — it's scheduled to bundle with the Firestore/Yoco
work, since params/searchParams become async and the whole escrow flow needs
re-testing. See README.

### Known demo stand-ins (not production code)
- `?as=` switcher on /dashboard is NOT auth — Firebase Auth replaces it
- Thandi / Ruan / Lerato are seed data — remove once real profiles exist
- Simulated checkout at /pay/[id] when YOCO_SECRET_KEY is unset

### Compliance gate
Holding client deposits in escrow may make Stencil a payment intermediary under
SA regulation. Do not wire live payments until this is resolved (licensed
provider like TradeSafe / Paystack split payments, or a legal opinion).

## Working style
- Plan mode first on anything touching escrow, payments, or auth
- Show diffs before applying
- Nhlanhla handles all git commits and pushes — do not commit or push

import { notFound } from "next/navigation";
import { submitBookingRequest } from "@/app/actions";
import { getArtistBySlug } from "@/lib/store";

const SLOTS = ["Thu 9 Jul · 10:00", "Fri 10 Jul · 14:00", "Sat 11 Jul · 09:00", "Tue 14 Jul · 11:00", "Wed 15 Jul · 15:00", "Mon 20 Jul · 10:00"];

export default async function ArtistPage({ params }: { params: { slug: string } }) {
  const artist = await getArtistBySlug(params.slug);
  if (!artist) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      {/* This page is the artist's link-in-bio. It must work perfectly on a phone. */}
      <div className="flash-card p-6">
        <span className="tick-b" />
        <h1 className="font-head text-4xl font-extrabold uppercase leading-none">{artist.name}</h1>
        <div className="mt-1 text-sm text-inksoft">
          {artist.studio} · {artist.area} · <span className="font-mono">{artist.instagram}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{artist.bio}</p>
        <div className="mt-4 border-2 border-stencil bg-stencilsoft p-4 text-sm leading-relaxed">
          <div className="font-head text-lg font-bold uppercase text-stencil">Your deposit, handled safely</div>
          <ul className="mt-2 list-disc pl-5 text-ink">
            <li>R{artist.depositAmount} deposit secures your slot — held by Stencil, not paid to the artist upfront.</li>
            <li>Deposit comes off your final session price at the studio.</li>
            <li>Reschedule free up to 72 hours before. Inside 72 hours, the deposit is forfeited.</li>
            <li>Full refund if {artist.name.split(" ")[0]} cancels.</li>
          </ul>
        </div>
      </div>

      <h2 className="mt-10 font-head text-3xl font-extrabold uppercase">Request a booking</h2>
      <p className="mt-1 text-sm text-inksoft">
        No payment now — you only pay the deposit once {artist.name.split(" ")[0]} accepts your request.
      </p>

      <form action={submitBookingRequest} className="mt-6 flash-card p-6">
        <span className="tick-b" />
        <input type="hidden" name="artistSlug" value={artist.slug} />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="field-label">Your name</label>
            <input id="name" name="name" required className="text-input" placeholder="Full name" />
          </div>
          <div>
            <label htmlFor="phone" className="field-label">WhatsApp number</label>
            <input id="phone" name="phone" required className="text-input" placeholder="+27 ..." />
          </div>
        </div>
        <div className="mt-5">
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" name="email" type="email" required className="text-input" placeholder="you@example.com" />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="type" className="field-label">Booking type</label>
            <select id="type" name="type" className="text-input">
              <option>Custom piece</option>
              <option>Artist&apos;s flash</option>
              <option>Consultation only</option>
            </select>
          </div>
          <div>
            <label htmlFor="size" className="field-label">Size</label>
            <select id="size" name="size" className="text-input">
              <option>Small (up to 5cm)</option>
              <option>Medium (5–12cm)</option>
              <option>Large (12cm+)</option>
            </select>
          </div>
          <div>
            <label htmlFor="placement" className="field-label">Placement</label>
            <input id="placement" name="placement" className="text-input" placeholder="e.g. Forearm" />
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="preferredSlot" className="field-label">Preferred slot</label>
          <select id="preferredSlot" name="preferredSlot" className="text-input">
            {SLOTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <label htmlFor="brief" className="field-label">Tell {artist.name.split(" ")[0]} about your idea</label>
          <textarea
            id="brief"
            name="brief"
            rows={4}
            className="text-input"
            placeholder="Describe the piece, paste reference links, mention cover-ups or skin considerations…"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <span className="font-mono text-xs text-inksoft">
            Deposit if accepted: R{artist.depositAmount} + R35 booking fee
          </span>
          <button type="submit" className="btn-primary">Send request</button>
        </div>
      </form>
    </div>
  );
}

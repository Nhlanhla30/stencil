import Link from "next/link";
import { getArtists } from "@/lib/store";

export default async function Home() {
  const artists = await getArtists();
  return (
    <div>
      <section className="border-b-2 border-ink bg-paperdeep">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h1 className="font-head text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">
            Your art. Your clients.
            <br />
            <span className="text-stencil">Our problem: the money.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-inksoft">
            Stencil is the booking layer for South African tattoo artists. One link in your
            Instagram bio. Booking requests out of your DMs, deposits held in escrow, no-shows
            paid out to you automatically.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link href="/dashboard" className="btn-primary">See the artist dashboard</Link>
            <Link href="/artists" className="btn-ghost">Browse artists</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-5">
            {["No commission — flat R35 client booking fee", "Deposits released 48h after the session", "No-show? The deposit is yours"].map((t) => (
              <span key={t} className="border-b-2 border-stencil pb-0.5 font-mono text-xs">{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="font-head text-3xl font-extrabold uppercase">How the money moves</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {[
            { n: "01", t: "Client requests", d: "They fill in your booking form — size, placement, references. No payment yet. You accept or decline." },
            { n: "02", t: "Deposit held", d: "On accept, the client pays once and Stencil handles everything automatically — deposit held in escrow, slot locked, no cash and no follow-up DMs needed." },
            { n: "03", t: "You get paid", d: "Session done: deposit releases to you within 48h. Client no-shows or cancels late: deposit is yours the same day." },
          ].map((s) => (
            <div key={s.n} className="flash-card p-5">
              <span className="tick-b" />
              <div className="font-mono text-xs text-stencil">{s.n}</div>
              <div className="mt-1 font-head text-2xl font-bold uppercase">{s.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-inksoft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <h2 className="font-head text-3xl font-extrabold uppercase">Live on Stencil</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {artists.map((a) => (
            <Link key={a.id} href={`/a/${a.slug}`} className="flash-card p-5 hover:border-stencil">
              <span className="tick-b" />
              <div className="font-head text-2xl font-extrabold uppercase leading-none">{a.name}</div>
              <div className="mt-1 text-sm text-inksoft">{a.studio} · {a.area}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.styles.map((s) => (
                  <span key={s} className="border border-inksoft px-2 py-0.5 font-mono text-[11px] text-inksoft">{s}</span>
                ))}
              </div>
              <div className="mt-4 inline-block bg-stencil px-2 py-1 font-mono text-xs font-semibold text-white">
                R{a.depositAmount} PROTECTED DEPOSIT
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

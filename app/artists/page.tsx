import Link from "next/link";
import { getArtists } from "@/lib/store";

export default async function ArtistsPage() {
  const artists = await getArtists();
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="font-head text-4xl font-extrabold uppercase">Artists on Stencil</h1>
      <p className="mt-2 max-w-lg text-sm text-inksoft">
        Every booking here comes with a protected deposit — held by Stencil, refunded automatically if the artist cancels.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((a) => (
          <Link key={a.id} href={`/a/${a.slug}`} className="flash-card p-5 hover:border-stencil">
            <span className="tick-b" />
            <div className="font-head text-2xl font-extrabold uppercase leading-none">{a.name}</div>
            <div className="mt-1 text-sm text-inksoft">{a.studio} · {a.area}</div>
            <p className="mt-3 text-sm leading-relaxed">{a.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.styles.map((s) => (
                <span key={s} className="border border-inksoft px-2 py-0.5 font-mono text-[11px] text-inksoft">{s}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="bg-stencil px-2 py-1 font-mono text-xs font-semibold text-white">R{a.depositAmount} DEPOSIT</span>
              <span className="font-mono text-xs text-inksoft">±R{a.hourlyRate}/hr</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

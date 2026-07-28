import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Pirata+One&family=Big+Shoulders+Display:wght@600;700;800&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export const metadata: Metadata = {
  title: "Stencil — protected deposits & booking for tattoo artists",
  description:
    "Deposits held in escrow, no-shows handled, bookings out of your DMs. The booking layer for South African tattoo artists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS} />
      </head>
      <body className="bg-paper text-ink font-body min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between px-5 py-3">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="font-mark text-3xl leading-none">Stencil</span>
              <span className="font-mono text-[11px] font-semibold tracking-wider text-stencil">JHB · BETA</span>
            </Link>
            <nav className="flex items-center gap-5 font-mono text-xs text-inksoft">
              <Link href="/artists" className="hover:text-stencil">Artists</Link>
              <Link href="/dashboard" className="hover:text-stencil">Artist dashboard</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t-2 border-ink px-5 py-4 text-center">
          <span className="font-mono text-[11px] text-inksoft">
            STENCIL · The booking layer for tattoo artists · Artists keep their Instagram, we handle the money
          </span>
        </footer>
      </body>
    </html>
  );
}

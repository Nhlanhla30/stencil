// Seed the three demo artists into Firestore, so there's something to book
// until real artist onboarding exists. Idempotent: skips any artist that
// already exists, so re-running is safe.
//
// Run (same pattern as the healthcheck — pulls in server-only):
//
//   node --env-file=.env.local --conditions=react-server \
//     --import tsx scripts/seed-artists.ts
import { createArtist, getArtistById } from "../lib/store";
import type { Artist } from "../lib/types";

const DEMO_ARTISTS: Artist[] = [
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

async function main() {
  let created = 0;
  for (const artist of DEMO_ARTISTS) {
    if (await getArtistById(artist.id)) {
      console.log(`• ${artist.slug} already exists — skipped`);
      continue;
    }
    await createArtist(artist);
    created++;
    console.log(`✓ created ${artist.slug} (${artist.name})`);
  }
  console.log(`\nDone. ${created} created, ${DEMO_ARTISTS.length - created} skipped.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed failed:");
    console.error(err instanceof Error ? `  ${err.message}` : err);
    process.exit(1);
  });

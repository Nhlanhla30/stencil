// One-off Firestore connectivity check. Throwaway — not wired into the app.
//
// Run it with the env file loaded AND the react-server condition set (so the
// `server-only` import in lib/firebase-admin.ts resolves to a no-op):
//
//   node --env-file=.env.local --conditions=react-server \
//     --import tsx scripts/firebase-healthcheck.ts
//
// It writes a doc to `_healthcheck`, reads it back, deletes it, and reports.
import { db } from "../lib/firebase-admin";

async function main() {
  const ref = db.collection("_healthcheck").doc();
  const payload = { ok: true, at: new Date().toISOString(), note: "stencil connectivity check" };

  await ref.set(payload);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("wrote the doc but could not read it back");

  await ref.delete();
  const after = await ref.get();
  if (after.exists) throw new Error("deleted the doc but it still exists");

  console.log(`✓ Firestore healthcheck passed (doc ${ref.id} written, read, deleted)`);
  console.log("  read back:", JSON.stringify(snap.data()));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Firestore healthcheck failed:");
    console.error(err instanceof Error ? `  ${err.message}` : err);
    process.exit(1);
  });

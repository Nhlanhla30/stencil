// Firebase Admin SDK — server-side only.
//
// This module must never reach the client bundle: `server-only` throws at
// build time if it is imported from a Client Component. The healthcheck
// script runs under the `react-server` export condition, which resolves
// `server-only` to a no-op so the script can import this file directly.
import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function readServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Stored in .env.local with literal "\n" sequences; restore real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && "FIREBASE_PROJECT_ID",
      !clientEmail && "FIREBASE_CLIENT_EMAIL",
      !privateKey && "FIREBASE_PRIVATE_KEY",
    ].filter(Boolean);
    throw new Error(
      `firebase-admin: missing env var(s): ${missing.join(", ")}. ` +
        "Expected them in .env.local (see lib/firebase-admin.ts).",
    );
  }

  return { projectId, clientEmail, privateKey };
}

// Guard against hot-reload re-initialisation: Next dev re-evaluates modules on
// every change, which would otherwise throw "app already exists". We cache the
// singletons on globalThis so they survive reloads within one process.
const globalForFirebase = globalThis as unknown as {
  firebaseApp?: App;
  firestore?: Firestore;
};

function getApp(): App {
  if (globalForFirebase.firebaseApp) return globalForFirebase.firebaseApp;

  // getApps() also catches re-init across modules that didn't hit our cache.
  const app =
    getApps()[0] ??
    initializeApp({ credential: cert(readServiceAccount()) });

  globalForFirebase.firebaseApp = app;
  return app;
}

export const db: Firestore =
  globalForFirebase.firestore ??
  (globalForFirebase.firestore = getFirestore(getApp()));

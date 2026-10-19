import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// On Firebase App Hosting the default credentials and project are picked up
// from the environment, so no service-account key is needed.
function app() {
  return getApps()[0] ?? initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
}

let firestoreConfigured = false;
export function adminFirestore() {
  const db = getFirestore(app());
  if (!firestoreConfigured) {
    db.settings({ ignoreUndefinedProperties: true });
    firestoreConfigured = true;
  }
  return db;
}

export const adminAuth = () => getAuth(app());

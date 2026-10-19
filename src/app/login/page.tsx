"use client";

import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { api, ErrorBox } from "@/components/ui";
import { clientAuth } from "@/lib/firebaseClient";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const auth = clientAuth();
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await api("/api/session", { method: "POST", body: JSON.stringify({ idToken: await cred.user.getIdToken() }) });
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      // The server session cookie is what matters from here on.
      await signOut(auth).catch(() => {});
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted">Job Finder is private. Sign in with the Google account it was set up for.</p>
      <button className="btn btn-primary w-full" onClick={signIn} disabled={busy}>
        {busy ? "Signing in…" : "Continue with Google"}
      </button>
      <ErrorBox message={error} />
    </div>
  );
}

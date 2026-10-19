import { cookies } from "next/headers";
import { storeFor } from "./store";

// Auth is on when deployed (AUTH_REQUIRED=true). Locally everything runs as a
// single "local" user with no sign-in.
export const AUTH_REQUIRED = process.env.AUTH_REQUIRED === "true";
export const SESSION_COOKIE = "__session";
export const SESSION_DAYS = 14;

export class UnauthorizedError extends Error {}

export interface User {
  uid: string;
  email: string;
}

export function isAllowedEmail(email: string | undefined | null) {
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}

export async function currentUser(): Promise<User | null> {
  if (!AUTH_REQUIRED) return { uid: "local", email: "local" };
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const { adminAuth } = await import("./firebaseAdmin");
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return isAllowedEmail(decoded.email) ? { uid: decoded.uid, email: decoded.email! } : null;
  } catch {
    return null;
  }
}

/** The signed-in user's document store; throws UnauthorizedError if not signed in. */
export async function userStore() {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError("Sign in required");
  return storeFor(user.uid);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedEmail, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

const Body = z.object({ idToken: z.string().min(1) });

// Exchanges a Firebase ID token from Google sign-in for an httpOnly session cookie.
export async function POST(req: Request) {
  try {
    const { idToken } = Body.parse(await req.json());
    const { adminAuth } = await import("@/lib/firebaseAdmin");
    const decoded = await adminAuth().verifyIdToken(idToken);
    if (!isAllowedEmail(decoded.email)) {
      return NextResponse.json({ error: `${decoded.email ?? "This account"} is not allowed to use this app.` }, { status: 403 });
    }
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

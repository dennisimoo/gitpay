import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const COOKIE = "gp_sid";

export function getSessionId(req: NextRequest): string {
  return req.cookies.get(COOKIE)?.value || "";
}

export function ensureSessionCookie(req: NextRequest, res: NextResponse): string {
  let sid = req.cookies.get(COOKIE)?.value;
  if (!sid) {
    sid = randomUUID();
    res.cookies.set(COOKIE, sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return sid;
}

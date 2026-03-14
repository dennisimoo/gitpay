import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/origin";
import { ensureSessionCookie, getSessionId } from "@/lib/session";
import { kvSet } from "@/lib/store";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const origin = getOrigin(req);
  if (!code) return NextResponse.redirect(`${origin}/setup?error=no_code`);

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) {
    return NextResponse.redirect(`${origin}/setup?error=oauth_failed`);
  }

  const redirect = NextResponse.redirect(`${origin}/setup?connected=1`);
  const sid = ensureSessionCookie(req, redirect);
  kvSet(`github_token:${sid}`, data.access_token);

  return redirect;
}

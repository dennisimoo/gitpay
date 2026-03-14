import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/origin";
import { ensureSessionCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID not set" }, { status: 500 });
  }

  const origin = getOrigin(req);
  const res = NextResponse.redirect(`https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    scope: "repo admin:repo_hook",
    state: Math.random().toString(36).slice(2),
    redirect_uri: `${origin}/api/github/callback`,
  })}`);

  // Ensure session cookie exists before redirect so callback can read it
  ensureSessionCookie(req, res);
  return res;
}

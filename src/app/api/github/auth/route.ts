import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/origin";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID not set" }, { status: 500 });
  }

  const origin = getOrigin(req);
  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo admin:repo_hook",
    state,
    redirect_uri: `${origin}/api/github/callback`,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID not set" }, { status: 500 });
  }

  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo admin:repo_hook",
    state,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/github/callback`,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

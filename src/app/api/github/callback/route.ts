import { NextRequest, NextResponse } from "next/server";

const g = global as typeof global & { _githubToken?: string };

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect("/setup?error=no_code");

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
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup?error=oauth_failed`);
  }

  // Store in global memory for this session
  g._githubToken = data.access_token;

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/setup?connected=1`);
}

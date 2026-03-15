import { NextRequest, NextResponse } from "next/server";
import { kvGet } from "@/lib/store";
import { getSessionId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const sid = getSessionId(req);
  const token = sid ? await kvGet(`github_token:${sid}`) : undefined;
  if (!token) return NextResponse.json({ repos: [], connected: false });

  const allRepos: Array<{ full_name: string; private: boolean; description: string | null }> = [];
  let page = 1;
  while (true) {
    const res = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&type=all&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return NextResponse.json({ repos: [], connected: false });
    const batch = await res.json() as Array<{ full_name: string; private: boolean; description: string | null }>;
    allRepos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  const userJson = userRes.ok ? await userRes.json() as { login: string; avatar_url: string } : null;

  return NextResponse.json({
    connected: true,
    user: userJson ? { login: userJson.login, avatarUrl: userJson.avatar_url } : null,
    repos: allRepos.map((r) => ({ fullName: r.full_name, private: r.private, description: r.description })),
  });
}

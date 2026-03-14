import { NextResponse } from "next/server";
import { kvGet } from "@/lib/store";

const g = global as typeof global & { _githubToken?: string };

function getToken(): string | undefined {
  return g._githubToken || kvGet("github_token");
}

export async function GET() {
  const token = getToken();
  if (!token) return NextResponse.json({ repos: [], connected: false });

  // Cache in memory for this process
  if (!g._githubToken) g._githubToken = token;

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

  return NextResponse.json({
    connected: true,
    repos: allRepos.map((r) => ({ fullName: r.full_name, private: r.private, description: r.description })),
  });
}

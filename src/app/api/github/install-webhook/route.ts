import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/origin";
import { kvGet, addConnectedRepo, removeConnectedRepo, getConnectedRepos } from "@/lib/store";

const g = global as typeof global & { _githubToken?: string };

function getToken(): string | undefined {
  return g._githubToken || kvGet("github_token");
}

export async function POST(req: NextRequest) {
  const { repoFullName } = await req.json() as { repoFullName: string };
  if (!repoFullName) return NextResponse.json({ error: "repoFullName required" }, { status: 400 });

  const token = getToken();
  if (!token) return NextResponse.json({ error: "Not authenticated with GitHub" }, { status: 401 });

  const [owner, repo] = repoFullName.split("/");
  const appUrl = getOrigin(req);
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "gitpay-secret-2024";

  const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });

  if (listRes.ok) {
    const hooks = await listRes.json() as Array<{ config: { url: string }; id: number }>;
    const existing = hooks.find((h) => h.config.url === `${appUrl}/api/webhook`);
    if (existing) {
      addConnectedRepo(repoFullName);
      return NextResponse.json({ ok: true, alreadyExists: true });
    }
  }

  const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["pull_request"],
      config: { url: `${appUrl}/api/webhook`, content_type: "json", secret, insecure_ssl: "0" },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    return NextResponse.json({ error: JSON.stringify(err) }, { status: createRes.status });
  }

  addConnectedRepo(repoFullName);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ repos: getConnectedRepos() });
}

export async function DELETE(req: NextRequest) {
  const { repoFullName } = await req.json() as { repoFullName: string };
  if (!repoFullName) return NextResponse.json({ error: "repoFullName required" }, { status: 400 });

  const token = getToken();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [owner, repo] = repoFullName.split("/");
  const appUrl = getOrigin(req);

  const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });

  if (listRes.ok) {
    const hooks = await listRes.json() as Array<{ config: { url: string }; id: number }>;
    const existing = hooks.find((h) => h.config.url === `${appUrl}/api/webhook`);
    if (existing) {
      await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks/${existing.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
    }
  }

  removeConnectedRepo(repoFullName);
  return NextResponse.json({ ok: true });
}

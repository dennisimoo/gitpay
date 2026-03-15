import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/origin";
import { kvGet, addConnectedRepo, removeConnectedRepo, getConnectedRepos } from "@/lib/store";
import { getSessionId } from "@/lib/session";

async function getToken(sid: string): Promise<string | undefined> {
  return sid ? kvGet(`github_token:${sid}`) : undefined;
}

export async function POST(req: NextRequest) {
  const sid = getSessionId(req);
  const token = await getToken(sid);
  if (!token) return NextResponse.json({ error: "Not authenticated with GitHub" }, { status: 401 });

  const { repoFullName } = await req.json() as { repoFullName: string };
  if (!repoFullName) return NextResponse.json({ error: "repoFullName required" }, { status: 400 });

  const [owner, repo] = repoFullName.split("/");
  const appUrl = getOrigin(req);
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "gitpay-secret-2024";

  const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });

  if (listRes.ok) {
    const hooks = await listRes.json() as Array<{ config: { url: string }; id: number }>;
    if (hooks.find((h) => h.config.url === `${appUrl}/api/webhook`)) {
      await addConnectedRepo(repoFullName, sid);
      return NextResponse.json({ ok: true, alreadyExists: true });
    }
  }

  const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "web", active: true, events: ["pull_request"],
      config: { url: `${appUrl}/api/webhook`, content_type: "json", secret, insecure_ssl: "0" },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    return NextResponse.json({ error: JSON.stringify(err) }, { status: createRes.status });
  }

  await addConnectedRepo(repoFullName, sid);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const sid = getSessionId(req);
  return NextResponse.json({ repos: sid ? await getConnectedRepos(sid) : [] });
}

export async function DELETE(req: NextRequest) {
  const sid = getSessionId(req);
  const token = await getToken(sid);
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { repoFullName } = await req.json() as { repoFullName: string };
  if (!repoFullName) return NextResponse.json({ error: "repoFullName required" }, { status: 400 });

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

  await removeConnectedRepo(repoFullName, sid);
  return NextResponse.json({ ok: true });
}

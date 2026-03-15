import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import { getOrigin } from "@/lib/origin";
import { NextRequest, NextResponse } from "next/server";
import { getPRDiff, getPRFiles, postPRComment, buildClaimComment } from "@/lib/github";
import { scorePR } from "@/lib/scorer";
import { addClaim, getTokenForRepo, getClaimByPR } from "@/lib/store";
import { emitEvent } from "@/lib/events";

const g = global as typeof global & { _githubToken?: string };

export const runtime = "nodejs";

function validateSig(body: string, sig: string, secret: string): boolean {
  if (!secret) return true;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  try { return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event") ?? "";
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";

  if (!validateSig(body, sig, secret)) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(body); }
  catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  if (event !== "pull_request") return NextResponse.json({ ok: true, skipped: true });

  const action = payload.action as string;
  if (!["opened", "synchronize", "reopened"].includes(action)) return NextResponse.json({ ok: true, skipped: true });

  handlePR(payload, getOrigin(req)).catch(console.error);
  return NextResponse.json({ ok: true });
}

async function handlePR(payload: Record<string, unknown>, appUrl: string) {
  const pr = payload.pull_request as Record<string, unknown>;
  const repoData = payload.repository as Record<string, unknown>;
  const repoFullName = repoData.full_name as string;
  const [owner, repoName] = repoFullName.split("/");
  const prNumber = pr.number as number;
  const prUrl = pr.html_url as string;
  const prTitle = pr.title as string;
  const prBody = (pr.body as string) || "";
  const username = (pr.user as Record<string, unknown>).login as string;
  const additions = pr.additions as number;
  const deletions = pr.deletions as number;
  const changedFiles = pr.changed_files as number;

  console.log(`[webhook] PR #${prNumber} "${prTitle}" by @${username} in ${repoFullName}`);

  if (await getClaimByPR(repoFullName, prNumber)) {
    console.log(`[webhook] PR #${prNumber} already has a claim, skipping`);
    return;
  }

  const repoToken = await getTokenForRepo(repoFullName);
  g._githubToken = repoToken;
  const [diff, files] = await Promise.all([
    getPRDiff(owner, repoName, prNumber),
    getPRFiles(owner, repoName, prNumber),
  ]);

  const scored = await scorePR({ title: prTitle, body: prBody, additions, deletions, changedFiles, files, diff });
  console.log(`[webhook] Scored PR #${prNumber}: ${scored.score}/100`);

  const token = randomUUID();
  const claimUrl = `${appUrl}/claim/${token}`;
  const claim = {
    token, githubUsername: username, repo: repoFullName,
    prNumber, prUrl, prTitle,
    score: scored.score, reasoning: scored.reasoning, category: scored.category,
    claimed: false, createdAt: new Date().toISOString(),
  };

  await addClaim(claim);

  const commentBody = buildClaimComment(username, scored.score, scored.reasoning, scored.category, claimUrl);
  try {
    await postPRComment(owner, repoName, prNumber, commentBody);
  } catch (err) {
    console.error("[webhook] Failed to post comment:", err);
  }

  emitEvent("new_claim", claim);
}

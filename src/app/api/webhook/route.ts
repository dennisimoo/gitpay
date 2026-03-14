import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import { getOrigin } from "@/lib/origin";
import { NextRequest, NextResponse } from "next/server";
import { getPRDiff, getPRFiles, postPRComment, buildClaimComment } from "@/lib/github";
import { scorePR } from "@/lib/scorer";
import { addClaim } from "@/lib/store";
import { emitEvent } from "@/lib/events";

export const runtime = "nodejs";

const MIN_SCORE_TO_COMMENT = 0; // comment on everything for demo; raise to 25 in prod

function validateSig(body: string, sig: string, secret: string): boolean {
  if (!secret) return true; // skip validation if no secret set
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event") ?? "";
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";

  if (!validateSig(body, sig, secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Only process pull_request events (opened or synchronize = new commits pushed)
  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const action = payload.action as string;
  if (!["opened", "synchronize", "reopened"].includes(action)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Process async so GitHub doesn't time out
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

  // Fetch diff and file list
  const [diff, files] = await Promise.all([
    getPRDiff(owner, repoName, prNumber),
    getPRFiles(owner, repoName, prNumber),
  ]);

  // Score with Gemini via Replicate
  const scored = await scorePR({
    title: prTitle,
    body: prBody,
    additions,
    deletions,
    changedFiles,
    files,
    diff,
  });

  console.log(`[webhook] Scored PR #${prNumber}: ${scored.score}/100 (${scored.category})`);

  // Create a unique claim token
  const token = randomUUID();
  const claimUrl = `${appUrl}/claim/${token}`;

  // Store the claim
  const claim = {
    token,
    githubUsername: username,
    repo: repoFullName,
    prNumber,
    prUrl,
    prTitle,
    score: scored.score,
    reasoning: scored.reasoning,
    category: scored.category,
    claimed: false,
    createdAt: new Date().toISOString(),
  };
  addClaim(claim);

  // Post comment on the PR if score meets threshold
  if (scored.score >= MIN_SCORE_TO_COMMENT) {
    const commentBody = buildClaimComment(
      username,
      scored.score,
      scored.reasoning,
      scored.category,
      claimUrl
    );
    try {
      await postPRComment(owner, repoName, prNumber, commentBody);
      console.log(`[webhook] Commented on PR #${prNumber} with claim link`);
    } catch (err) {
      console.error("[webhook] Failed to post comment:", err);
    }
  }

  // Push live update to dashboard
  emitEvent("new_claim", claim);
}

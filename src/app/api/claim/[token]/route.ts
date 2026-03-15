import { NextRequest, NextResponse } from "next/server";
import { getClaim, markClaimed, addTransaction } from "@/lib/store";
import { executePayout, isPayoutsEnabled, EXPLORER_BASE, CLUSTER_PARAM } from "@/lib/treasury";
import { emitEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claim = await getClaim(token);
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(claim);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claim = await getClaim(token);

  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  if (claim.claimed) return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  if (!isPayoutsEnabled()) {
    return NextResponse.json({ error: "Payouts not configured" }, { status: 503 });
  }

  const { walletAddress } = await req.json() as { walletAddress: string };
  if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  const amountSol = ((claim.score / 100) * 0.05).toFixed(6);

  try {
    const txHash = await executePayout(walletAddress, amountSol);
    const explorerUrl = `${EXPLORER_BASE}/${txHash}${CLUSTER_PARAM}`;

    await markClaimed(token, walletAddress, txHash, explorerUrl);
    await addTransaction({
      txHash, explorerUrl,
      githubUsername: claim.githubUsername,
      walletAddress, amountEth: amountSol,
      score: claim.score, repo: claim.repo, prUrl: claim.prUrl,
      timestamp: new Date().toISOString(),
    });

    emitEvent("claimed", { token, txHash, explorerUrl, githubUsername: claim.githubUsername, amountSol });
    return NextResponse.json({ success: true, txHash, explorerUrl, amountSol });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

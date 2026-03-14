import { NextRequest, NextResponse } from "next/server";
import { getClaim, markClaimed, addTransaction } from "@/lib/store";
import { executePayout, isPayoutsEnabled } from "@/lib/treasury";
import { emitEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claim = getClaim(token);
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(claim);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claim = getClaim(token);

  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  if (claim.claimed) return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  if (!isPayoutsEnabled()) {
    return NextResponse.json({ error: "Payouts not configured — add TREASURY_PRIVATE_KEY to .env" }, { status: 503 });
  }

  const { walletAddress } = await req.json() as { walletAddress: string };
  if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  // Calculate SOL amount — proportional to score, 0.05 SOL per 100 points
  const amountEth = ((claim.score / 100) * 0.05).toFixed(6);

  const EXPLORER_BASE = process.env.SOLANA_EXPLORER_BASE || "https://explorer.solana.com/tx";
  const CLUSTER_PARAM = process.env.SOLANA_CLUSTER_PARAM || "?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899";

  try {
    const txHash = await executePayout(walletAddress, amountEth);
    const explorerUrl = `${EXPLORER_BASE}/${txHash}${CLUSTER_PARAM}`;

    markClaimed(token, walletAddress, txHash, explorerUrl);

    addTransaction({
      txHash,
      explorerUrl,
      githubUsername: claim.githubUsername,
      walletAddress,
      amountEth,
      score: claim.score,
      repo: claim.repo,
      prUrl: claim.prUrl,
      timestamp: new Date().toISOString(),
    });

    emitEvent("claimed", { token, txHash, explorerUrl, githubUsername: claim.githubUsername, amountEth });

    return NextResponse.json({ success: true, txHash, explorerUrl, amountEth });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

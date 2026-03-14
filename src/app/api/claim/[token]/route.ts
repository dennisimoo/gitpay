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
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // Calculate ETH amount — proportional to score, capped at 0.002 ETH per claim
  const amountEth = ((claim.score / 100) * 0.002).toFixed(6);

  try {
    const txHash = await executePayout(walletAddress, amountEth);
    const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;

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

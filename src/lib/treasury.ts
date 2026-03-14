import { ethers } from "ethers";
import { getLeaderboard, recordTransaction } from "./store";

const TOTAL_ETH_PER_ROUND = "0.005"; // 0.005 ETH split per round
const MIN_SCORE_THRESHOLD = 10;
const EXPLORER_BASE = "https://sepolia.basescan.org/tx";

function getWallet() {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  const rpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  if (!pk) throw new Error("TREASURY_PRIVATE_KEY not configured — add it to .env to enable real payouts");
  const provider = new ethers.JsonRpcProvider(rpc);
  return new ethers.Wallet(pk, provider);
}

export function isPayoutsEnabled(): boolean {
  return !!process.env.TREASURY_PRIVATE_KEY;
}

export async function getTreasuryBalance(): Promise<string> {
  try {
    const wallet = getWallet();
    const balance = await wallet.provider!.getBalance(
      process.env.TREASURY_ADDRESS || wallet.address
    );
    return ethers.formatEther(balance);
  } catch {
    return "0.000";
  }
}

export interface PayoutResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  contributor: string;
  amountEth: string;
  error?: string;
}

export async function executePayout(
  toAddress: string,
  amountEth: string
): Promise<string> {
  const wallet = getWallet();
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amountEth),
  });
  await tx.wait(1);
  return tx.hash;
}

export async function triggerPayoutRound(): Promise<PayoutResult[]> {
  const leaderboard = getLeaderboard();
  const eligible = leaderboard.filter(
    (c) =>
      !c.flagged &&
      c.walletAddress &&
      c.totalScore - c.totalPaidOut > MIN_SCORE_THRESHOLD
  );

  if (eligible.length === 0) return [];

  const totalPendingScore = eligible.reduce(
    (sum, c) => sum + (c.totalScore - c.totalPaidOut),
    0
  );
  const totalEth = parseFloat(TOTAL_ETH_PER_ROUND);
  const results: PayoutResult[] = [];

  for (const contributor of eligible) {
    const pendingScore = contributor.totalScore - contributor.totalPaidOut;
    const share = pendingScore / totalPendingScore;
    const amountEth = (totalEth * share).toFixed(6);

    try {
      const txHash = await executePayout(contributor.walletAddress!, amountEth);
      recordTransaction({
        txHash,
        githubUsername: contributor.githubUsername,
        walletAddress: contributor.walletAddress!,
        amountEth,
        scoreRedeemed: pendingScore,
        timestamp: new Date().toISOString(),
      });

      results.push({
        success: true,
        txHash,
        explorerUrl: `${EXPLORER_BASE}/${txHash}`,
        contributor: contributor.githubUsername,
        amountEth,
      });
    } catch (err) {
      results.push({
        success: false,
        contributor: contributor.githubUsername,
        amountEth,
        error: String(err),
      });
    }
  }

  return results;
}

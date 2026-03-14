import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getLeaderboard, recordTransaction } from "./store";

const TOTAL_SOL_PER_ROUND = 0.05;
const MIN_SCORE_THRESHOLD = 10;
const RPC_URL = process.env.SOLANA_RPC_URL || "http://localhost:8899";
const EXPLORER_BASE = process.env.SOLANA_EXPLORER_BASE || "https://explorer.solana.com/tx";
const CLUSTER_PARAM = process.env.SOLANA_CLUSTER_PARAM || "?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899";

function getConnection() {
  return new Connection(RPC_URL, "confirmed");
}

function getKeypair(): Keypair {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error("TREASURY_PRIVATE_KEY not set");
  const bytes = JSON.parse(pk) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

export function isPayoutsEnabled(): boolean {
  return !!process.env.TREASURY_PRIVATE_KEY;
}

export async function getTreasuryBalance(): Promise<string> {
  try {
    const connection = getConnection();
    const keypair = getKeypair();
    const address = process.env.TREASURY_ADDRESS
      ? new PublicKey(process.env.TREASURY_ADDRESS)
      : keypair.publicKey;
    const balance = await connection.getBalance(address);
    return (balance / LAMPORTS_PER_SOL).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export async function executePayout(toAddress: string, amountSol: string): Promise<string> {
  const connection = getConnection();
  const keypair = getKeypair();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports: Math.floor(parseFloat(amountSol) * LAMPORTS_PER_SOL),
    })
  );
  return await sendAndConfirmTransaction(connection, tx, [keypair]);
}

export interface PayoutResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  contributor: string;
  amountSol: string;
  error?: string;
}

export async function triggerPayoutRound(): Promise<PayoutResult[]> {
  const leaderboard = getLeaderboard();
  const eligible = leaderboard.filter(
    (c) => !c.flagged && c.walletAddress && c.totalScore - c.totalPaidOut > MIN_SCORE_THRESHOLD
  );

  if (eligible.length === 0) return [];

  const totalPendingScore = eligible.reduce((sum, c) => sum + (c.totalScore - c.totalPaidOut), 0);
  const results: PayoutResult[] = [];

  for (const contributor of eligible) {
    const pendingScore = contributor.totalScore - contributor.totalPaidOut;
    const share = pendingScore / totalPendingScore;
    const amountSol = (TOTAL_SOL_PER_ROUND * share).toFixed(6);

    try {
      const txHash = await executePayout(contributor.walletAddress!, amountSol);
      recordTransaction({
        txHash,
        githubUsername: contributor.githubUsername,
        walletAddress: contributor.walletAddress!,
        amountEth: amountSol,
        scoreRedeemed: pendingScore,
        timestamp: new Date().toISOString(),
      });
      results.push({
        success: true,
        txHash,
        explorerUrl: `${EXPLORER_BASE}/${txHash}${CLUSTER_PARAM}`,
        contributor: contributor.githubUsername,
        amountSol,
      });
    } catch (err) {
      results.push({ success: false, contributor: contributor.githubUsername, amountSol, error: String(err) });
    }
  }

  return results;
}

/**
 * In-memory store — no database.
 * State survives hot-reload via global singletons.
 */

export interface Claim {
  token: string;
  githubUsername: string;
  repo: string;
  prNumber: number;
  prUrl: string;
  prTitle: string;
  score: number;
  reasoning: string;
  category: string;
  walletAddress?: string;
  claimed: boolean;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
}

export interface Transaction {
  txHash: string;
  explorerUrl: string;
  githubUsername: string;
  walletAddress: string;
  amountEth: string;
  score: number;
  repo: string;
  prUrl: string;
  timestamp: string;
}

const g = global as typeof global & {
  _claims: Map<string, Claim>;
  _transactions: Transaction[];
};

if (!g._claims) {
  g._claims = new Map();
  g._transactions = [];
}

export const claims = g._claims;
export const transactions = g._transactions;

export function addClaim(claim: Claim): void {
  g._claims.set(claim.token, claim);
}

export function getClaim(token: string): Claim | undefined {
  return g._claims.get(token);
}

export function markClaimed(token: string, walletAddress: string, txHash: string, explorerUrl: string): void {
  const claim = g._claims.get(token);
  if (claim) {
    claim.walletAddress = walletAddress;
    claim.claimed = true;
    claim.txHash = txHash;
    claim.explorerUrl = explorerUrl;
  }
}

export function addTransaction(tx: Transaction): void {
  g._transactions.unshift(tx);
  if (g._transactions.length > 200) g._transactions.splice(200);
}

export function getAllClaims(): Claim[] {
  return Array.from(g._claims.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getStats() {
  const all = Array.from(g._claims.values());
  return {
    total: all.length,
    claimed: all.filter((c) => c.claimed).length,
    pending: all.filter((c) => !c.claimed).length,
    avgScore: all.length ? Math.round(all.reduce((s, c) => s + c.score, 0) / all.length) : 0,
  };
}

export interface LeaderboardEntry {
  githubUsername: string;
  totalScore: number;
  totalPaidOut: number;
  walletAddress?: string;
  flagged: boolean;
}

export function getLeaderboard(): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  for (const claim of g._claims.values()) {
    const existing = map.get(claim.githubUsername);
    if (existing) {
      existing.totalScore += claim.score;
      if (claim.walletAddress) existing.walletAddress = claim.walletAddress;
    } else {
      map.set(claim.githubUsername, {
        githubUsername: claim.githubUsername,
        totalScore: claim.score,
        totalPaidOut: 0,
        walletAddress: claim.walletAddress,
        flagged: false,
      });
    }
  }
  for (const tx of g._transactions) {
    const entry = map.get(tx.githubUsername);
    if (entry) entry.totalPaidOut += parseFloat(tx.amountEth) * 1000;
  }
  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export function getTreasuryStats() {
  return getStats();
}

export function getRecentContributionCount(username: string, windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return Array.from(g._claims.values()).filter(
    (c) => c.githubUsername === username && new Date(c.createdAt).getTime() > cutoff
  ).length;
}

export function getRecentScores(username: string, last: number): number[] {
  return Array.from(g._claims.values())
    .filter((c) => c.githubUsername === username)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, last)
    .map((c) => c.score);
}

export function recordTransaction(tx: Omit<Transaction, "explorerUrl" | "score" | "repo" | "prUrl"> & { scoreRedeemed?: number }): void {
  addTransaction({
    txHash: tx.txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${tx.txHash}`,
    githubUsername: tx.githubUsername,
    walletAddress: tx.walletAddress,
    amountEth: tx.amountEth,
    score: tx.scoreRedeemed ?? 0,
    repo: "",
    prUrl: "",
    timestamp: tx.timestamp,
  });
}

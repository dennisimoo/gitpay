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

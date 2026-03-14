import { db } from "./db";

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

function rowToClaim(r: Record<string, unknown>): Claim {
  return {
    token: r.token as string,
    githubUsername: r.github_username as string,
    repo: r.repo as string,
    prNumber: r.pr_number as number,
    prUrl: r.pr_url as string,
    prTitle: r.pr_title as string,
    score: r.score as number,
    reasoning: r.reasoning as string,
    category: r.category as string,
    walletAddress: (r.wallet_address as string) || undefined,
    claimed: Boolean(r.claimed),
    txHash: (r.tx_hash as string) || undefined,
    explorerUrl: (r.explorer_url as string) || undefined,
    createdAt: r.created_at as string,
  };
}

function rowToTx(r: Record<string, unknown>): Transaction {
  return {
    txHash: r.tx_hash as string,
    explorerUrl: r.explorer_url as string,
    githubUsername: r.github_username as string,
    walletAddress: r.wallet_address as string,
    amountEth: r.amount_eth as string,
    score: r.score as number,
    repo: r.repo as string,
    prUrl: r.pr_url as string,
    timestamp: r.timestamp as string,
  };
}

export function addClaim(claim: Claim): void {
  db.prepare(`
    INSERT OR REPLACE INTO claims
    (token, github_username, repo, pr_number, pr_url, pr_title, score, reasoning, category, wallet_address, claimed, tx_hash, explorer_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    claim.token, claim.githubUsername, claim.repo, claim.prNumber,
    claim.prUrl, claim.prTitle, claim.score, claim.reasoning, claim.category,
    claim.walletAddress ?? null, claim.claimed ? 1 : 0,
    claim.txHash ?? null, claim.explorerUrl ?? null, claim.createdAt
  );
}

export function getClaim(token: string): Claim | undefined {
  const row = db.prepare("SELECT * FROM claims WHERE token = ?").get(token);
  return row ? rowToClaim(row as Record<string, unknown>) : undefined;
}

export function markClaimed(token: string, walletAddress: string, txHash: string, explorerUrl: string): void {
  db.prepare(`
    UPDATE claims SET claimed = 1, wallet_address = ?, tx_hash = ?, explorer_url = ? WHERE token = ?
  `).run(walletAddress, txHash, explorerUrl, token);
}

export function addTransaction(tx: Transaction): void {
  db.prepare(`
    INSERT OR REPLACE INTO transactions
    (tx_hash, explorer_url, github_username, wallet_address, amount_eth, score, repo, pr_url, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tx.txHash, tx.explorerUrl, tx.githubUsername, tx.walletAddress,
    tx.amountEth, tx.score, tx.repo, tx.prUrl, tx.timestamp
  );
}

export function getAllClaims(): Claim[] {
  const rows = db.prepare("SELECT * FROM claims ORDER BY created_at DESC").all();
  return rows.map((r) => rowToClaim(r as Record<string, unknown>));
}

export const transactions = {
  get all() {
    return db.prepare("SELECT * FROM transactions ORDER BY timestamp DESC").all().map((r) => rowToTx(r as Record<string, unknown>));
  }
};

export function getStats() {
  const all = getAllClaims();
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
  const all = getAllClaims();
  const txs = db.prepare("SELECT * FROM transactions").all().map((r) => rowToTx(r as Record<string, unknown>));
  const map = new Map<string, LeaderboardEntry>();
  for (const claim of all) {
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
  for (const tx of txs) {
    const entry = map.get(tx.githubUsername);
    if (entry) entry.totalPaidOut += parseFloat(tx.amountEth) * 1000;
  }
  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export function getTreasuryStats() {
  return getStats();
}

export function getRecentContributionCount(username: string, windowMs: number): number {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM claims WHERE github_username = ? AND created_at > ?"
  ).get(username, cutoff) as { cnt: number };
  return row.cnt;
}

export function getRecentScores(username: string, last: number): number[] {
  const rows = db.prepare(
    "SELECT score FROM claims WHERE github_username = ? ORDER BY created_at DESC LIMIT ?"
  ).all(username, last) as { score: number }[];
  return rows.map((r) => r.score);
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

// KV helpers for github token
export function kvSet(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)").run(key, value);
}

export function kvGet(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

// Connected repos (session-scoped)
export function getConnectedRepos(sessionId: string): string[] {
  return (db.prepare("SELECT repo_full_name FROM connected_repos WHERE session_id = ?").all(sessionId) as { repo_full_name: string }[]).map((r) => r.repo_full_name);
}

export function addConnectedRepo(repoFullName: string, sessionId: string): void {
  db.prepare("INSERT OR IGNORE INTO connected_repos (repo_full_name, session_id) VALUES (?, ?)").run(repoFullName, sessionId);
}

export function removeConnectedRepo(repoFullName: string, sessionId: string): void {
  db.prepare("DELETE FROM connected_repos WHERE repo_full_name = ? AND session_id = ?").run(repoFullName, sessionId);
}

export function getTokenForRepo(repoFullName: string): string | undefined {
  const row = db.prepare("SELECT session_id FROM connected_repos WHERE repo_full_name = ? LIMIT 1").get(repoFullName) as { session_id: string } | undefined;
  if (!row) return undefined;
  return kvGet(`github_token:${row.session_id}`);
}

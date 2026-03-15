import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_URL!;
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL!;
const PB_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD!;

const g = global as typeof global & { _pb?: PocketBase };

async function pb(): Promise<PocketBase> {
  if (!g._pb) {
    g._pb = new PocketBase(PB_URL);
    g._pb.autoCancellation(false);
  }
  if (!g._pb.authStore.isValid) {
    await g._pb.collection("_superusers").authWithPassword(PB_EMAIL, PB_PASSWORD);
  }
  return g._pb;
}

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

function toClaim(r: Record<string, unknown>): Claim {
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
    createdAt: (r.created_at as string) || (r.created as string),
  };
}

function toTx(r: Record<string, unknown>): Transaction {
  return {
    txHash: r.tx_hash as string,
    explorerUrl: r.explorer_url as string,
    githubUsername: r.github_username as string,
    walletAddress: r.wallet_address as string,
    amountEth: (r.amount_sol as string) || (r.amount_eth as string),
    score: r.score as number,
    repo: r.repo as string,
    prUrl: r.pr_url as string,
    timestamp: (r.timestamp as string) || (r.created as string),
  };
}

export async function addClaim(claim: Claim): Promise<void> {
  const client = await pb();
  await client.collection("claims").create({
    token: claim.token,
    github_username: claim.githubUsername,
    repo: claim.repo,
    pr_number: claim.prNumber,
    pr_url: claim.prUrl,
    pr_title: claim.prTitle,
    score: claim.score,
    reasoning: claim.reasoning,
    category: claim.category,
    claimed: claim.claimed,
    tx_hash: claim.txHash || "",
    explorer_url: claim.explorerUrl || "",
    created_at: claim.createdAt,
  });
}

export async function getClaim(token: string): Promise<Claim | undefined> {
  try {
    const client = await pb();
    const res = await client.collection("claims").getList(1, 1, { filter: `token = "${token}"` });
    return res.items.length ? toClaim(res.items[0] as unknown as Record<string, unknown>) : undefined;
  } catch { return undefined; }
}

export async function getClaimByPR(repo: string, prNumber: number): Promise<Claim | undefined> {
  try {
    const client = await pb();
    const res = await client.collection("claims").getList(1, 1, {
      filter: `repo = "${repo.replace(/"/g, '\\"')}" && pr_number = ${prNumber}`,
    });
    return res.items.length ? toClaim(res.items[0] as unknown as Record<string, unknown>) : undefined;
  } catch { return undefined; }
}

export async function markClaimed(token: string, walletAddress: string, txHash: string, explorerUrl: string): Promise<void> {
  const client = await pb();
  const res = await client.collection("claims").getList(1, 1, { filter: `token = "${token}"` });
  if (!res.items.length) return;
  await client.collection("claims").update(res.items[0].id, {
    claimed: true, wallet_address: walletAddress, tx_hash: txHash, explorer_url: explorerUrl,
  });
}

export async function addTransaction(tx: Transaction): Promise<void> {
  const client = await pb();
  await client.collection("transactions").create({
    tx_hash: tx.txHash,
    explorer_url: tx.explorerUrl,
    github_username: tx.githubUsername,
    wallet_address: tx.walletAddress,
    amount_sol: tx.amountEth,
    score: tx.score,
    repo: tx.repo,
    pr_url: tx.prUrl,
    timestamp: tx.timestamp,
  });
}

export async function getAllClaims(): Promise<Claim[]> {
  const client = await pb();
  const records = await client.collection("claims").getFullList({ sort: "-created" });
  return records.map((r) => toClaim(r as unknown as Record<string, unknown>));
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const client = await pb();
  const records = await client.collection("transactions").getFullList({ sort: "-created" });
  return records.map((r) => toTx(r as unknown as Record<string, unknown>));
}

export async function getStats() {
  const all = await getAllClaims();
  return {
    total: all.length,
    claimed: all.filter((c) => c.claimed).length,
    pending: all.filter((c) => !c.claimed).length,
    avgScore: all.length ? Math.round(all.reduce((s, c) => s + c.score, 0) / all.length) : 0,
  };
}

export async function kvSet(key: string, value: string): Promise<void> {
  const client = await pb();
  const res = await client.collection("kv").getList(1, 1, { filter: `key = "${key}"` }).catch(() => ({ items: [] as unknown[] }));
  if (res.items.length > 0) {
    await client.collection("kv").update((res.items[0] as { id: string }).id, { value });
  } else {
    await client.collection("kv").create({ key, value });
  }
}

export async function kvGet(key: string): Promise<string | undefined> {
  try {
    const client = await pb();
    const res = await client.collection("kv").getList(1, 1, { filter: `key = "${key}"` });
    return res.items.length ? (res.items[0] as unknown as Record<string, unknown>).value as string : undefined;
  } catch { return undefined; }
}

export async function getConnectedRepos(sessionId: string): Promise<string[]> {
  try {
    const client = await pb();
    const records = await client.collection("connected_repos").getFullList({ filter: `session_id = "${sessionId}"` });
    return records.map((r) => (r as unknown as Record<string, unknown>).repo_full_name as string);
  } catch { return []; }
}

export async function addConnectedRepo(repoFullName: string, sessionId: string): Promise<void> {
  const client = await pb();
  const res = await client.collection("connected_repos").getList(1, 1, {
    filter: `repo_full_name = "${repoFullName.replace(/"/g, '\\"')}" && session_id = "${sessionId}"`,
  }).catch(() => ({ items: [] as unknown[] }));
  if (!res.items.length) {
    await client.collection("connected_repos").create({ repo_full_name: repoFullName, session_id: sessionId });
  }
}

export async function removeConnectedRepo(repoFullName: string, sessionId: string): Promise<void> {
  try {
    const client = await pb();
    const res = await client.collection("connected_repos").getList(1, 1, {
      filter: `repo_full_name = "${repoFullName.replace(/"/g, '\\"')}" && session_id = "${sessionId}"`,
    });
    if (res.items.length) await client.collection("connected_repos").delete(res.items[0].id);
  } catch { /* ignore */ }
}

export async function getTokenForRepo(repoFullName: string): Promise<string | undefined> {
  try {
    const client = await pb();
    const res = await client.collection("connected_repos").getList(1, 1, {
      filter: `repo_full_name = "${repoFullName.replace(/"/g, '\\"')}"`,
    });
    if (!res.items.length) return undefined;
    const sessionId = (res.items[0] as unknown as Record<string, unknown>).session_id as string;
    return kvGet(`github_token:${sessionId}`);
  } catch { return undefined; }
}

export interface LeaderboardEntry {
  githubUsername: string;
  totalScore: number;
  totalPaidOut: number;
  walletAddress?: string;
  flagged: boolean;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [all, txs] = await Promise.all([getAllClaims(), getAllTransactions()]);
  const map = new Map<string, LeaderboardEntry>();
  for (const claim of all) {
    const e = map.get(claim.githubUsername);
    if (e) {
      e.totalScore += claim.score;
      if (claim.walletAddress) e.walletAddress = claim.walletAddress;
    } else {
      map.set(claim.githubUsername, { githubUsername: claim.githubUsername, totalScore: claim.score, totalPaidOut: 0, walletAddress: claim.walletAddress, flagged: false });
    }
  }
  for (const tx of txs) {
    const e = map.get(tx.githubUsername);
    if (e) e.totalPaidOut += parseFloat(tx.amountEth) * 1000;
  }
  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export async function getTreasuryStats() {
  return getStats();
}

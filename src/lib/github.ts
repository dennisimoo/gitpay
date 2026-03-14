import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function getPRDiff(owner: string, repo: string, pullNumber: number): Promise<string> {
  try {
    const { data } = await octokit.pulls.get({
      owner, repo, pull_number: pullNumber,
      mediaType: { format: "diff" },
    });
    // diff can be large — cap at 8000 chars for the scorer
    return String(data).slice(0, 8000);
  } catch {
    return "";
  }
}

export async function getPRFiles(owner: string, repo: string, pullNumber: number) {
  try {
    const { data } = await octokit.pulls.listFiles({
      owner, repo, pull_number: pullNumber, per_page: 30,
    });
    return data.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: (f.patch || "").slice(0, 500),
    }));
  } catch {
    return [];
  }
}

export async function postPRComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
): Promise<void> {
  await octokit.issues.createComment({
    owner, repo, issue_number: pullNumber, body,
  });
}

export function buildClaimComment(
  username: string,
  score: number,
  reasoning: string,
  category: string,
  claimUrl: string
): string {
  const emoji = score >= 70 ? "🏆" : score >= 40 ? "⭐" : "✅";
  const label = category.replace("_", " ");

  return `## ${emoji} GitPay AI Review

**Score: ${score}/100** · ${label}

> ${reasoning}

---

Hey @${username} — your contribution has been reviewed and scored by AI. If your score is ≥ 25, you can claim an ETH reward on Base Sepolia:

**[→ Claim your reward](${claimUrl})**

*Powered by [GitPay](${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}) · AI scoring by Gemini · Payouts on Base Sepolia*`;
}

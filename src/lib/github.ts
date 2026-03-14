import { Octokit } from "@octokit/rest";

function getOctokit(token?: string) {
  return new Octokit({ auth: token });
}

export async function getPRDiff(owner: string, repo: string, pullNumber: number, token?: string): Promise<string> {
  try {
    const { data } = await getOctokit(token).pulls.get({
      owner, repo, pull_number: pullNumber,
      mediaType: { format: "diff" },
    });
    return String(data).slice(0, 8000);
  } catch {
    return "";
  }
}

export async function getPRFiles(owner: string, repo: string, pullNumber: number, token?: string) {
  try {
    const { data } = await getOctokit(token).pulls.listFiles({
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

export async function postPRComment(owner: string, repo: string, pullNumber: number, body: string, token?: string): Promise<void> {
  await getOctokit(token).issues.createComment({ owner, repo, issue_number: pullNumber, body });
}

export function buildClaimComment(username: string, score: number, reasoning: string, category: string, claimUrl: string): string {
  return `**GitPay** reviewed this pull request.

| | |
|---|---|
| Score | **${score} / 100** |
| Category | ${category.replace("_", " ")} |

${reasoning}

Thanks for the contribution, @${username}. [Claim your reward](${claimUrl}) on Solana.

---

<sub>Scored by Gemini · Paid out by GitPay</sub>`;
}

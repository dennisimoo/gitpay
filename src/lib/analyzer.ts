import { Octokit } from "@octokit/rest";

export interface ContributionObject {
  contributor: string;
  eventType: string;
  repo: string;
  rawUrl: string;
  complexitySignals: Record<string, unknown>;
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function analyze(
  eventType: string,
  payload: Record<string, unknown>
): Promise<ContributionObject | null> {
  try {
    if (eventType === "pull_request") {
      const action = payload.action as string;
      if (!["opened", "closed", "synchronize"].includes(action)) return null;
      return analyzePR(payload);
    }
    if (eventType === "pull_request_review") {
      if ((payload.action as string) !== "submitted") return null;
      return analyzeReview(payload);
    }
    if (eventType === "issues") {
      if ((payload.action as string) !== "closed") return null;
      return analyzeIssue(payload);
    }
    if (eventType === "push") {
      if (payload.deleted) return null;
      return analyzePush(payload);
    }
    return null;
  } catch (e) {
    console.error("[analyzer]", e);
    return null;
  }
}

async function analyzePR(payload: Record<string, unknown>): Promise<ContributionObject> {
  const pr = payload.pull_request as Record<string, unknown>;
  const repo = (payload.repository as Record<string, unknown>).full_name as string;
  const contributor = (pr.user as Record<string, unknown>).login as string;

  let filePaths: string[] = [];
  try {
    const [owner, repoName] = repo.split("/");
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: pr.number as number,
      per_page: 30,
    });
    filePaths = data.map((f) => f.filename);
  } catch {
    // ignore — GitHub token may not be set
  }

  return {
    contributor,
    eventType: "pull_request",
    repo,
    rawUrl: pr.html_url as string,
    complexitySignals: {
      action: payload.action,
      merged: pr.merged,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      title: pr.title,
      body: ((pr.body as string) || "").slice(0, 800),
      draft: pr.draft,
      filePaths,
    },
  };
}

function analyzeReview(payload: Record<string, unknown>): ContributionObject {
  const review = payload.review as Record<string, unknown>;
  const pr = payload.pull_request as Record<string, unknown>;
  const repo = (payload.repository as Record<string, unknown>).full_name as string;

  return {
    contributor: (review.user as Record<string, unknown>).login as string,
    eventType: "pull_request_review",
    repo,
    rawUrl: review.html_url as string,
    complexitySignals: {
      state: review.state,
      body: ((review.body as string) || "").slice(0, 800),
      prTitle: pr.title,
      prAdditions: pr.additions,
      prDeletions: pr.deletions,
    },
  };
}

function analyzeIssue(payload: Record<string, unknown>): ContributionObject {
  const issue = payload.issue as Record<string, unknown>;
  const repo = (payload.repository as Record<string, unknown>).full_name as string;
  const closedBy = issue.closed_by as Record<string, unknown> | null;
  const user = issue.user as Record<string, unknown>;
  const contributor = (closedBy?.login ?? user.login) as string;

  return {
    contributor,
    eventType: "issues",
    repo,
    rawUrl: issue.html_url as string,
    complexitySignals: {
      title: issue.title,
      body: ((issue.body as string) || "").slice(0, 800),
      labels: (issue.labels as Array<Record<string, unknown>>).map((l) => l.name),
      comments: issue.comments,
    },
  };
}

function analyzePush(payload: Record<string, unknown>): ContributionObject {
  const repo = (payload.repository as Record<string, unknown>).full_name as string;
  const pusher = (payload.pusher as Record<string, unknown>).name as string;
  const commits = (payload.commits as Array<Record<string, unknown>>) || [];

  return {
    contributor: pusher,
    eventType: "push",
    repo,
    rawUrl: payload.compare as string,
    complexitySignals: {
      commitCount: commits.length,
      messages: commits.slice(0, 5).map((c) => (c.message as string).slice(0, 150)),
      addedFiles: commits.reduce((n, c) => n + ((c.added as unknown[]) || []).length, 0),
      modifiedFiles: commits.reduce((n, c) => n + ((c.modified as unknown[]) || []).length, 0),
    },
  };
}

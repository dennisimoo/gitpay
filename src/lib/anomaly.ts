import { getRecentContributionCount, getRecentScores } from "./store";

export interface AnomalyResult {
  isAnomalous: boolean;
  reason: string;
  adjustedScore: number;
}

export function checkAnomaly(
  username: string,
  eventType: string,
  score: number,
  payload?: Record<string, unknown>
): AnomalyResult {
  // 1. Self-merge detection
  if (eventType === "pull_request") {
    const pr = payload?.pull_request as Record<string, unknown> | undefined;
    if (pr?.merged) {
      const mergedBy = (pr.merged_by as Record<string, unknown> | null)?.login;
      const author = (pr.user as Record<string, unknown>)?.login;
      if (mergedBy && author && mergedBy === author) {
        return {
          isAnomalous: true,
          reason: "Self-merged PR detected",
          adjustedScore: 0,
        };
      }
    }
  }

  // 2. Spike detection — >5 contributions in last hour
  const recentCount = getRecentContributionCount(username, 3_600_000);
  if (recentCount > 5) {
    return {
      isAnomalous: true,
      reason: `Spike: ${recentCount} contributions in last hour`,
      adjustedScore: Math.round(score / 2),
    };
  }

  // 3. Trivial spam — last 3 scores all < 15
  const recentScores = getRecentScores(username, 3);
  if (recentScores.length === 3 && recentScores.every((s) => s < 15)) {
    return {
      isAnomalous: true,
      reason: "Consecutive trivial contributions flagged",
      adjustedScore: Math.round(score / 2),
    };
  }

  return { isAnomalous: false, reason: "", adjustedScore: score };
}

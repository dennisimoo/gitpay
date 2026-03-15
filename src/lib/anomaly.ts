export interface AnomalyResult {
  isAnomalous: boolean;
  reason: string;
  adjustedScore: number;
}

export function checkAnomaly(
  _username: string,
  eventType: string,
  score: number,
  payload?: Record<string, unknown>
): AnomalyResult {
  if (eventType === "pull_request") {
    const pr = payload?.pull_request as Record<string, unknown> | undefined;
    if (pr?.merged) {
      const mergedBy = (pr.merged_by as Record<string, unknown> | null)?.login;
      const author = (pr.user as Record<string, unknown>)?.login;
      if (mergedBy && author && mergedBy === author) {
        return { isAnomalous: true, reason: "Self-merged PR detected", adjustedScore: 0 };
      }
    }
  }
  return { isAnomalous: false, reason: "", adjustedScore: score };
}

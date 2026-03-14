"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";

interface Contribution {
  id: number;
  githubUsername: string;
  eventType: string;
  repo: string;
  score: number;
  reasoning?: string;
  category?: string;
  rawUrl?: string;
  timestamp: string;
  anomalyFlagged: boolean;
  anomalyReason?: string;
}

const EVENT_LABELS: Record<string, string> = {
  pull_request: "PR",
  pull_request_review: "REVIEW",
  issues: "ISSUE",
  push: "PUSH",
};

const BADGE_CLASS: Record<string, string> = {
  pull_request: "badge-pr",
  pull_request_review: "badge-review",
  issues: "badge-issue",
  push: "badge-push",
};

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const pct = (Math.min(score, 100) / 100) * circ;
  const opacity = 0.3 + (score / 100) * 0.7;

  return (
    <div className="relative flex-shrink-0" style={{ width: 46, height: 46 }}>
      <svg width={46} height={46} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={23} cy={23} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} />
        <circle
          cx={23} cy={23} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={2.5}
          strokeDasharray={`${pct} ${circ}`}
          strokeLinecap="round"
          style={{ opacity, filter: "drop-shadow(0 0 3px rgba(255,255,255,0.5))" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center stat-num text-xs"
        style={{ color: "#fff" }}
      >
        {score}
      </span>
    </div>
  );
}

function Card({ c, fresh }: { c: Contribution; fresh: boolean }) {
  return (
    <div
      className={`card p-4 flex gap-3 items-start ${fresh ? "card-in card-active" : ""}`}
    >
      <img
        src={`https://github.com/${c.githubUsername}.png?size=40`}
        alt={c.githubUsername}
        className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            `https://api.dicebear.com/7.x/initials/svg?seed=${c.githubUsername}&backgroundColor=111111&textColor=ffffff`;
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2 items-center mb-1">
          <span
            className="text-sm font-semibold"
            style={{ color: "#fff", fontFamily: "'Rajdhani',sans-serif" }}
          >
            @{c.githubUsername}
          </span>
          <span className={`badge ${BADGE_CLASS[c.eventType] ?? "badge-push"}`}>
            {EVENT_LABELS[c.eventType] ?? c.eventType}
          </span>
          {c.anomalyFlagged && (
            <span className="badge badge-flag">⚠ flagged</span>
          )}
        </div>

        <div
          className="text-xs mb-1.5 truncate"
          style={{ color: "#555", fontFamily: "'JetBrains Mono',monospace" }}
        >
          {c.repo}
          {c.rawUrl && (
            <a href={c.rawUrl} target="_blank" rel="noreferrer"
              className="inline-flex ml-1.5 opacity-40 hover:opacity-80 transition-opacity">
              <ExternalLink size={10} />
            </a>
          )}
        </div>

        {c.reasoning && (
          <p className="text-xs leading-relaxed" style={{ color: "#888" }}>
            {c.reasoning}
          </p>
        )}

        <p className="text-xs mt-1.5" style={{ color: "#3a3a3a" }}>
          {formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}
        </p>
      </div>

      <ScoreRing score={c.score} />
    </div>
  );
}

export default function ActivityFeed() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [freshId, setFreshId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/contributions")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (e) => {
      const { type, data } = JSON.parse(e.data);
      if (type === "contribution") {
        setItems((prev) => [data, ...prev.slice(0, 49)]);
        setFreshId(data.id);
        setTimeout(() => setFreshId(null), 3000);
      }
    };
    return () => es.close();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <span className="section-label">Live Activity</span>
        <div className="live-dot" />
        <span className="text-xs" style={{ color: "#333" }}>{items.length}</span>
      </div>

      <div
        className="flex flex-col gap-2.5 overflow-y-auto flex-1 pr-0.5"
        style={{ maxHeight: "calc(100vh - 310px)" }}
      >
        {items.length === 0 && (
          <div
            className="card border-dashed p-10 text-center"
            style={{ color: "#333" }}
          >
            <div className="text-3xl mb-2">—</div>
            <p className="text-sm">Waiting for GitHub events</p>
            <p className="text-xs mt-1" style={{ color: "#222" }}>
              Push a commit or merge a PR
            </p>
          </div>
        )}
        {items.map((c) => (
          <Card key={c.id} c={c} fresh={c.id === freshId} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Contributor {
  githubUsername: string;
  totalScore: number;
  totalPaidOut: number;
  walletAddress?: string;
  flagged: boolean;
}

function shortenAddr(a?: string) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function pendingEth(pendingScore: number, totalScore: number): string {
  if (totalScore === 0) return "0";
  return ((pendingScore / totalScore) * 0.005).toFixed(5);
}

export default function Leaderboard() {
  const [board, setBoard] = useState<Contributor[]>([]);
  const [totalScore, setTotalScore] = useState(1);

  const load = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const { leaderboard, stats } = await res.json();
      setBoard(leaderboard);
      setTotalScore(stats.totalScore || 1);
    } catch {}
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data);
      if (type === "contribution" || type === "payout") load();
    };
    return () => es.close();
  }, []);

  const max = board[0]?.totalScore || 1;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="section-label">Leaderboard</span>
        <span className="text-xs" style={{ color: "#333" }}>{board.length} devs</span>
      </div>

      <div className="card overflow-hidden">
        {/* Header */}
        <div
          className="grid px-4 py-2.5 text-xs border-b"
          style={{
            gridTemplateColumns: "28px 1fr 120px 80px 80px",
            color: "#333",
            fontFamily: "'Rajdhani',sans-serif",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            borderColor: "#1a1a1a",
          }}
        >
          <div>#</div>
          <div>Dev</div>
          <div>Score</div>
          <div className="text-right">Wallet</div>
          <div className="text-right">Payout</div>
        </div>

        {board.length === 0 && (
          <div className="py-12 text-center" style={{ color: "#2a2a2a" }}>
            <p className="text-sm">No contributors yet</p>
          </div>
        )}

        {board.map((c, i) => {
          const barPct = (c.totalScore / max) * 100;
          const pending = Math.max(0, c.totalScore - c.totalPaidOut);
          const eth = pendingEth(pending, totalScore);

          return (
            <div
              key={c.githubUsername}
              className="grid px-4 py-3 items-center border-b last:border-b-0 hover:bg-white/[0.02] transition-colors group"
              style={{
                gridTemplateColumns: "28px 1fr 120px 80px 80px",
                borderColor: "#151515",
              }}
            >
              {/* Rank */}
              <div
                className="stat-num text-sm"
                style={{ color: i < 3 ? "#fff" : "#333" }}
              >
                {i + 1}
              </div>

              {/* Dev */}
              <div className="flex items-center gap-2.5">
                <img
                  src={`https://github.com/${c.githubUsername}.png?size=32`}
                  alt={c.githubUsername}
                  className="w-6 h-6 rounded-full"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/initials/svg?seed=${c.githubUsername}&backgroundColor=111111&textColor=ffffff`;
                  }}
                />
                <span
                  className="text-sm font-semibold truncate"
                  style={{
                    color: c.flagged ? "#555" : "#ddd",
                    fontFamily: "'Rajdhani',sans-serif",
                  }}
                >
                  {c.githubUsername}
                </span>
              </div>

              {/* Score bar */}
              <div className="flex items-center gap-2 pr-4">
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: "#1a1a1a" }}
                >
                  <div
                    className="h-full rounded-full bar-animate"
                    style={{
                      "--fill-pct": `${barPct}%`,
                      width: `${barPct}%`,
                      background: i === 0
                        ? "#fff"
                        : `rgba(255,255,255,${0.25 + (barPct / 100) * 0.55})`,
                    } as React.CSSProperties}
                  />
                </div>
                <span
                  className="stat-num text-xs w-8 text-right"
                  style={{ color: i === 0 ? "#fff" : "#888" }}
                >
                  {Math.round(c.totalScore)}
                </span>
              </div>

              {/* Wallet */}
              <div
                className="text-right text-xs opacity-30 group-hover:opacity-70 transition-opacity"
                style={{
                  color: "#aaa",
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                {shortenAddr(c.walletAddress)}
              </div>

              {/* Payout */}
              <div
                className="text-right text-xs stat-num"
                style={{ color: pending > 0 ? "#aaa" : "#2a2a2a" }}
              >
                {pending > 0 ? `${eth}` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

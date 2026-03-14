"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Topbar from "@/components/Topbar";
import { ExternalLink, GitPullRequest, Clock, CheckCircle2, BarChart3 } from "lucide-react";


interface Claim {
  token: string;
  githubUsername: string;
  repo: string;
  prNumber: number;
  prUrl: string;
  prTitle: string;
  score: number;
  reasoning: string;
  category: string;
  claimed: boolean;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  claimed: number;
  pending: number;
  avgScore: number;
}

function CategoryPill({ cat }: { cat: string }) {
  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 500,
      background: "transparent",
      color: "#71717a",
      border: "1px solid #e4e4e7",
    }}>
      {cat.replace("_", " ")}
    </span>
  );
}

export default function Overview() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, claimed: 0, pending: 0, avgScore: 0 });

  const load = async () => {
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();
      setClaims(data.claims ?? []);
      setStats(data.stats ?? { total: 0, claimed: 0, pending: 0, avgScore: 0 });
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
      if (type === "new_claim" || type === "claimed") load();
    };
    return () => es.close();
  }, []);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const statCards = [
    { label: "PRs Reviewed",  value: stats.total,    icon: <GitPullRequest size={15} /> },
    { label: "Pending Claims", value: stats.pending, icon: <Clock size={15} /> },
    { label: "Claimed",        value: stats.claimed, icon: <CheckCircle2 size={15} /> },
    { label: "Avg Score",      value: stats.avgScore, icon: <BarChart3 size={15} />, suffix: "/100" },
  ];

  return (
    <>
      <Topbar />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 40px 48px" }}>
        {/* Page header */}
        <div style={{ marginBottom: "32px", marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#000" }}>Overview</h1>
          </div>
          <p style={{ fontSize: "13px", color: "#71717a" }}>
            PRs are reviewed automatically. Contributors get a link to claim ETH on Base Sepolia.
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px", maxWidth: "800px" }}>
          {statCards.map((s) => (
            <div key={s.label} style={{ border: "1px solid #e4e4e7", borderRadius: "10px", padding: "16px 18px", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", color: "#a1a1aa" }}>
                {s.icon}
                <span style={{ fontSize: "12px", color: "#71717a", fontWeight: 500 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: "26px", fontWeight: 600, color: "#000", fontVariantNumeric: "tabular-nums" }}>
                {s.value}{s.suffix ?? ""}
              </div>
            </div>
          ))}
        </div>

        {/* Claims list */}
        <div style={{ maxWidth: "800px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#000" }}>Recent Reviews</span>
            {claims.length > 0 && (
              <span style={{ fontSize: "12px", color: "#71717a" }}>{claims.length} total</span>
            )}
          </div>

          {claims.length === 0 ? (
            <div style={{
              border: "1px dashed #e4e4e7",
              borderRadius: "12px",
              padding: "48px 24px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#000", marginBottom: "6px" }}>
                No pull requests reviewed yet
              </p>
              <p style={{ fontSize: "13px", color: "#71717a", maxWidth: "360px", margin: "0 auto 16px" }}>
                Connect a repository, then open a pull request. GitPay will review the code and post a claim link as a comment.
              </p>
              <a
                href="/setup"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "7px 16px", background: "#000", color: "#fff",
                  borderRadius: "7px", fontSize: "13px", fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Connect a repository
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M5 3l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          ) : (
            <div style={{ border: "1px solid #e4e4e7", borderRadius: "12px", overflow: "hidden" }}>
              {claims.map((c, i) => (
                <div key={c.token} style={{
                  display: "flex",
                  gap: "16px",
                  padding: "16px 20px",
                  borderBottom: i < claims.length - 1 ? "1px solid #e4e4e7" : "none",
                  background: "#fff",
                  alignItems: "flex-start",
                  animation: "fadeIn 0.2s ease-out",
                }}>
                  {/* Avatar */}
                  <img
                    src={`https://github.com/${c.githubUsername}.png?size=36`}
                    alt={c.githubUsername}
                    style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, border: "1px solid #e4e4e7" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${c.githubUsername}`; }}
                  />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>
                        @{c.githubUsername}
                      </span>
                      <CategoryPill cat={c.category} />
                      {c.claimed ? (
                        <span style={{ fontSize: "11px", color: "#71717a", fontWeight: 500 }}>claimed</span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: 500 }}>pending</span>
                      )}
                    </div>

                    <a href={c.prUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: "13px", color: "#3f3f46", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                      <span style={{ fontFamily: "Geist Mono, monospace", fontSize: "11px", color: "#a1a1aa" }}>
                        {c.repo}#{c.prNumber}
                      </span>
                      <span style={{ fontWeight: 500 }}>{c.prTitle}</span>
                      <ExternalLink size={11} style={{ color: "#a1a1aa", flexShrink: 0 }} />
                    </a>

                    <p style={{ fontSize: "12px", color: "#71717a", lineHeight: 1.5, marginBottom: "6px" }}>
                      {c.reasoning}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                      {!c.claimed && (
                        <a
                          href={`${appUrl}/claim/${c.token}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: "11px", color: "#000", fontWeight: 500, textDecoration: "none" }}
                        >
                          claim link →
                        </a>
                      )}
                      {c.claimed && c.explorerUrl && (
                        <a href={c.explorerUrl} target="_blank" rel="noreferrer"
                          style={{ fontSize: "11px", color: "#71717a", fontWeight: 500, textDecoration: "none" }}>
                          view tx →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#000", fontVariantNumeric: "tabular-nums" }}>
                      {c.score}
                    </div>
                    <div style={{ fontSize: "10px", color: "#a1a1aa" }}>/ 100</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

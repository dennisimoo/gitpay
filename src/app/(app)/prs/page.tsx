"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Topbar from "@/components/Topbar";
import { ExternalLink, GitMerge, Clock, CheckCircle2 } from "lucide-react";

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
  explorerUrl?: string;
  createdAt: string;
}

function scoreColor(s: number) {
  if (s >= 60) return "#10b981";
  if (s >= 30) return "#f59e0b";
  return "#71717a";
}

export default function PRsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "claimed">("all");

  const load = async () => {
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();
      setClaims(data.claims ?? []);
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

  const filtered = claims.filter((c) => {
    if (filter === "pending") return !c.claimed;
    if (filter === "claimed") return c.claimed;
    return true;
  });

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <Topbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "0 40px 48px" }}>
        <div style={{ marginBottom: "24px", marginTop: "12px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#000", marginBottom: "6px" }}>Pull Requests</h1>
          <p style={{ fontSize: "13px", color: "#71717a" }}>Every PR reviewed by AI. Contributors can claim ETH for their work.</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
          {(["all", "pending", "claimed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: "7px", border: "1px solid",
              borderColor: filter === f ? "#000" : "#e4e4e7",
              background: filter === f ? "#000" : "#fff",
              color: filter === f ? "#fff" : "#71717a",
              fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize",
            }}>
              {f}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: "800px" }}>
          {filtered.length === 0 ? (
            <div style={{ border: "1px dashed #e4e4e7", borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}><GitMerge size={28} strokeWidth={1.5} color="#d4d4d8" style={{ display: "inline-block" }} /></div>
              <p style={{ fontSize: "14px", color: "#71717a" }}>No pull requests yet</p>
            </div>
          ) : (
            <div style={{ border: "1px solid #e4e4e7", borderRadius: "12px", overflow: "hidden" }}>
              {filtered.map((c, i) => (
                <div key={c.token} style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  gap: "14px",
                  padding: "16px 20px",
                  borderBottom: i < filtered.length - 1 ? "1px solid #e4e4e7" : "none",
                  alignItems: "start",
                }}>
                  <img
                    src={`https://github.com/${c.githubUsername}.png?size=36`}
                    alt={c.githubUsername}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e4e4e7" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${c.githubUsername}`; }}
                  />

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>@{c.githubUsername}</span>
                      <a href={c.prUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: "12px", color: "#3b82f6", textDecoration: "none", display: "flex", alignItems: "center", gap: "3px" }}>
                        {c.repo}#{c.prNumber}
                        <ExternalLink size={10} />
                      </a>
                      {c.claimed ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#10b981" }}>
                          <CheckCircle2 size={11} /> claimed
                        </span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#f59e0b" }}>
                          <Clock size={11} /> pending
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#000", marginBottom: "4px" }}>{c.prTitle}</p>
                    <p style={{ fontSize: "12px", color: "#71717a", lineHeight: 1.5, marginBottom: "6px" }}>{c.reasoning}</p>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                      {!c.claimed && (
                        <a href={`${appUrl}/claim/${c.token}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}>
                          claim link →
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", paddingTop: "2px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: scoreColor(c.score), fontVariantNumeric: "tabular-nums" }}>{c.score}</div>
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

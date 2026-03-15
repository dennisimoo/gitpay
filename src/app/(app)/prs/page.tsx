"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Topbar from "@/components/Topbar";
import { ExternalLink, GitMerge, Clock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

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

function PRRow({ c, appUrl, isLast }: { c: Claim; appUrl: string; isLast: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid #e4e4e7" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "grid",
          gridTemplateColumns: "36px 1fr auto auto",
          gap: "14px",
          padding: "16px 20px",
          alignItems: "start",
          cursor: "pointer",
        }}
      >
        <img
          src={`https://github.com/${c.githubUsername}.png?size=36`}
          alt={c.githubUsername}
          style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e4e4e7" }}
          onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${c.githubUsername}`; }}
        />

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>@{c.githubUsername}</span>
            <a href={c.prUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
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
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#000", marginBottom: "2px" }}>{c.prTitle}</p>
          <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div style={{ textAlign: "right", paddingTop: "2px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: scoreColor(c.score), fontVariantNumeric: "tabular-nums" }}>{c.score}</div>
          <div style={{ fontSize: "10px", color: "#a1a1aa" }}>/ 100</div>
        </div>

        <div style={{ paddingTop: "6px", color: "#a1a1aa" }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 20px 16px 70px", background: "#fafafa", borderTop: "1px solid #f4f4f5" }}>
          <div style={{ display: "flex", gap: "24px", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#a1a1aa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Score</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: scoreColor(c.score) }}>{c.score}<span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: 400 }}>/100</span></div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "#a1a1aa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Category</div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#000", textTransform: "capitalize" }}>{c.category.replace("_", " ")}</div>
            </div>
          </div>
          <div style={{ fontSize: "10px", color: "#a1a1aa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>AI Reasoning</div>
          <p style={{ fontSize: "13px", color: "#3f3f46", lineHeight: 1.6, marginBottom: "10px" }}>{c.reasoning}</p>
          {!c.claimed && (
            <a href={`${appUrl}/claim/${c.token}`} target="_blank" rel="noreferrer"
              style={{ fontSize: "12px", color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}>
              claim link →
            </a>
          )}
          {c.explorerUrl && (
            <a href={c.explorerUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: "12px", color: "#10b981", fontWeight: 500, textDecoration: "none", marginLeft: "12px" }}>
              view on Solana →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function PRsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "claimed">("all");
  const [search, setSearch] = useState("");

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
    if (filter === "pending" && c.claimed) return false;
    if (filter === "claimed" && !c.claimed) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.githubUsername.toLowerCase().includes(q) || c.repo.toLowerCase().includes(q) || c.prTitle.toLowerCase().includes(q);
    }
    return true;
  });

  const avgScore = claims.length ? Math.round(claims.reduce((s, c) => s + c.score, 0) / claims.length) : 0;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <Topbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px 48px" }}>

        {/* Stats row */}
        {claims.length > 0 && (
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", maxWidth: "800px" }}>
            {[
              { label: "Total PRs", value: claims.length },
              { label: "Pending", value: claims.filter(c => !c.claimed).length },
              { label: "Claimed", value: claims.filter(c => c.claimed).length },
              { label: "Avg Score", value: avgScore },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, border: "1px solid #e4e4e7", borderRadius: "10px", padding: "12px 16px" }}>
                <div style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: 500, marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#000" }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", maxWidth: "800px" }}>
          <div style={{ display: "flex", gap: "4px" }}>
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by contributor, repo, or title…"
            style={{
              flex: 1, padding: "6px 12px", border: "1px solid #e4e4e7", borderRadius: "7px",
              fontSize: "12px", fontFamily: "inherit", color: "#000", outline: "none", background: "#fff",
            }}
          />
        </div>

        <div style={{ maxWidth: "800px" }}>
          {filtered.length === 0 ? (
            <div style={{ border: "1px dashed #e4e4e7", borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
              <GitMerge size={28} strokeWidth={1.5} color="#d4d4d8" style={{ display: "inline-block", marginBottom: "10px" }} />
              <p style={{ fontSize: "14px", color: "#71717a" }}>{search ? "No results matched your search" : "No pull requests yet"}</p>
            </div>
          ) : (
            <div style={{ border: "1px solid #e4e4e7", borderRadius: "12px", overflow: "hidden" }}>
              {filtered.map((c, i) => (
                <PRRow key={c.token} c={c} appUrl={appUrl} isLast={i === filtered.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

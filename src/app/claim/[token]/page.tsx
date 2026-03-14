"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { ExternalLink, Loader2, Check, AlertCircle, GitPullRequest } from "lucide-react";

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

function scoreColor(s: number) {
  if (s >= 60) return "#10b981";
  if (s >= 30) return "#f59e0b";
  return "#71717a";
}

function ethFromScore(score: number) {
  return ((score / 100) * 0.002).toFixed(6);
}

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [wallet, setWallet] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{ txHash: string; explorerUrl: string; amountEth: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/claim/${token}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return; }
        setClaim(await r.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      setError("Enter a valid Ethereum address (0x...)");
      return;
    }
    setClaiming(true);
    setError("");
    try {
      const res = await fetch(`/api/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setResult(data);
      setClaim((prev) => prev ? { ...prev, claimed: true } : prev);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <Loader2 size={20} style={{ animation: "spin 0.8s linear infinite", color: "#a1a1aa" }} />
      </div>
    );
  }

  if (notFound || !claim) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ textAlign: "center", maxWidth: "360px", padding: "24px" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>🔍</div>
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#000", marginBottom: "8px" }}>Claim not found</h1>
          <p style={{ fontSize: "13px", color: "#71717a" }}>This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  const amountEth = ethFromScore(claim.score);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2"  width="20" height="5" rx="2.5" fill="#000" />
            <rect x="2" y="9"  width="13" height="5" rx="2.5" fill="#10b981" />
            <rect x="2" y="16" width="20" height="5" rx="2.5" fill="#000" />
          </svg>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#000" }}>GitPay</span>
        </div>

        {/* Card */}
        <div style={{ border: "1px solid #e4e4e7", borderRadius: "16px", overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {/* PR info */}
          <div style={{ padding: "24px", borderBottom: "1px solid #e4e4e7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <img
                src={`https://github.com/${claim.githubUsername}.png?size=48`}
                alt={claim.githubUsername}
                style={{ width: 48, height: 48, borderRadius: "50%", border: "1px solid #e4e4e7" }}
                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${claim.githubUsername}`; }}
              />
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#000" }}>@{claim.githubUsername}</div>
                <div style={{ fontSize: "12px", color: "#71717a" }}>eligible for reward</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: "28px", fontWeight: 700, color: scoreColor(claim.score), fontVariantNumeric: "tabular-nums" }}>
                  {claim.score}
                </div>
                <div style={{ fontSize: "10px", color: "#a1a1aa" }}>/ 100</div>
              </div>
            </div>

            <a href={claim.prUrl} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "1px solid #e4e4e7", borderRadius: "8px", textDecoration: "none", background: "#fafafa" }}>
              <GitPullRequest size={14} style={{ color: "#71717a", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontFamily: "Geist Mono, monospace", color: "#a1a1aa", marginBottom: "2px" }}>
                  {claim.repo}#{claim.prNumber}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {claim.prTitle}
                </div>
              </div>
              <ExternalLink size={12} style={{ color: "#a1a1aa", flexShrink: 0 }} />
            </a>

            <p style={{ fontSize: "12px", color: "#71717a", marginTop: "12px", lineHeight: 1.6 }}>
              {claim.reasoning}
            </p>
          </div>

          {/* Reward + claim */}
          <div style={{ padding: "20px 24px" }}>
            {result ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Check size={22} style={{ color: "#10b981" }} />
                </div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#000", marginBottom: "4px" }}>
                  {result.amountEth} ETH sent!
                </div>
                <p style={{ fontSize: "12px", color: "#71717a", marginBottom: "14px" }}>
                  Your reward is on its way on Base Sepolia.
                </p>
                <a href={result.explorerUrl} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}>
                  View transaction
                  <ArrowUpRight size={12} />
                </a>
              </div>
            ) : claim.claimed ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: "14px", color: "#71717a" }}>This reward has already been claimed.</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#000" }}>{amountEth} ETH</div>
                  <div style={{ fontSize: "12px", color: "#71717a" }}>on Base Sepolia</div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 500, color: "#3f3f46", display: "block", marginBottom: "6px" }}>
                    Your wallet address
                  </label>
                  <input
                    type="text"
                    value={wallet}
                    onChange={(e) => { setWallet(e.target.value); setError(""); }}
                    placeholder="0x..."
                    style={{
                      width: "100%", padding: "9px 12px", border: `1px solid ${error ? "#ef4444" : "#e4e4e7"}`,
                      borderRadius: "8px", fontSize: "13px", fontFamily: "Geist Mono, monospace",
                      outline: "none", color: "#000", background: "#fff",
                    }}
                  />
                  {error && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", fontSize: "11px", color: "#ef4444" }}>
                      <AlertCircle size={11} />
                      {error}
                    </div>
                  )}
                </div>

                <button
                  onClick={submit}
                  disabled={claiming || !wallet}
                  style={{
                    width: "100%", padding: "10px", background: claiming || !wallet ? "#f4f4f5" : "#000",
                    color: claiming || !wallet ? "#a1a1aa" : "#fff",
                    border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500,
                    cursor: claiming || !wallet ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    fontFamily: "inherit", transition: "background 0.15s",
                  }}
                >
                  {claiming ? (
                    <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Sending...</>
                  ) : "Claim reward"}
                </button>

                <p style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "10px", textAlign: "center" }}>
                  Testnet ETH only. Your score of {claim.score}/100 earns {amountEth} ETH.
                </p>
              </>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: "#d4d4d8", marginTop: "20px" }}>
          Powered by GitPay · AI scoring by Gemini · Base Sepolia
        </p>
      </div>
    </div>
  );
}

function ArrowUpRight({ size }: { size: number }) {
  return <ExternalLink size={size} />;
}

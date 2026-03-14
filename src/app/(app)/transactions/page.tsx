"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Topbar from "@/components/Topbar";
import { ArrowUpRight } from "lucide-react";

interface Transaction {
  txHash: string;
  explorerUrl: string;
  githubUsername: string;
  walletAddress: string;
  amountEth: string;
  score: number;
  repo: string;
  prUrl: string;
  timestamp: string;
}

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/transactions");
      setTxs(await res.json());
    } catch {}
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data);
      if (type === "claimed") load();
    };
    return () => es.close();
  }, []);

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 40px 48px" }}>
        <div style={{ marginBottom: "24px", marginTop: "32px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#000", marginBottom: "6px" }}>Transactions</h1>
          <p style={{ fontSize: "13px", color: "#71717a" }}>On-chain payouts sent on Solana.</p>
        </div>

        <div style={{ maxWidth: "800px" }}>
          {txs.length === 0 ? (
            <div style={{ border: "1px dashed #e4e4e7", borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "#71717a", marginBottom: "6px" }}>No transactions yet</p>
              <p style={{ fontSize: "12px", color: "#a1a1aa" }}>
                Transactions appear here once a contributor claims their reward.
              </p>
            </div>
          ) : (
            <div style={{ border: "1px solid #e4e4e7", borderRadius: "12px", overflow: "hidden" }}>
              {/* Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr 120px 120px 100px",
                gap: "12px",
                padding: "10px 20px",
                borderBottom: "1px solid #e4e4e7",
                background: "#fafafa",
                fontSize: "11px",
                fontWeight: 600,
                color: "#71717a",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                <div />
                <div>Contributor</div>
                <div>Tx Hash</div>
                <div>Wallet</div>
                <div style={{ textAlign: "right" }}>Amount</div>
              </div>

              {txs.map((tx, i) => (
                <div key={tx.txHash} style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 120px 120px 100px",
                  gap: "12px",
                  padding: "14px 20px",
                  borderBottom: i < txs.length - 1 ? "1px solid #e4e4e7" : "none",
                  alignItems: "center",
                }}>
                  <img
                    src={`https://github.com/${tx.githubUsername}.png?size=36`}
                    alt={tx.githubUsername}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e4e4e7" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${tx.githubUsername}`; }}
                  />

                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#000", marginBottom: "2px" }}>
                      @{tx.githubUsername}
                    </div>
                    <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                      {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                    </div>
                  </div>

                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: "3px",
                      fontSize: "11px", color: "#3b82f6", textDecoration: "none",
                      fontFamily: "Geist Mono, monospace",
                    }}
                  >
                    {shortHash(tx.txHash)}
                    <ArrowUpRight size={10} />
                  </a>

                  <div style={{ fontSize: "11px", color: "#71717a", fontFamily: "Geist Mono, monospace" }}>
                    {shortAddr(tx.walletAddress)}
                  </div>

                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#10b981", textAlign: "right" }}>
                    {tx.amountEth} SOL
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

"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight } from "lucide-react";

interface Transaction {
  txHash: string;
  githubUsername: string;
  walletAddress: string;
  amountEth: string;
  scoreRedeemed: number;
  timestamp: string;
}

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function TransactionHistory() {
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
      if (type === "payout") load();
    };
    return () => es.close();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="section-label">Transactions</span>
        <span className="text-xs" style={{ color: "#333" }}>{txs.length}</span>
      </div>

      {txs.length === 0 ? (
        <div
          className="card border-dashed p-8 text-center"
          style={{ color: "#2a2a2a", borderStyle: "dashed" }}
        >
          <p className="text-sm">No payouts yet — trigger a round to send ETH on Base Sepolia</p>
        </div>
      ) : (
        <div className="relative pl-5">
          {/* Vertical line */}
          <div
            className="absolute left-0 top-2 bottom-2 w-px"
            style={{ background: "linear-gradient(to bottom, #333, transparent)" }}
          />

          <div className="flex flex-col gap-3">
            {txs.map((tx) => (
              <div key={tx.txHash} className="relative flex gap-4">
                <div className="timeline-dot absolute -left-[21px]" />
                <div className="card flex-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://github.com/${tx.githubUsername}.png?size=24`}
                        alt={tx.githubUsername}
                        className="w-5 h-5 rounded-full"
                        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://api.dicebear.com/7.x/initials/svg?seed=${tx.githubUsername}&backgroundColor=111111&textColor=ffffff`;
                        }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#ccc", fontFamily: "'Rajdhani',sans-serif" }}
                      >
                        @{tx.githubUsername}
                      </span>
                      <span
                        className="stat-num text-base font-semibold"
                        style={{ color: "#fff" }}
                      >
                        {tx.amountEth} ETH
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs opacity-40 hover:opacity-90 transition-opacity"
                        style={{ color: "#aaa", fontFamily: "'JetBrains Mono',monospace" }}
                      >
                        {shortHash(tx.txHash)}
                        <ArrowUpRight size={11} />
                      </a>
                      <span className="text-xs" style={{ color: "#333" }}>
                        {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

const stats = [
  { label: "PRs Reviewed", value: "0" },
  { label: "Pending Claims", value: "0" },
  { label: "Claimed", value: "0" },
  { label: "Avg Score", value: "—" },
];

function GitPayLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="3.5" r="2" fill="currentColor" />
        <circle cx="3.5" cy="14.5" r="2" fill="currentColor" />
        <circle cx="14.5" cy="14.5" r="2" fill="currentColor" />
        <line x1="9" y1="5.5" x2="3.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="9" y1="5.5" x2="14.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span
        style={{ fontFamily: "var(--font-geist-mono)", letterSpacing: "-0.04em" }}
        className="text-[14px] font-semibold text-black"
      >
        GitPay
      </span>
    </div>
  );
}

type Review = {
  id: number;
  pr: string;
  repo: string;
  contributor: string;
  score: number;
  status: "pending" | "claimed" | "paid";
};

const mockReviews: Review[] = [];

export default function Home() {
  const [paying, setPaying] = useState(false);
  const [lastPayout, setLastPayout] = useState<string | null>(null);

  const handlePayout = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setLastPayout("0x" + Math.random().toString(16).slice(2, 18).toUpperCase());
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-geist-sans)" }}>
      {/* Nav */}
      <header className="border-b border-zinc-200 px-6 h-12 flex items-center justify-between">
        <GitPayLogo />
        <nav className="flex items-center gap-5">
          <a
            href="#"
            className="text-xs text-zinc-400 hover:text-black transition-colors flex items-center gap-1"
          >
            GitHub
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M7 1h4v4M11 1L5.5 6.5M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold text-black tracking-tight">Dashboard</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Contributor activity and payouts</p>
          </div>
          <button
            onClick={handlePayout}
            disabled={paying}
            className="h-8 px-3.5 bg-black text-white text-xs font-medium rounded hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {paying ? (
              <>
                <svg
                  className="animate-spin"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M6 1v2M6 9v2M1 6h2M9 6h2M2.22 2.22l1.41 1.41M8.36 8.36l1.41 1.41M2.22 9.78l1.41-1.41M8.36 3.64l1.41-1.41"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Processing
              </>
            ) : (
              "Trigger Payout Round"
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white px-5 py-4">
              <div
                style={{ fontFamily: "var(--font-geist-mono)" }}
                className="text-2xl font-semibold text-black tracking-tight"
              >
                {s.value}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Payout notification */}
        {lastPayout && (
          <div className="mb-6 border border-zinc-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
              <span className="text-xs text-zinc-500">
                Payout executed —{" "}
                <span
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                  className="text-black text-[11px]"
                >
                  {lastPayout}
                </span>
              </span>
            </div>
            <button
              onClick={() => setLastPayout(null)}
              className="text-zinc-300 hover:text-zinc-500 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 3l8 8M11 3L3 11"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Recent Reviews */}
        <div>
          <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-3">
            Recent Reviews
          </h2>
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            {mockReviews.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border border-zinc-200 rounded flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="1.5"
                      y="2.5"
                      width="11"
                      height="9"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M4 6h6M4 8.5h3.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-500">No pull requests reviewed yet</p>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Connect a GitHub webhook to start tracking contributions
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left px-5 py-3 text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                      Pull Request
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                      Contributor
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                      Score
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockReviews.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`${i !== mockReviews.length - 1 ? "border-b border-zinc-100" : ""} hover:bg-zinc-50 transition-colors`}
                    >
                      <td className="px-5 py-3">
                        <div className="text-black text-sm">{r.pr}</div>
                        <div
                          className="text-[11px] text-zinc-400"
                          style={{ fontFamily: "var(--font-geist-mono)" }}
                        >
                          {r.repo}
                        </div>
                      </td>
                      <td
                        className="px-5 py-3 text-xs text-zinc-600"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {r.contributor}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          style={{ fontFamily: "var(--font-geist-mono)" }}
                          className="text-sm text-black"
                        >
                          {r.score}
                        </span>
                        <span className="text-xs text-zinc-300">/100</span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                            r.status === "paid"
                              ? "border-zinc-300 text-zinc-400 bg-zinc-50"
                              : r.status === "claimed"
                              ? "border-black text-black"
                              : "border-zinc-200 text-zinc-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Webhook hint */}
        <div className="mt-5 border border-dashed border-zinc-200 rounded-lg px-4 py-3.5">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Point your GitHub webhook to{" "}
            <span
              style={{ fontFamily: "var(--font-geist-mono)" }}
              className="text-zinc-600"
            >
              POST /webhook
            </span>
            . When a PR is opened or merged, the bot will score the contribution and update this dashboard automatically.
          </p>
        </div>
      </main>
    </div>
  );
}

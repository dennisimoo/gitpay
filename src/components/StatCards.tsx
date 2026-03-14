"use client";

import { useEffect, useRef, useState } from "react";

interface Stats {
  contributorCount: number;
  totalScore: number;
  pendingScore: number;
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    if (prev.current === target) return;
    const start = prev.current;
    const end = target;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

const CARD_DEFS = [
  { key: "contributorCount", label: "Contributors",   suffix: "" },
  { key: "totalScore",       label: "Score Issued",   suffix: " pts" },
  { key: "pendingScore",     label: "Pending",        suffix: " pts" },
  { key: "treasury",         label: "Treasury",       suffix: " ETH" },
];

function StatCard({ label, raw, suffix, index }: {
  label: string; raw: number; suffix: string; index: number;
}) {
  const val = useCountUp(raw);
  return (
    <div
      className="card p-5 flex flex-col gap-2"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="section-label">{label}</span>
      <div className="stat-num text-3xl" style={{ color: "#fff" }}>
        {val.toLocaleString()}{suffix}
      </div>
      <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

export default function StatCards() {
  const [stats, setStats] = useState<Stats>({
    contributorCount: 0,
    totalScore: 0,
    pendingScore: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setStats({
        contributorCount: data.stats.contributorCount,
        totalScore: Math.round(data.stats.totalScore),
        pendingScore: Math.round(data.stats.pendingScore),
      });
    } catch {}
  };

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (e) => {
      const { type } = JSON.parse(e.data);
      if (type === "contribution" || type === "payout") fetchStats();
    };
    return () => es.close();
  }, []);

  const values: Record<string, number> = {
    contributorCount: stats.contributorCount,
    totalScore: stats.totalScore,
    pendingScore: stats.pendingScore,
    treasury: 42,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARD_DEFS.map((def, i) => (
        <StatCard
          key={def.key}
          label={def.label}
          raw={values[def.key]}
          suffix={def.suffix}
          index={i}
        />
      ))}
    </div>
  );
}

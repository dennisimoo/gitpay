"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, { title: string; desc: string }> = {
  "/":             { title: "Overview",      desc: "AI-reviewed pull requests and reward claims" },
  "/prs":          { title: "Pull Requests", desc: "All reviewed contributions and their scores" },
  "/transactions": { title: "Transactions",  desc: "Completed on-chain payouts on Base Sepolia" },
  "/setup":        { title: "Setup",         desc: "Configure your GitHub webhook and wallet" },
};

export default function Topbar({ action }: { action?: React.ReactNode }) {
  const pathname = usePathname();
  const meta = TITLES[pathname] ?? TITLES["/"];

  return (
    <div style={{
      padding: "0 32px",
      height: "60px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid var(--border)",
      background: "#fff",
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontSize: "15px", fontWeight: 600, color: "#000", lineHeight: 1.2 }}>
          {meta.title}
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>
          {meta.desc}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

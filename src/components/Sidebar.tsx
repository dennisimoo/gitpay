"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GitPullRequest, ArrowUpRight, Settings } from "lucide-react";

const nav = [
  { href: "/",             label: "Overview",      icon: LayoutDashboard },
  { href: "/prs",          label: "Pull Requests",  icon: GitPullRequest },
  { href: "/transactions", label: "Transactions",   icon: ArrowUpRight },
  { href: "/setup",        label: "Setup",          icon: Settings },
];

const GitPayLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="3.5" r="2" fill="#000" />
    <circle cx="3.5" cy="14.5" r="2" fill="#000" />
    <circle cx="14.5" cy="14.5" r="2" fill="#000" />
    <line x1="9" y1="5.5" x2="3.5" y2="12.5" stroke="#000" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="9" y1="5.5" x2="14.5" y2="12.5" stroke="#000" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "240px",
      minWidth: "240px",
      background: "#ffffff",
      borderRight: "1px solid #e4e4e7",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      padding: "24px 16px",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "32px",
        paddingLeft: "12px",
      }}>
        <GitPayLogo />
        <span style={{ fontWeight: 600, fontSize: "15px", color: "#000", letterSpacing: "-0.01em" }}>
          GitPay
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "7px 12px",
              borderRadius: "7px",
              textDecoration: "none",
              color: active ? "#000" : "#71717a",
              background: active ? "#f4f4f5" : "transparent",
              fontSize: "13.5px",
              fontWeight: active ? 500 : 400,
              transition: "background 0.1s, color 0.1s",
            }}>
              <Icon
                size={16}
                strokeWidth={active ? 2.2 : 1.75}
                style={{ color: active ? "#000" : "#a1a1aa", flexShrink: 0 }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}

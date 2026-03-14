"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import { Github, Check, Loader2, Plus, Lock, Globe, AlertCircle, X } from "lucide-react";
import { Suspense } from "react";

interface Repo {
  fullName: string;
  private: boolean;
  description: string | null;
}

function SetupContent() {
  const params = useSearchParams();
  const connected = params.get("connected") === "1";
  const oauthError = params.get("error");

  const [repos, setRepos] = useState<Repo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [installedRepos, setInstalledRepos] = useState<string[]>([]);
  const [installingRepo, setInstallingRepo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [installResults, setInstallResults] = useState<Record<string, "ok" | "error">>({});
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadRepos = useCallback(async (initial = false) => {
    if (!initial) setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json();
      setIsConnected(data.connected);
      setRepos(data.repos ?? []);
    } finally {
      setLoadingRepos(false);
      setInitialLoading(false);
    }
  }, []);

  const loadInstalled = useCallback(async () => {
    const res = await fetch("/api/github/install-webhook");
    const data = await res.json();
    setInstalledRepos(data.repos ?? []);
  }, []);

  useEffect(() => {
    loadRepos(true);
    loadInstalled();
  }, [loadRepos, loadInstalled]);

  const installWebhook = async (repoFullName: string) => {
    setInstallingRepo(repoFullName);
    try {
      const res = await fetch("/api/github/install-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName }),
      });
      if (res.ok) {
        setInstallResults((p) => ({ ...p, [repoFullName]: "ok" }));
        setInstalledRepos((p) => [...p, repoFullName]);
      } else {
        setInstallResults((p) => ({ ...p, [repoFullName]: "error" }));
      }
    } catch {
      setInstallResults((p) => ({ ...p, [repoFullName]: "error" }));
    } finally {
      setInstallingRepo(null);
    }
  };

  const disconnectWebhook = async (repoFullName: string) => {
    setDisconnecting(repoFullName);
    try {
      await fetch("/api/github/install-webhook", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName }),
      });
      setInstalledRepos((p) => p.filter((r) => r !== repoFullName));
      setInstallResults((p) => { const n = { ...p }; delete n[repoFullName]; return n; });
    } finally {
      setDisconnecting(null);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Topbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "0 40px 48px" }}>
        <div style={{ marginBottom: "28px", marginTop: "12px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#000", marginBottom: "6px" }}>Setup</h1>
          <p style={{ fontSize: "13px", color: "#71717a" }}>
            Connect a GitHub repository. When a PR is opened, GitPay reviews it and posts a claim link automatically.
          </p>
        </div>

        <div style={{ maxWidth: "640px" }}>
          {/* OAuth status */}
          {oauthError && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "12px 16px", borderRadius: "8px",
              background: "#fef2f2", border: "1px solid #fecaca",
              marginBottom: "20px", fontSize: "13px", color: "#dc2626",
            }}>
              <AlertCircle size={14} />
              GitHub connection failed. Check your OAuth credentials.
            </div>
          )}

          {/* Connect GitHub */}
          <div style={{ border: "1px solid #e4e4e7", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e4e4e7", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>GitHub Account</span>
              {isConnected && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#71717a", fontWeight: 500 }}>
                  <Check size={12} /> Connected
                </span>
              )}
            </div>
            <div style={{ padding: "20px" }}>
              {initialLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a1a1aa" }}>
                  <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: "13px" }}>Checking connection...</span>
                </div>
              ) : !isConnected ? (
                <>
                  <p style={{ fontSize: "13px", color: "#71717a", marginBottom: "14px" }}>
                    Authorize GitPay to access your repositories and install webhooks automatically.
                  </p>
                  <a
                    href="/api/github/auth"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      padding: "9px 18px", background: "#000", color: "#fff",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    <Github size={15} />
                    Connect GitHub
                  </a>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Github size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#000" }}>GitHub connected</div>
                    <div style={{ fontSize: "12px", color: "#71717a" }}>{repos.length} repositories found</div>
                  </div>
                  <button
                    onClick={() => loadRepos()}
                    style={{ marginLeft: "auto", padding: "5px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", background: "#fff", fontSize: "12px", color: "#71717a", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Repo picker */}
          {isConnected && (
            <div style={{ border: "1px solid #e4e4e7", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #e4e4e7", background: "#fafafa" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>Select Repositories</span>
              </div>

              {/* Search */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e4e4e7" }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search repositories..."
                  style={{
                    width: "100%", padding: "7px 11px",
                    border: "1px solid #e4e4e7", borderRadius: "7px",
                    fontSize: "13px", outline: "none", fontFamily: "inherit",
                    color: "#000", background: "#fff",
                  }}
                />
              </div>

              {loadingRepos ? (
                <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}>
                  <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite", color: "#a1a1aa" }} />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#71717a", fontSize: "13px" }}>
                  No repositories found
                </div>
              ) : (
                <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                  {filteredRepos.map((repo, i) => {
                    const isInstalled = installedRepos.includes(repo.fullName);
                    const isInstalling = installingRepo === repo.fullName;
                    const result = installResults[repo.fullName];

                    return (
                      <div key={repo.fullName} style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 16px",
                        borderBottom: i < filteredRepos.length - 1 ? "1px solid #f4f4f5" : "none",
                        background: "#fff",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                            {repo.private
                              ? <Lock size={12} style={{ color: "#a1a1aa", flexShrink: 0 }} />
                              : <Globe size={12} style={{ color: "#a1a1aa", flexShrink: 0 }} />
                            }
                            <span style={{ fontSize: "13px", fontWeight: 500, color: "#000", fontFamily: "Geist Mono, monospace" }}>
                              {repo.fullName}
                            </span>
                          </div>
                          {repo.description && (
                            <p style={{ fontSize: "11px", color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {repo.description}
                            </p>
                          )}
                        </div>

                        {isInstalled ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#71717a", fontWeight: 500 }}>
                              <Check size={13} /> Active
                            </div>
                            <button
                              onClick={() => disconnectWebhook(repo.fullName)}
                              disabled={disconnecting === repo.fullName}
                              title="Disconnect webhook"
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: 24, height: 24, border: "1px solid #e4e4e7",
                                borderRadius: "5px", background: "#fff", cursor: "pointer",
                                color: "#a1a1aa",
                              }}
                            >
                              {disconnecting === repo.fullName
                                ? <Loader2 size={11} style={{ animation: "spin 0.8s linear infinite" }} />
                                : <X size={11} />
                              }
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => installWebhook(repo.fullName)}
                            disabled={isInstalling}
                            style={{
                              display: "flex", alignItems: "center", gap: "5px",
                              padding: "5px 12px", border: "1px solid #e4e4e7",
                              borderRadius: "6px",
                              background: result === "error" ? "#fef2f2" : "#000",
                              color: result === "error" ? "#dc2626" : "#fff",
                              fontSize: "12px", fontWeight: 500,
                              cursor: isInstalling ? "not-allowed" : "pointer",
                              fontFamily: "inherit", flexShrink: 0,
                            }}
                          >
                            {isInstalling
                              ? <><Loader2 size={11} style={{ animation: "spin 0.8s linear infinite" }} /> Installing...</>
                              : result === "error"
                              ? <><AlertCircle size={11} /> Failed</>
                              : <><Plus size={11} /> Connect</>
                            }
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { Zap, Check, AlertCircle, Loader2 } from "lucide-react";

type State = "idle" | "loading" | "success" | "error";

export default function PayoutButton() {
  const [state, setState] = useState<State>("idle");
  const [count, setCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const trigger = async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/payout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payout failed");
      setCount(data.count);
      setState("success");
      setTimeout(() => setState("idle"), 5000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  };

  return (
    <button
      onClick={trigger}
      disabled={state === "loading"}
      className={`
        payout-btn
        fixed bottom-8 right-8 z-50
        flex items-center gap-2.5
        px-6 py-3.5 rounded-xl
        font-semibold text-sm tracking-widest uppercase
        border transition-all duration-300
        disabled:cursor-not-allowed
      `}
      style={{
        fontFamily: "'Rajdhani',sans-serif",
        background:
          state === "success" ? "rgba(255,255,255,0.08)" :
          state === "error"   ? "rgba(80,80,80,0.08)" :
          "#fff",
        color:
          state === "success" ? "#aaa" :
          state === "error"   ? "#666" :
          "#000",
        borderColor:
          state === "success" ? "rgba(255,255,255,0.2)" :
          state === "error"   ? "rgba(255,255,255,0.08)" :
          "rgba(255,255,255,0.5)",
        animation: state === "idle" ? undefined : "none",
      }}
    >
      {state === "idle" && (
        <>
          <Zap size={15} />
          Trigger Payout
        </>
      )}
      {state === "loading" && (
        <>
          <Loader2 size={15} className="animate-spin" />
          Sending…
        </>
      )}
      {state === "success" && (
        <>
          <Check size={15} />
          {count} tx sent
        </>
      )}
      {state === "error" && (
        <>
          <AlertCircle size={15} />
          {errorMsg || "Failed"}
        </>
      )}
    </button>
  );
}

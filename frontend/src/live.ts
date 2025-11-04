// frontend/src/live.ts
// Unified live stream: use SSE if available; otherwise poll /snapshots/latest every 2s.
// Emits the SAME event shape your Overview.tsx already expects.

import { fetchLatestSnapshots } from "./api";

export type LiveEvent = {
  type: "positions_snapshot";
  account: string; // login_hint
  positions: any[]; // not used yet
  snapshot?: {
    balance: number | null;
    equity: number | null;
    margin: number | null;
    margin_free: number | null;
    currency?: string;
  };
  ts: number; // seconds epoch
};

type Unsub = () => void;

const LIVE_URL = import.meta.env.VITE_LIVE_URL || ""; // SSE (local MT5 only)
const POLL_MS = 2000;

export function subscribe(cb: (e: LiveEvent) => void): Unsub {
  let es: EventSource | null = null;
  let pollTimer: number | null = null;
  let closed = false;

  // --- helper: start polling backend /snapshots/latest
  async function startPolling() {
    if (closed) return;
    const tick = async () => {
      try {
        const rows = await fetchLatestSnapshots();
        const now = Math.floor(Date.now() / 1000);
        for (const r of rows) {
          cb({
            type: "positions_snapshot",
            account: String(r.login_hint),
            positions: [],
            snapshot: {
              balance: r.snapshot?.balance ?? null,
              equity: r.snapshot?.equity ?? null,
              margin: r.snapshot?.margin ?? null,
              margin_free: r.snapshot?.margin_free ?? null,
            },
            ts: now,
          });
        }
      } catch {
        // ignore transient errors
      }
    };
    // immediate + interval
    tick();
    pollTimer = window.setInterval(tick, POLL_MS) as unknown as number;
  }

  // --- try SSE first (works only when MT5 is enabled locally)
  const canUseSSE = typeof window !== "undefined" && !!LIVE_URL && LIVE_URL.startsWith("http");
  if (canUseSSE) {
    try {
      es = new EventSource(LIVE_URL, { withCredentials: false });

      es.onmessage = (msg) => {
        if (!msg?.data) return;
        try {
          const evt = JSON.parse(String(msg.data));
          if (evt && evt.type === "positions_snapshot") {
            cb(evt as LiveEvent);
          }
        } catch {
          // ignore malformed messages
        }
      };

      es.onerror = () => {
        // If SSE errors (which it will on Heroku), close and fall back to polling
        try { es?.close(); } catch {}
        es = null;
        if (!pollTimer) startPolling();
      };

      // safety net: if nothing arrives in ~3s, switch to polling
      setTimeout(() => {
        if (!pollTimer) {
          try { es?.close(); } catch {}
          es = null;
          startPolling();
        }
      }, 3000);
    } catch {
      // if EventSource constructor throws, just poll
      startPolling();
    }
  } else {
    // no SSE configured — just poll
    startPolling();
  }

  // unsubscribe
  return () => {
    closed = true;
    try { es?.close(); } catch {}
    es = null;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

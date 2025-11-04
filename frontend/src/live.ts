// frontend/src/live.ts
import { fetchLatestSnapshots } from "./api";

export type LiveEvent = {
  type: "positions_snapshot";
  account: string; // login_hint
  positions: any[];
  snapshot?: {
    balance: number | null;
    equity: number | null;
    margin: number | null;
    margin_free: number | null;
    currency?: string;
  };
  ts: number;
};

type Unsub = () => void;

const LIVE_URL = import.meta.env.VITE_LIVE_URL || ""; // SSE (local MT5 only)
const POLL_MS = 2000;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function subscribe(cb: (e: LiveEvent) => void): Unsub {
  let es: EventSource | null = null;
  let pollTimer: number | null = null;
  let closed = false;

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
              balance: toNum(r?.snapshot?.balance),
              equity: toNum(r?.snapshot?.equity),
              margin: toNum(r?.snapshot?.margin),
              margin_free: toNum(r?.snapshot?.margin_free),
            },
            ts: now,
          });
        }
      } catch {
        /* ignore transient errors */
      }
    };
    tick();
    pollTimer = window.setInterval(tick, POLL_MS) as unknown as number;
  }

  const canUseSSE = typeof window !== "undefined" && !!LIVE_URL && LIVE_URL.startsWith("http");
  if (canUseSSE) {
    try {
      es = new EventSource(LIVE_URL, { withCredentials: false });
      es.onmessage = (msg) => {
        if (!msg?.data) return;
        try {
          const evt = JSON.parse(String(msg.data));
          if (evt && evt.type === "positions_snapshot") cb(evt as LiveEvent);
        } catch {}
      };
      es.onerror = () => {
        try { es?.close(); } catch {}
        es = null;
        if (!pollTimer) startPolling();
      };
      setTimeout(() => {
        if (!pollTimer) {
          try { es?.close(); } catch {}
          es = null;
          startPolling();
        }
      }, 3000);
    } catch {
      startPolling();
    }
  } else {
    startPolling();
  }

  return () => {
    closed = true;
    try { es?.close(); } catch {}
    es = null;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };
}

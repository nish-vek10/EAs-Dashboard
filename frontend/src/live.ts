// Live event types used by Overview/Account pages
export type LiveEvent =
  | {
      type: "positions_snapshot";
      account: string; // login as string
      positions?: any[];
      snapshot?: {
        balance: number;
        equity: number;
        margin: number;
        margin_free: number;
      };
      ts: number; // epoch seconds/ms
    }
  | { type: "noop" };

const LIVE_URL = import.meta.env.VITE_LIVE_URL as string | undefined;

/**
 * Subscribe to server-sent events (SSE).
 * If LIVE_URL is not defined, do nothing and return a no-op unsubscriber.
 */
export function subscribe(cb: (evt: LiveEvent) => void): () => void {
  if (!LIVE_URL || LIVE_URL === "undefined" || LIVE_URL.trim() === "") {
    // Live feed disabled → no network requests
    if (import.meta.env.DEV) {
      console.debug("[live] disabled (no VITE_LIVE_URL)");
    }
    return () => {};
  }

  let closed = false;
  const es = new EventSource(LIVE_URL);

  const onMessage = (e: MessageEvent) => {
    try {
      const evt = JSON.parse(e.data);
      cb(evt);
    } catch {
      // ignore malformed events
    }
  };

  es.addEventListener("message", onMessage);
  es.onerror = () => {
    if (import.meta.env.DEV) {
      console.debug("[live] SSE error; keeping connection open");
    }
  };

  return () => {
    if (closed) return;
    closed = true;
    es.removeEventListener("message", onMessage);
    try {
      es.close();
    } catch {}
  };
}

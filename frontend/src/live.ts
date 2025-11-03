const STREAM_URL = import.meta.env.VITE_STREAM_URL as string;

export type LiveEvent = {
  type: "positions_snapshot";
  account: string;
  snapshot: any;
  positions: any[];
  ts: string;
};

export function subscribe(onEvent: (e: LiveEvent) => void) {
  const es = new EventSource(STREAM_URL);
  es.onmessage = (msg) => {
    try {
      const evt: LiveEvent = JSON.parse(msg.data);
      onEvent(evt);
    } catch {}
  };
  es.onerror = () => {
    /* browser auto-retries */
  };
  return () => es.close();
}

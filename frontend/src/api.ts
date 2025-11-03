const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Shape expected by the UI (Overview.tsx, AccountCard, etc.)
 */
export type AccountRow = {
  login_hint: string;      // string id used across the UI
  label?: string;
  server?: string;
  currency?: string;
  // live fields (optional)
  balance?: number;
  equity?: number;
  margin?: number;
  margin_free?: number;
  positions_count?: number;
  updated_at?: number;
};

// Wire up to FastAPI: /accounts and /accounts/{login}/snapshot
type BackendAccount = {
  label: string;
  login: number;
  server: string;
  currency: string;
};

export type Snapshot = {
  label: string;
  login: number;
  balance: number;
  equity: number;
  margin: number;
  margin_free: number;
  margin_level: number;
  profit: number;
  currency: string;
  server: string;
  timestamp: number;
};

/**
 * Load account list from FastAPI and map to AccountRow.
 */
export async function fetchAccounts(): Promise<AccountRow[]> {
  const res = await fetch(`${API}/accounts`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /accounts failed (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as BackendAccount[];
  return data.map((a) => ({
    login_hint: String(a.login),
    label: a.label,
    server: a.server,
    currency: a.currency,
  }));
}

/**
 * Optional helper if you need a one-off live snapshot anywhere.
 */
export async function fetchSnapshot(login_hint: string | number): Promise<Snapshot> {
  const login = typeof login_hint === "string" ? login_hint : String(login_hint);
  const res = await fetch(`${API}/accounts/${login}/snapshot`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /accounts/${login}/snapshot failed (${res.status}): ${txt}`);
  }
  return (await res.json()) as Snapshot;
}

// --- Compatibility shims for AccountPage.tsx ---

// Return the single account row by login (string or number)
export async function fetchAccount(login_hint: string | number): Promise<AccountRow | null> {
  const all = await fetchAccounts();
  const key = String(login_hint);
  return all.find(a => a.login_hint === key) ?? null;
}

// TEMP: positions endpoint not implemented yet on the backend.
// Provide an empty list so AccountPage renders without crashing.
// We'll replace this with a real call to FastAPI (/accounts/{login}/positions) later.
export type Position = {
  ticket: number;
  symbol: string;
  volume: number;
  type: string;        // "buy" | "sell"
  price_open: number;
  profit: number;
};

export async function fetchAccountPositions(login_hint: string | number): Promise<Position[]> {
  // For now, no REST call; return empty until we add backend positions.
  return [];
}

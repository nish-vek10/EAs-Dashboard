const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Shape expected by the UI (Overview.tsx, AccountCard, etc.)
 */
export type AccountRow = {
  login_hint: string;      // string id used across the UI
  label?: string;
  server?: string;
  currency?: string;

  // used for Net % calculation
  account_size?: number;

  // live fields (optional; merged from SSE snapshots)
  balance?: number;
  equity?: number;
  margin?: number;
  margin_free?: number;
  positions_count?: number;
  updated_at?: number;
};

// ---- Backend wire types ----
// Match what /accounts now returns (see backend main.py).
type BackendAccount = {
  label: string;
  login: number;                 // backend includes this
  login_hint?: string;           // backend provides this helper (string)
  server: string;
  currency?: string;
  account_size?: number;         // <-- IMPORTANT: keep this
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
 * IMPORTANT: do not drop `account_size`.
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
    // prefer backend-provided login_hint; fall back to stringified login
    login_hint: a.login_hint ?? String(a.login),
    label: a.label,
    server: a.server,
    currency: a.currency,
    account_size: a.account_size,      // <-- keep it
    // live fields (balance/equity/etc.) arrive via SSE and get merged later
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

export async function fetchAccount(login_hint: string | number): Promise<AccountRow | null> {
  const all = await fetchAccounts();
  const key = String(login_hint);
  return all.find((a) => a.login_hint === key) ?? null;
}

// TEMP: positions endpoint not implemented yet on the backend.
export type Position = {
  ticket: number;
  symbol: string;
  volume: number;
  type: string;        // "buy" | "sell"
  price_open: number;
  profit: number;
};

export async function fetchAccountPositions(_login_hint: string | number): Promise<Position[]> {
  // For now, no REST call; return empty until we add backend positions.
  return [];
}

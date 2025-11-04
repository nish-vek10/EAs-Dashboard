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

  // live fields (optional; merged from snapshots)
  balance?: number | null;
  equity?: number | null;
  margin?: number | null;
  margin_free?: number | null;
  positions_count?: number;
  updated_at?: number | null;
};

// ---- Backend wire types ----
type BackendAccount = {
  label: string;
  login: number;                 // backend includes this for local MT5 mode
  login_hint?: string;           // helper (string)
  server: string;
  currency?: string;
  account_size?: number;
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
  const res = await fetch(`${API}/accounts`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /accounts failed (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as BackendAccount[];
  return data.map((a) => ({
    login_hint: a.login_hint ?? String(a.login),
    label: a.label,
    server: a.server,
    currency: a.currency,
    account_size: a.account_size,
  }));
}

/**
 * CLOUD MODE STUB: do NOT call the MT5 endpoint in production.
 */
export async function fetchSnapshot(login_hint: string | number): Promise<Snapshot> {
  const now = Date.now() / 1000;
  return {
    label: String(login_hint),
    login: 0,
    balance: 0,
    equity: 0,
    margin: 0,
    margin_free: 0,
    margin_level: 0,
    profit: 0,
    currency: "USD",
    server: "",
    timestamp: now,
  };
}

/**
 * Latest metrics per account from the backend (Supabase-backed).
 */
export async function fetchLatestSnapshots(): Promise<
  { login_hint: string; snapshot: { balance: number|null; equity: number|null; margin: number|null; margin_free: number|null }; net_return_pct: number | null; updated_at: string | number | null }[]
> {
  const res = await fetch(`${API}/snapshots/latest`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /snapshots/latest failed (${res.status}): ${txt}`);
  }
  return (await res.json()) as any;
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
  return [];
}

export type GroupSummary = { name: string; count: number; sort_index: number };

export async function fetchGroups(): Promise<GroupSummary[]> {
  const res = await fetch(`${API}/groups`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /groups failed (${res.status}): ${txt}`);
  }
  return (await res.json()) as GroupSummary[];
}

export async function fetchAccountsFiltered(group?: string): Promise<AccountRow[]> {
  const url = group ? `${API}/accounts?group=${encodeURIComponent(group)}` : `${API}/accounts`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /accounts failed (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as any[];
  return data.map((a) => ({
    login_hint: a.login_hint ?? String(a.login),
    label: a.label,
    server: a.server,
    currency: a.currency,
    account_size: a.account_size,
  }));
}

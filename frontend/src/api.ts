const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type AccountRow = {
  login_hint: string;
  label?: string;
  server?: string;
  currency?: string;
  account_size?: number;

  balance?: number | null;
  equity?: number | null;
  margin?: number | null;
  margin_free?: number | null;
  positions_count?: number;
  updated_at?: number | null;
};

type BackendAccount = {
  label: string;
  login: number;
  login_hint?: string;
  server: string;
  currency?: string;
  account_size?: number | string | null;
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

const toNum = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** List accounts */
export async function fetchAccounts(): Promise<AccountRow[]> {
  const res = await fetch(`${API}/accounts`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /accounts failed (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as BackendAccount[];
  return data.map((a) => ({
    login_hint: String(a.login_hint ?? a.login ?? ""),
    label: a.label,
    server: a.server,
    currency: a.currency,
    account_size: a.account_size != null ? Number(a.account_size) : undefined,
  }));
}

/** CLOUD MODE stub (kept for compatibility) */
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

/** Latest metrics per account (normalized) */
export async function fetchLatestSnapshots(): Promise<
  {
    login_hint: string;
    snapshot: { balance: number | null; equity: number | null; margin: number | null; margin_free: number | null };
    net_return_pct: number | null;
    updated_at: string | number | null;
  }[]
> {
  const res = await fetch(`${API}/snapshots/latest`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET /snapshots/latest failed (${res.status}): ${txt}`);
  }
  const raw = (await res.json()) as any[];
  return raw.map((r) => ({
    login_hint: String(r.login_hint),
    snapshot: {
      balance: toNum(r?.snapshot?.balance),
      equity: toNum(r?.snapshot?.equity),
      margin: toNum(r?.snapshot?.margin),
      margin_free: toNum(r?.snapshot?.margin_free),
    },
    net_return_pct: toNum(r?.net_return_pct),
    updated_at: r?.updated_at ?? null,
  }));
}

/** Compatibility shim */
export async function fetchAccount(login_hint: string | number): Promise<AccountRow | null> {
  const all = await fetchAccounts();
  const key = String(login_hint);
  return all.find((a) => a.login_hint === key) ?? null;
}

export type Position = {
  ticket: number;
  symbol: string;
  volume: number;
  type: string;
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
  const data = (await res.json()) as BackendAccount[];
  return data.map((a) => ({
    login_hint: String(a.login_hint ?? a.login ?? ""),
    label: a.label,
    server: a.server,
    currency: a.currency,
    account_size: a.account_size != null ? Number(a.account_size) : undefined,
  }));
}

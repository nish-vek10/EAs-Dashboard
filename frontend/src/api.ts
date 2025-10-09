const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export type AccountRow = {
  login_hint: string;
  broker?: string;
  currency?: string;
  balance?: number;
  equity?: number;
  margin?: number;
  margin_free?: number;
  positions_count: number;
  updated_at?: string;
};

export async function fetchAccounts(): Promise<AccountRow[]> {
  const res = await fetch(`${API_BASE}/api/accounts`);
  if (!res.ok) throw new Error(`Failed /api/accounts: ${res.status}`);
  const json = await res.json();
  return json.accounts ?? [];
}

export type Position = {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  lots: number;
  price_open: number;
  sl?: number | null;
  tp?: number | null;
  commission?: number | null;
  swap?: number | null;
  profit?: number | null;
  comment?: string | null;
  magic?: number | null;
  open_time?: string | null;
};

export async function fetchAccountPositions(loginHint: string): Promise<{
  account: any;
  snapshot: any;
  positions: Position[];
  updated_at?: string;
}> {
  const res = await fetch(`${API_BASE}/api/accounts/${encodeURIComponent(loginHint)}/positions`);
  if (!res.ok) throw new Error(`Failed positions for ${loginHint}: ${res.status}`);
  return res.json();
}

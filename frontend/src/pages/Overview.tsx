import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchAccountsFiltered, fetchLatestSnapshots, type AccountRow } from "../api";
import AccountCard from "../components/AccountCard";
import { type Group } from "../groups"; // keep your type for the tab prop

type SortKey = "alpha" | "equity_asc" | "equity_desc" | "net_asc" | "net_desc";

function getEquity(a: AccountRow) {
  return typeof a.equity === "number" ? a.equity : Number.NEGATIVE_INFINITY;
}

function getNetPct(a: AccountRow) {
  if (
    typeof a.equity !== "number" ||
    typeof a.account_size !== "number" ||
    a.account_size <= 0
  ) {
    return Number.NaN;
  }
  return (a.equity / a.account_size - 1) * 100;
}

function cmpNumberAsc(a: number, b: number) {
  if (Number.isNaN(a) && Number.isNaN(b)) return 0;
  if (Number.isNaN(a)) return 1;
  if (Number.isNaN(b)) return -1;
  return a - b;
}

const labelKey = (a: AccountRow) =>
  (a.label && a.label.trim().length ? a.label : a.login_hint || "").toLowerCase();

const POLL_MS = 2000;

export default function Overview({ filter }: { filter: Group }) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("alpha");
  const timerRef = useRef<number | null>(null);

  // Map your existing Group type to backend group names
  function groupNameFromFilter(f: Group): string | undefined {
    if (f === "All") return undefined; // no filter -> All Accounts
    // For your existing tabs, the names match Supabase:
    // "E2T Demos" | "Nish Algos"
    return String(f);
  }

  // Load accounts whenever the tab changes
  useEffect(() => {
    let mounted = true;
    setError(null);

    const group = groupNameFromFilter(filter);

    (async () => {
      try {
        const initial = await fetchAccountsFiltered(group);
        if (!mounted) return;
        setAccounts(initial);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load accounts");
      }
    })();

    return () => { mounted = false; };
  }, [filter]);

  // Poll /snapshots/latest and merge values
  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const latest = await fetchLatestSnapshots();
        if (!mounted) return;

        const byKey = new Map(latest.map(s => [String(s.login_hint), s]));

        setAccounts(prev => prev.map(a => {
          const hit = byKey.get(a.login_hint);
          if (!hit) return a;

          const eq = (hit.snapshot?.equity ?? a.equity ?? 0) as number;
          const size = a.account_size ?? 0;
          const computedPct = size > 0 ? ((eq - size) / size) * 100 : null;
          const _netPct = hit.net_return_pct ?? computedPct; // if you later show it explicitly

          return {
            ...a,
            balance: hit.snapshot?.balance ?? a.balance ?? null,
            equity: eq ?? null,
            margin: hit.snapshot?.margin ?? a.margin ?? null,
            margin_free: hit.snapshot?.margin_free ?? a.margin_free ?? null,
            updated_at: typeof hit.updated_at === "string"
              ? Math.floor(Date.parse(hit.updated_at) / 1000)
              : (typeof hit.updated_at === "number" ? hit.updated_at : a.updated_at ?? null),
          };
        }));
      } catch {
        // keep UI smooth on transient errors
      }
    }

    poll();
    timerRef.current = window.setInterval(poll, POLL_MS) as unknown as number;

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // poll regardless of tab

  const visible = useMemo(() => {
    const arr = [...accounts];

    switch (sortKey) {
      case "equity_asc":
        arr.sort((a, b) => cmpNumberAsc(getEquity(a), getEquity(b)));
        break;
      case "equity_desc":
        arr.sort((a, b) => cmpNumberAsc(getEquity(b), getEquity(a)));
        break;
      case "net_asc":
        arr.sort((a, b) => cmpNumberAsc(getNetPct(a), getNetPct(b)));
        break;
      case "net_desc":
        arr.sort((a, b) => cmpNumberAsc(getNetPct(b), getNetPct(a)));
        break;
      case "alpha":
      default:
        arr.sort((a, b) => labelKey(a).localeCompare(labelKey(b)));
        break;
    }

    return arr;
  }, [accounts, sortKey]);

  if (error) return <div className="rowcard">Error: {error}</div>;
  if (!visible.length) return <div className="muted">No accounts in this view yet.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Top bar with sort control */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="muted" style={{ fontSize: 12 }}>Sort:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              background: "#0e1422",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <option value="alpha">A → Z (Alphabetical)</option>
            <option value="equity_asc">Lowest Equity</option>
            <option value="equity_desc">Largest Equity</option>
            <option value="net_asc">Lowest Net %</option>
            <option value="net_desc">Largest Net %</option>
          </select>
        </div>
      </div>

      {visible.map((a) => (
        <AccountCard key={a.login_hint} a={a} />
      ))}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { fetchAccounts, type AccountRow } from "../api";
import { subscribe, type LiveEvent } from "../live";
import AccountCard from "../components/AccountCard";
import { getGroup, type Group } from "../groups";

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
  if (Number.isNaN(a)) return 1; // NaNs to the end
  if (Number.isNaN(b)) return -1;
  return a - b;
}

// Use label for alphabetical sort; fall back to login_hint if label is missing
const labelKey = (a: AccountRow) =>
  (a.label && a.label.trim().length ? a.label : a.login_hint || "").toLowerCase();

export default function Overview({ filter }: { filter: Group }) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("alpha"); // default A→Z

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    (async () => {
      try {
        const initial = await fetchAccounts();
        setAccounts(initial);
      } catch (e: any) {
        setError(e?.message || "Failed to load accounts");
      }

      // Live updates: positions + snapshot merge
      unsubscribe = subscribe((evt: LiveEvent) => {
        if (evt.type !== "positions_snapshot") return;

        setAccounts((prev) => {
          const map = new Map(prev.map((a) => [a.login_hint, { ...a }]));
          const row =
            map.get(evt.account) ??
            ({
              login_hint: evt.account,
              positions_count: 0,
            } as AccountRow);

          row.positions_count = Array.isArray(evt.positions)
            ? evt.positions.length
            : 0;

          if (evt.snapshot) {
            row.balance = evt.snapshot.balance;
            row.equity = evt.snapshot.equity;
            row.margin = evt.snapshot.margin;
            row.margin_free = evt.snapshot.margin_free;
            row.currency = row.currency ?? evt.snapshot.currency;
          }
          row.updated_at = evt.ts;

          map.set(evt.account, row);
          return Array.from(map.values());
        });
      });
    })();

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, []);

  const visible = useMemo(() => {
    const byGroup =
      filter === "All"
        ? accounts
        : accounts.filter((a) => getGroup(a.login_hint) === filter);

    const arr = [...byGroup];

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
        arr.sort((a, b) => labelKey(a).localeCompare(labelKey(b))); // A→Z by label
        break;
    }

    return arr;
  }, [accounts, filter, sortKey]);

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

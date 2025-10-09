import React, { useEffect, useMemo, useState } from "react";
import { fetchAccounts, type AccountRow } from "../api";
import { subscribe, type LiveEvent } from "../live";
import AccountCard from "../components/AccountCard";
import { getGroup, type Group } from "../groups";

export default function Overview({ filter }: { filter: Group }) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(err => setError(err.message));
    const unsub = subscribe((evt: LiveEvent) => {
      if (evt.type !== "positions_snapshot") return;
      setAccounts(prev => {
        const map = new Map(prev.map(a => [a.login_hint, { ...a }]));
        const row = map.get(evt.account) ?? { login_hint: evt.account, positions_count: 0 };
        row.positions_count = Array.isArray(evt.positions) ? evt.positions.length : 0;
        row.balance = evt.snapshot?.balance;
        row.equity = evt.snapshot?.equity;
        row.margin = evt.snapshot?.margin;
        row.margin_free = evt.snapshot?.margin_free;
        row.updated_at = evt.ts;
        map.set(evt.account, row);
        return Array.from(map.values());
      });
    });
    return () => unsub();
  }, []);

  const visible = useMemo(() => {
    const byGroup = accounts.filter(a => filter === "All" ? true : getGroup(a.login_hint) === filter);
    // Alphabetical by login_hint (case-insensitive)
    return byGroup.sort((a,b) => a.login_hint.toLowerCase().localeCompare(b.login_hint.toLowerCase()));
  }, [accounts, filter]);

  if (error) return <div className="rowcard">Error: {error}</div>;
  if (!visible.length) return <div className="muted">No accounts in this view yet.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {visible.map(a => <AccountCard key={a.login_hint} a={a} />)}
    </div>
  );
}

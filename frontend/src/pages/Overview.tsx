import React, { useEffect, useMemo, useState } from "react";
import { fetchAccounts, type AccountRow } from "../api";
import { subscribe, type LiveEvent } from "../live";
import AccountCard from "../components/AccountCard";
import { getGroup, type Group } from "../groups";

/**
 * Renders account rows with live updates from the `subscribe` stream.
 * - `filter` is one of the groups defined in groups.ts ("All", etc.)
 */
export default function Overview({ filter }: { filter: Group }) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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

          // Merge snapshot fields if provided
          if (evt.snapshot) {
            row.balance = evt.snapshot.balance;
            row.equity = evt.snapshot.equity;
            row.margin = evt.snapshot.margin;
            row.margin_free = evt.snapshot.margin_free;
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
      } catch {
        /* noop */
      }
    };
  }, []);

  const visible = useMemo(() => {
    const byGroup =
      filter === "All"
        ? accounts
        : accounts.filter((a) => getGroup(a.login_hint) === filter);

    // Alphabetical by login_hint (case-insensitive)
    return [...byGroup].sort((a, b) =>
      a.login_hint.toLowerCase().localeCompare(b.login_hint.toLowerCase())
    );
  }, [accounts, filter]);

  if (error) return <div className="rowcard">Error: {error}</div>;
  if (!visible.length) return <div className="muted">No accounts in this view yet.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {visible.map((a) => (
        <AccountCard key={a.login_hint} a={a} />
      ))}
    </div>
  );
}

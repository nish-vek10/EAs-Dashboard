import { useEffect, useRef, useState } from "react";
import {
  fetchGroups,
  fetchAccountsFiltered,
  fetchLatestSnapshots,
  AccountRow,
  GroupSummary,
} from "../api";

const POLL_MS = 2000;

export default function Overview() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>("All Accounts");
  const [rows, setRows] = useState<AccountRow[]>([]);
  const timerRef = useRef<number | null>(null);

  // Load tabs (with counts)
  useEffect(() => {
    (async () => {
      try {
        const gs = await fetchGroups();
        setGroups(gs);
        // if "All Accounts" exists, start on it; otherwise pick first
        const initial = gs.find(g => g.name === "All Accounts")?.name || gs[0]?.name || "All Accounts";
        setActiveGroup(initial);
      } catch {
        // fallback to static tabs if needed
        setGroups([{ name: "All Accounts", count: 0, sort_index: 0 }]);
        setActiveGroup("All Accounts");
      }
    })();
  }, []);

  // Load accounts for the active tab
  useEffect(() => {
    let mounted = true;
    (async () => {
      const accs = await fetchAccountsFiltered(activeGroup === "All Accounts" ? undefined : activeGroup);
      if (!mounted) return;
      setRows(accs);
    })();
    return () => { mounted = false; };
  }, [activeGroup]);

  // Poll latest snapshots and merge every 2s
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const latest = await fetchLatestSnapshots();
        if (!mounted) return;
        const byKey = new Map(latest.map(s => [String(s.login_hint), s]));
        setRows(prev => prev.map(a => {
          const hit = byKey.get(a.login_hint);
          if (!hit) return a;

          const eq = (hit.snapshot?.equity ?? a.equity ?? 0) as number;
          const size = a.account_size ?? 0;
          const computedPct = size > 0 ? ((eq - size) / size) * 100 : null;
          const netPct = hit.net_return_pct ?? computedPct;

          return {
            ...a,
            balance: hit.snapshot?.balance ?? a.balance ?? null,
            equity: eq ?? null,
            margin: hit.snapshot?.margin ?? a.margin ?? null,
            margin_free: hit.snapshot?.margin_free ?? a.margin_free ?? null,
            updated_at: typeof hit.updated_at === "string"
              ? Math.floor(Date.parse(hit.updated_at) / 1000)
              : (typeof hit.updated_at === "number" ? hit.updated_at : a.updated_at ?? null),
            // optionally store a derived field if your card wants it:
            // net_return_pct: netPct ?? undefined,
          };
        }));
      } catch {
        // ignore one-off errors to keep UI smooth
      }
    };

    poll();
    timerRef.current = window.setInterval(poll, POLL_MS) as unknown as number;
    return () => {
      mounted = false;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, []);

  // --- Render ---
  return (
    <div className="page">
      {/* Tabs */}
      <div className="tabs">
        {groups.map(g => (
          <button
            key={g.name}
            className={g.name === activeGroup ? "tab active" : "tab"}
            onClick={() => setActiveGroup(g.name)}
          >
            {g.name} {typeof g.count === "number" ? `(${g.count})` : ""}
          </button>
        ))}
      </div>

      {/* Cards — replace with your real components */}
      <div className="grid">
        {rows.map(r => (
          <div key={r.login_hint} className="card">
            <div className="title">{r.label}</div>
            <div className="sub">{r.server} • {r.currency}</div>
            <div className="metrics">
              <div>Equity: {r.equity ?? "-"}</div>
              <div>Balance: {r.balance ?? "-"}</div>
              <div>Margin: {r.margin ?? "-"}</div>
              <div>Free: {r.margin_free ?? "-"}</div>
              <div>
                Net %: {(r.equity && r.account_size)
                  ? (((r.equity - r.account_size) / r.account_size) * 100).toFixed(2)
                  : "-"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import type { AccountRow } from "../api";

/* Extract a numeric account number from the login_hint if present, else returns null */
function extractNumber(login: string): string | null {
  const m = login.match(/\d+/);
  return m ? m[0] : null;
}

export default function AccountCard({ a }: { a: AccountRow }) {
  const number = extractNumber(a.login_hint);
  return (
    <Link to={`/account/${encodeURIComponent(a.login_hint)}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="rowcard">
        <div className="row-left">
          <div className="row-title">
            <span className="name">{a.login_hint}</span>
            {number && <span className="number">#{number}</span>}
            <span className="broker">· {a.broker ?? "—"}</span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Positions: <strong style={{ color: "var(--text)" }}>{a.positions_count}</strong> ·
            Updated: {a.updated_at ? new Date(a.updated_at).toLocaleTimeString() : "—"}
          </div>
        </div>

        <div className="row-kpis">
          <KPI label="Balance" value={fmt(a.balance)} />
          <KPI label="Equity" value={fmt(a.equity)} />
          <KPI label="Margin" value={fmt(a.margin)} />
          <KPI label="Free" value={fmt(a.margin_free)} />
        </div>

        <span className="badge" style={{ marginLeft: "auto" }}>{a.currency ?? "—"}</span>
      </div>
    </Link>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function fmt(n?: number) {
  if (typeof n !== "number") return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

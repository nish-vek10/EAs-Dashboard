import React from "react";
import type { AccountRow } from "../api";

function fmt(n?: number | null, digits = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  try {
    return n.toLocaleString(undefined, { maximumFractionDigits: digits });
  } catch {
    return String(n);
  }
}

function fmtPct(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const v = Number(n).toFixed(2);
  return Number(n) >= 0 ? `+${v}%` : `${v}%`;
}

export default function AccountCard({ a }: { a: AccountRow }) {
  const currency = a.currency || "USD";

  // Consider the row "live" if we saw an update in the last ~6 seconds
  const nowSec = Date.now() / 1000;
  const fresh =
    typeof a.updated_at === "number" && nowSec - a.updated_at < 6;

  // Use values merged into the row by Overview/live.ts
  const balanceNum = typeof a.balance === "number" ? a.balance : null;
  const equityNum = typeof a.equity === "number" ? a.equity : null;
  const marginNum = typeof a.margin === "number" ? a.margin : null;
  const freeNum = typeof a.margin_free === "number" ? a.margin_free : null;

  const balance = fmt(balanceNum);
  const equity = fmt(equityNum);
  const margin = fmt(marginNum);
  const free = fmt(freeNum);

  // Net % = (equity / account_size - 1) * 100
  const netPctNum =
    typeof equityNum === "number" &&
    typeof a.account_size === "number" &&
    a.account_size > 0
      ? (equityNum / a.account_size - 1) * 100
      : null;

  const netPctStr = fmtPct(netPctNum);
  const netColor =
    netPctNum !== null
      ? netPctNum >= 0
        ? "var(--success, #22c55e)"
        : "var(--danger, #ef4444)"
      : "inherit";

  return (
    <div
      className="rowcard"
      style={{
        borderRadius: 16,
        padding: 16,
        background: "rgba(22, 26, 35, 0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header Row */}
      <div
        className="card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 12,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontWeight: 800,
              letterSpacing: ".02em",
              lineHeight: 1.1,
              fontSize: 16,
            }}
          >
            {a.label || a.login_hint}
          </div>

          <div style={{ opacity: 0.6, fontSize: 12, lineHeight: 1.1 }}>
            #{a.login_hint} • {a.server || "—"}
          </div>

          {/* Live/Pending + Currency */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: fresh
                  ? "rgba(16,185,129,0.2)"
                  : "rgba(148,163,184,0.2)",
                color: fresh ? "#22c55e" : "#94a3b8",
                width: "fit-content",
                transition: "all 200ms ease",
              }}
            >
              {fresh ? "Live" : "Pending"}
            </div>

            <div
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.1)",
                opacity: 0.9,
              }}
            >
              {currency}
            </div>
          </div>
        </div>

        {/* Net % tile for small screens */}
        <div className="netpct netpct--header" style={{ minWidth: 120 }}>
          <Metric
            label="Net % Change"
            value={netPctStr}
            valueColor={netColor}
            valueBold
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="metric-grid" style={{ display: "grid", gap: 12 }}>
        {/* Net % (desktop) */}
        <div className="netpct netpct--grid">
          <Metric
            label="Net % Change"
            value={netPctStr}
            valueColor={netColor}
            valueBold
          />
        </div>

        <Metric label="Balance" value={balance} />
        <Metric label="Equity" value={equity} />
        <Metric label="Margin" value={margin} />
        <Metric label="Free Margin" value={free} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueColor,
  valueBold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  valueBold?: boolean;
}) {
  return (
    <div
      className="kpi"
      style={{
        background: "rgba(10, 12, 18, 0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "right",
        borderRadius: 12,
        padding: 12,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div
        style={{
          marginTop: 4,
          fontSize: 16,
          color: valueColor || "inherit",
          fontWeight: valueBold ? 700 : 800,
          transition: "color 250ms ease",
        }}
      >
        {value}
      </div>
    </div>
  );
}

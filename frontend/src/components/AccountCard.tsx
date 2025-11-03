import React, { useEffect, useState } from "react";
import type { AccountRow } from "../api";
import { fetchSnapshot, type Snapshot } from "../api";

function fmt(n?: number, digits = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  try {
    return n.toLocaleString(undefined, { maximumFractionDigits: digits });
  } catch {
    return String(n);
  }
}

function fmtPct(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const v = n.toFixed(2);
  return n >= 0 ? `+${v}%` : `${v}%`;
}

export default function AccountCard({ a }: { a: AccountRow }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;

    const load = async () => {
      try {
        const s = await fetchSnapshot(a.login_hint);
        if (!stop) setSnap(s);
      } catch (e: any) {
        if (!stop) setError(e?.message || "Failed to load snapshot");
      }
    };

    load();
    const id = setInterval(load, 10000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [a.login_hint]);

  const currency = a.currency || snap?.currency || "USD";
  const equityNum = snap?.equity ?? a.equity;
  const balance = fmt(snap?.balance);
  const equity = fmt(equityNum);
  const margin = fmt(snap?.margin);
  const free = fmt(snap?.margin_free);

  // Net % = (equity / account_size - 1) * 100
  const netPctNum =
    typeof equityNum === "number" &&
    typeof a.account_size === "number" &&
    a.account_size > 0
      ? (equityNum / a.account_size - 1) * 100
      : undefined;

  const netPctStr = fmtPct(netPctNum);
  const netColor =
    typeof netPctNum === "number"
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
      {/* Header Row: Name + Details (left) / Net% (right on mobile only) */}
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

          {/* Live + USD together */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: snap
                  ? "rgba(16,185,129,0.2)"
                  : "rgba(148,163,184,0.2)",
                color: snap ? "#22c55e" : "#94a3b8",
                width: "fit-content",
              }}
            >
              {snap ? "Live" : "Pending"}
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

        {/* Net % tile for MOBILE (shows on small screens, hidden on desktop) */}
        <div className="netpct netpct--header" style={{ minWidth: 120 }}>
          <Metric
            label="Net % Change"
            value={netPctStr}
            valueColor={netColor}
            valueBold
          />
        </div>
      </div>

      {/* Metrics row: desktop includes Net% inside the cluster; mobile shows 4 tiles */}
      <div className="metric-grid" style={{ display: "grid", gap: 12 }}>
        {/* Net % for DESKTOP (hidden on small screens) */}
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

      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#ef4444",
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}
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
        }}
      >
        {value}
      </div>
    </div>
  );
}

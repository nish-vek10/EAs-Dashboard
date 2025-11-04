import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AccountRow } from "../api";

function fmt(n?: number | null, digits = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  try { return n.toLocaleString(undefined, { maximumFractionDigits: digits }); }
  catch { return String(n); }
}
function fmtPct(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const v = Number(n).toFixed(2);
  return Number(n) >= 0 ? `+${v}%` : `${v}%`;
}

// tiny sparkline (inline SVG)
function Sparkline({ data }: { data: number[] }) {
  const w = 80, h = 24;
  const path = useMemo(() => {
    if (!data.length) return "";
    const min = Math.min(...data), max = Math.max(...data);
    const span = max - min || 1;
    const step = data.length > 1 ? w / (data.length - 1) : w;
    return data.map((v, i) => {
      const x = i * step, y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [data]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", opacity: 0.9 }}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function AccountCard({ a }: { a: AccountRow }) {
  const currency = a.currency || "USD";

  // rolling equity history for sparkline
  const [history, setHistory] = useState<number[]>([]);
  const lastTsRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof a.equity === "number" && typeof a.updated_at === "number") {
      if (lastTsRef.current === null || a.updated_at > lastTsRef.current) {
        lastTsRef.current = a.updated_at;
        setHistory((prev) => {
          const next = [...prev, a.equity!];
          return next.length > 40 ? next.slice(next.length - 40) : next;
        });
      }
    }
  }, [a.equity, a.updated_at]);

  const balance = fmt(a.balance);
  const equityNum = typeof a.equity === "number" ? a.equity : null;
  const equity = fmt(equityNum);
  const margin = fmt(a.margin);
  const free = fmt(a.margin_free);

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

  const nowSec = Date.now() / 1000;
  const fresh = typeof a.updated_at === "number" && nowSec - a.updated_at < 10;

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
      {/* Header */}
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
          <div style={{ fontWeight: 800, letterSpacing: ".02em", lineHeight: 1.1, fontSize: 16 }}>
            {a.label || a.login_hint}
          </div>
          <div style={{ opacity: 0.6, fontSize: 12, lineHeight: 1.1 }}>
            #{a.login_hint} • {a.server || "—"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: fresh ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.2)",
                color: fresh ? "#22c55e" : "#94a3b8",
                width: "fit-content",
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

        {/* Net % (mobile header) */}
        <div className="netpct netpct--header" style={{ minWidth: 120 }}>
          <Metric label="Net % Change" value={netPctStr} valueColor={netColor} valueBold />
        </div>
      </div>

      {/* KPI grid */}
      <div className="metric-grid" style={{ display: "grid", gap: 12 }}>
        {/* Net % (desktop) */}
        <div className="netpct netpct--grid">
          <Metric label="Net % Change" value={netPctStr} valueColor={netColor} valueBold />
        </div>

        <Metric label="Balance" value={balance} />

        {/* Equity + sparkline */}
        <div
          className="kpi"
          style={{
            background: "rgba(10, 12, 18, 0.5)",
            border: "1px solid rgba(255,255,255,0.06)",
            textAlign: "right",
            borderRadius: 12,
            padding: 12,
            minWidth: 120,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Equity</div>
            <div
              style={{
                marginTop: 4,
                fontSize: 16,
                fontWeight: 800,
                transition: "color 250ms ease",
              }}
            >
              {equity}
            </div>
          </div>
          <div style={{ color: "#8ab4f8" }}>
            {history.length > 1 ? <Sparkline data={history} /> : null}
          </div>
        </div>

        <Metric label="Margin" value={fmt(a.margin)} />
        <Metric label="Free Margin" value={fmt(a.margin_free)} />
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

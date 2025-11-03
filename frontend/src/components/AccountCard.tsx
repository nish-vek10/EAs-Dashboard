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

export default function AccountCard({ a }: { a: AccountRow }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pull a fresh snapshot for this account on mount, then every 10s.
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
  const balance = fmt(snap?.balance);
  const equity = fmt(snap?.equity);
  const margin = fmt(snap?.margin);
  const free = fmt(snap?.margin_free);

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
      {/* Identity row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: ".02em" }}>
          {a.label || a.login_hint}
        </div>
        <div style={{ opacity: 0.6, fontSize: 12 }}>
          #{a.login_hint} • {a.server || "—"}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 999,
            background: snap ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.2)",
          }}
        >
          {snap ? "Live" : "Pending"}
        </div>
      </div>

      {/* Metrics row */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
        }}
      >
        <Metric label="Balance" value={balance} />
        <Metric label="Equity" value={equity} />
        <Metric label="Margin" value={margin} />
        <Metric label="Free" value={free} />
      </div>

      {/* Currency / error row */}
      <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
        <div
          style={{
            marginLeft: "auto",
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: "rgba(10, 12, 18, 0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 16 }}>{value}</div>
    </div>
  );
}

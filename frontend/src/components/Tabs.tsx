import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Tabs() {
  const loc = useLocation();
  const path = loc.pathname.toLowerCase();
  const active = (g: "all" | "e2t" | "nish") =>
    (g === "all" && (path === "/" || path.startsWith("/all"))) ||
    (g === "e2t" && path.startsWith("/e2t")) ||
    (g === "nish" && path.startsWith("/nish"));

  return (
    <div className="tabs">
      <Link to="/" className={`tab ${active("all") ? "active" : ""}`}>All Accounts</Link>
      <Link to="/e2t" className={`tab ${active("e2t") ? "active" : ""}`}>E2T Demos</Link>
      <Link to="/nish" className={`tab ${active("nish") ? "active" : ""}`}>Nish Algos</Link>
    </div>
  );
}

import { Routes, Route, Link } from "react-router-dom";
import Overview from "./pages/Overview";
import AccountPage from "./pages/AccountPage";
import Tabs from "./components/Tabs";

export default function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="header">
        <div className="header-inner">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 0 16px rgba(124,58,237,0.6)",
            }}
          />
          <Link to="/">
            <h1
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: ".02em",
                margin: 0,
              }}
            >
              EAs Dashboard
            </h1>
          </Link>
          <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>
            Dark · Switzer
          </div>
        </div>
      </header>

      <main style={{ padding: 20 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Tabs />
          <Routes>
            <Route path="/" element={<Overview filter="All" />} />
            <Route path="/all" element={<Overview filter="All" />} />
            {/* exact Supabase group names */}
            <Route path="/e2t" element={<Overview filter="E2T Demos" />} />
            <Route path="/nish" element={<Overview filter="Nish Algos" />} />
            <Route path="/account/:loginHint" element={<AccountPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

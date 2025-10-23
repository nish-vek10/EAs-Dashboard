"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccountCard;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_router_dom_1 = require("react-router-dom");
function extractNumber(login) { var m = login.match(/\d+/); return m ? m[0] : null; }
function AccountCard(_a) {
    var _b, _c;
    var a = _a.a;
    var number = extractNumber(a.login_hint);
    return ((0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: "/account/".concat(encodeURIComponent(a.login_hint)), style: { textDecoration: "none", color: "inherit" }, children: ["      ", (0, jsx_runtime_1.jsxs)("div", { className: "rowcard", children: ["        ", (0, jsx_runtime_1.jsxs)("div", { className: "row-left", children: ["          ", (0, jsx_runtime_1.jsxs)("div", { className: "row-title", children: ["            ", (0, jsx_runtime_1.jsx)("span", { className: "name", children: a.login_hint }), "            ", number && (0, jsx_runtime_1.jsxs)("span", { className: "number", children: ["#", number] }), "            ", (0, jsx_runtime_1.jsxs)("span", { className: "broker", children: ["\u00B7 ", (_b = a.broker) !== null && _b !== void 0 ? _b : "—"] }), "          "] }), "          ", (0, jsx_runtime_1.jsxs)("div", { className: "muted", style: { fontSize: 12 }, children: ["            Positions: ", (0, jsx_runtime_1.jsx)("strong", { style: { color: "var(--text)" }, children: a.positions_count }), " \u00B7            Updated: ", a.updated_at ? new Date(a.updated_at).toLocaleTimeString() : "—", "          "] }), "        "] }), "        ", (0, jsx_runtime_1.jsxs)("div", { className: "row-kpis", children: ["          ", (0, jsx_runtime_1.jsx)(KPI, { label: "Balance", value: fmt(a.balance) }), "          ", (0, jsx_runtime_1.jsx)(KPI, { label: "Equity", value: fmt(a.equity) }), "          ", (0, jsx_runtime_1.jsx)(KPI, { label: "Margin", value: fmt(a.margin) }), "          ", (0, jsx_runtime_1.jsx)(KPI, { label: "Free", value: fmt(a.margin_free) }), "        "] }), "        ", (0, jsx_runtime_1.jsx)("span", { className: "badge", style: { marginLeft: "auto" }, children: (_c = a.currency) !== null && _c !== void 0 ? _c : "—" }), "      "] }), "    "] }));
}
function KPI(_a) {
    var label = _a.label, value = _a.value;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "kpi", children: ["      ", (0, jsx_runtime_1.jsx)("div", { className: "label", children: label }), "      ", (0, jsx_runtime_1.jsx)("div", { className: "value", children: value }), "    "] }));
}
function fmt(n) { if (typeof n !== "number")
    return "—"; return n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

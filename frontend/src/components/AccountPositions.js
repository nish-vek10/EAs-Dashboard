"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccountPositions;
var jsx_runtime_1 = require("react/jsx-runtime");
function AccountPositions(_a) {
    var positions = _a.positions;
    if (!(positions === null || positions === void 0 ? void 0 : positions.length)) {
        return (0, jsx_runtime_1.jsx)("div", { className: "muted", children: "No open positions." });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: { overflowX: "auto" }, children: ["      ", (0, jsx_runtime_1.jsxs)("table", { className: "table", children: ["        ", (0, jsx_runtime_1.jsxs)("thead", { children: ["          ", (0, jsx_runtime_1.jsxs)("tr", { children: ["            ", ["Ticket", "Symbol", "Side", "Lots", "Open", "SL", "TP", "Profit", "Comment", "Magic"].map(function (h) { return ((0, jsx_runtime_1.jsx)("th", { children: h }, h)); }), "          "] }), "        "] }), "        ", (0, jsx_runtime_1.jsxs)("tbody", { children: ["          ", positions.map(function (p) { var _a, _b, _c, _d; return ((0, jsx_runtime_1.jsxs)("tr", { children: ["              ", (0, jsx_runtime_1.jsx)("td", { children: p.ticket }), "              ", (0, jsx_runtime_1.jsx)("td", { children: p.symbol }), "              ", (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: "badge ".concat(p.type), children: p.type.toUpperCase() }) }), "              ", (0, jsx_runtime_1.jsx)("td", { children: p.lots }), "              ", (0, jsx_runtime_1.jsx)("td", { children: p.price_open }), "              ", (0, jsx_runtime_1.jsx)("td", { children: (_a = p.sl) !== null && _a !== void 0 ? _a : "—" }), "              ", (0, jsx_runtime_1.jsx)("td", { children: (_b = p.tp) !== null && _b !== void 0 ? _b : "—" }), "              ", (0, jsx_runtime_1.jsx)("td", { style: { color: pnlColor(p.profit) }, children: fmtPnL(p.profit) }), "              ", (0, jsx_runtime_1.jsx)("td", { children: (_c = p.comment) !== null && _c !== void 0 ? _c : "—" }), "              ", (0, jsx_runtime_1.jsx)("td", { children: (_d = p.magic) !== null && _d !== void 0 ? _d : "—" }), "            "] }, p.ticket)); }), "        "] }), "      "] }), "    "] }));
}
function fmtPnL(n) { if (typeof n !== "number")
    return "—"; var s = n.toFixed(2); return n >= 0 ? "+".concat(s) : s; }
function pnlColor(n) { if (typeof n !== "number")
    return "inherit"; return n >= 0 ? "var(--success)" : "var(--danger)"; }

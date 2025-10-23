"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Tabs;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_router_dom_1 = require("react-router-dom");
function Tabs() { var loc = (0, react_router_dom_1.useLocation)(); var path = loc.pathname.toLowerCase(); var active = function (g) { return (g === "all" && (path === "/" || path.startsWith("/all"))) || (g === "e2t" && path.startsWith("/e2t")) || (g === "nish" && path.startsWith("/nish")); }; return ((0, jsx_runtime_1.jsxs)("div", { className: "tabs", children: ["      ", (0, jsx_runtime_1.jsx)(react_router_dom_1.Link, { to: "/", className: "tab ".concat(active("all") ? "active" : ""), children: "All Accounts" }), "      ", (0, jsx_runtime_1.jsx)(react_router_dom_1.Link, { to: "/e2t", className: "tab ".concat(active("e2t") ? "active" : ""), children: "E2T Demos" }), "      ", (0, jsx_runtime_1.jsx)(react_router_dom_1.Link, { to: "/nish", className: "tab ".concat(active("nish") ? "active" : ""), children: "Nish Algos" }), "    "] })); }

"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Overview;
var api_1 = require("../api");
var live_1 = require("../live");
var groups_1 = require("../groups");
function Overview(_a) {
    var filter = _a.filter;
    var _b = useState([]), accounts = _b[0], setAccounts = _b[1];
    var _c = useState(null), error = _c[0], setError = _c[1];
    useEffect(function () { (0, api_1.fetchAccounts)().then(setAccounts).catch(function (err) { return setError(err.message); }); var unsub = (0, live_1.subscribe)(function (evt) { if (evt.type !== "positions_snapshot")
        return; setAccounts(function (prev) { var _a, _b, _c, _d, _e; var map = new Map(prev.map(function (a) { return [a.login_hint, __assign({}, a)]; })); var row = (_a = map.get(evt.account)) !== null && _a !== void 0 ? _a : { login_hint: evt.account, positions_count: 0 }; row.positions_count = Array.isArray(evt.positions) ? evt.positions.length : 0; row.balance = (_b = evt.snapshot) === null || _b === void 0 ? void 0 : _b.balance; row.equity = (_c = evt.snapshot) === null || _c === void 0 ? void 0 : _c.equity; row.margin = (_d = evt.snapshot) === null || _d === void 0 ? void 0 : _d.margin; row.margin_free = (_e = evt.snapshot) === null || _e === void 0 ? void 0 : _e.margin_free; row.updated_at = evt.ts; map.set(evt.account, row); return Array.from(map.values()); }); }); return function () { return unsub(); }; }, []);
    var visible = useMemo(function () { var byGroup = accounts.filter(function (a) { return filter === "All" ? true : (0, groups_1.getGroup)(a.login_hint) === filter; }); });
} // Alphabetical by login_hint (case-insensitive)    return byGroup.sort((a,b) => a.login_hint.toLowerCase().localeCompare(b.login_hint.toLowerCase()));  }, [accounts, filter]);  if (error) return <div className="rowcard">Error: {error}</div>;  if (!visible.length) return <div className="muted">No accounts in this view yet.</div>;  return (    <div style={{ display: "grid", gap: 12 }}>      {visible.map(a => <AccountCard key={a.login_hint} a={a} />)}    </div>  );}

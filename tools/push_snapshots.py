import os, time, json
from typing import Dict, Any, Optional
from datetime import datetime
import dotenv

dotenv.load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Path to your existing accounts.json (contains MT5 logins)
ACCOUNTS_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "accounts.json"))

from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

import MetaTrader5 as mt5

def ensure_init(term_path: str):
    try:
        mt5.shutdown()
    except Exception:
        pass
    if not mt5.initialize(path=term_path):
        raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")

def login(login: int, password: str, server: str):
    if not mt5.login(login=login, password=password, server=server):
        raise RuntimeError(f"MT5 login failed for {login}: {mt5.last_error()}")

def get_account_row_by_login(mt5_login: str) -> Optional[Dict[str, Any]]:
    res = supabase.table("accounts").select("id,account_size").eq("mt5_login", mt5_login).limit(1).single().execute()
    return res.data

def push_snapshot(account: Dict[str, Any]):
    ensure_init(account["terminal_path"])
    login(int(account["login"]), account["password"], account["server"])
    ai = mt5.account_info()
    if ai is None:
        raise RuntimeError(f"account_info() returned None for {account['login']}: {mt5.last_error()}")

    acct = get_account_row_by_login(str(account["login"]))
    if not acct:
        print(f"[WARN] No Supabase account for mt5_login={account['login']}; skipping.")
        return

    balance = float(ai.balance)
    equity = float(ai.equity)
    margin = float(ai.margin)
    free_margin = float(ai.margin_free)
    profit = float(ai.profit)

    net_return_pct = None
    acct_size = acct.get("account_size")
    if acct_size:
        try:
            s = float(acct_size)
            if s > 0:
                net_return_pct = (equity - s) / s * 100.0
        except Exception:
            pass

    payload = {
        "account_id": acct["id"],
        "balance": balance,
        "equity": equity,
        "margin": margin,
        "free_margin": free_margin,
        "profit": profit,
        "net_return_pct": net_return_pct,
    }
    supabase.table("equity_snapshots").insert(payload).execute()
    print(f"[OK] {account['label']}: eq={equity} net%={net_return_pct} @ {datetime.now().isoformat()}")

def main():
    with open(ACCOUNTS_JSON, "r", encoding="utf-8") as f:
        accounts = json.load(f)

    interval = int(os.getenv("PUSH_INTERVAL_SECONDS", "2"))  # every 2 seconds
    while True:
        for a in accounts:
            try:
                push_snapshot(a)
            except Exception as e:
                print(f"[ERR] {a.get('label')} -> {e}")
        time.sleep(interval)

if __name__ == "__main__":
    main()

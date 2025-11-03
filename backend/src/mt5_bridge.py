import json
import os
import threading
import time
from dataclasses import dataclass, asdict
from typing import Dict, Optional

# Toggle MT5 via env; on Heroku this must be "0"
MT5_ENABLED = os.getenv("MT5_ENABLED", "0") == "1"

try:
    import MetaTrader5 as mt5  # type: ignore
except Exception:
    mt5 = None
    MT5_ENABLED = False


@dataclass
class AccountSnapshot:
    label: str
    login: int
    balance: float
    equity: float
    margin: float
    margin_free: float
    margin_level: float
    profit: float
    currency: str
    server: str
    timestamp: float


class MT5Manager:
    """
    Manages a single MT5 session per process.
    Safely re-initializes when switching between different terminal paths.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._current_terminal: Optional[str] = None
        self._current_login: Optional[int] = None

    def _ensure_terminal(self, terminal_path: str):
        if not MT5_ENABLED or mt5 is None:
            raise RuntimeError("MT5 is disabled on this deployment.")
        # If terminal path changed, re-init
        if self._current_terminal != terminal_path:
            try:
                mt5.shutdown()
            except Exception:
                pass
            ok = mt5.initialize(path=terminal_path)
            if not ok:
                raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")
            self._current_terminal = terminal_path
            self._current_login = None  # force re-login

    def _ensure_login(self, login: int, password: str, server: str):
        if not MT5_ENABLED or mt5 is None:
            raise RuntimeError("MT5 is disabled on this deployment.")
        if self._current_login == login:
            return
        if not mt5.login(login=login, password=password, server=server):
            raise RuntimeError(f"MT5 login failed for {login}: {mt5.last_error()}")
        self._current_login = login

    def fetch_snapshot(
        self,
        *,
        label: str,
        login: int,
        password: str,
        server: str,
        currency: str,
        terminal_path: str,
    ) -> AccountSnapshot:
        with self._lock:
            self._ensure_terminal(terminal_path)
            self._ensure_login(login, password, server)
            ai = mt5.account_info()
            if ai is None:
                raise RuntimeError(f"account_info() returned None for {login}: {mt5.last_error()}")
            snap = AccountSnapshot(
                label=label,
                login=login,
                balance=ai.balance,
                equity=ai.equity,
                margin=ai.margin,
                margin_free=ai.margin_free,
                margin_level=ai.margin_level,
                profit=ai.profit,
                currency=currency or getattr(ai, "currency", ""),
                server=server,
                timestamp=time.time(),
            )
            return snap

    def close(self):
        try:
            if MT5_ENABLED and mt5 is not None:
                mt5.shutdown()
        except Exception:
            pass


def load_accounts_json() -> Dict[int, dict]:
    """
    Loads backend/../accounts.json into a dict keyed by login (int).
    Returns {} if not present (e.g., on Heroku) or MT5 is disabled.
    """
    if not MT5_ENABLED:
        return {}

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    acc_path = os.path.join(backend_dir, "accounts.json")
    if not os.path.exists(acc_path):
        return {}

    with open(acc_path, "r", encoding="utf-8") as f:
        accounts = json.load(f)
    out: Dict[int, dict] = {}
    for a in accounts:
        out[int(a["login"])] = a
    return out


def snapshot_to_dict(s: AccountSnapshot) -> Dict:
    return asdict(s)

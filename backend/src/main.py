from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import StreamingResponse

import asyncio
import json
import os
import time
from typing import Dict, List, Optional, Any

# ---- App + CORS -------------------------------------------------------------

app = FastAPI(title="EAs Dashboard API", version="0.1.0")

# Read from env var for production, fallback to localhost for dev
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ---- Supabase (for cloud mode) ---------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

supabase_client: Optional[Any] = None
if SUPABASE_ENABLED:
    try:
        from supabase import create_client  # type: ignore
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)  # type: ignore
    except Exception:
        supabase_client = None
        SUPABASE_ENABLED = False

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/")
def root():
    return {
        "service": "EAs Dashboard API",
        "status": "ok",
        "endpoints": ["/health", "/accounts", "/groups", "/snapshots/latest", "/live"],
    }

# ---- MT5 bridge wiring ------------------------------------------------------

from .mt5_bridge import (  # noqa: E402
    MT5Manager,
    load_accounts_json,
    snapshot_to_dict,
    MT5_ENABLED,
)

# Load accounts.json only when MT5 is enabled (dev/local)
ACCOUNTS_BY_LOGIN: Dict[int, dict] = load_accounts_json() if MT5_ENABLED else {}

# Sorted list (for stable UI ordering) — used only in local MT5 mode
ACCOUNTS_LIST: List[dict] = sorted(
    [
        {
            "label": a["label"],
            "login": int(a["login"]),
            "login_hint": str(a["login"]),
            "server": a["server"],
            "currency": a.get("currency", ""),
            "account_size": a.get("account_size"),
        }
        for a in ACCOUNTS_BY_LOGIN.values()
    ],
    key=lambda x: (x["label"] or "").lower(),
)

MANAGER = MT5Manager()
SNAPSHOTS: Dict[int, dict] = {}  # in-memory cache (local only)
POLL_TASK: Optional[asyncio.Task] = None


async def _poll_snapshots():
    """
    Periodically refresh account snapshots using MT5Manager (local only).
    On Heroku (MT5_DISABLED), this just sleeps.
    """
    interval = int(os.getenv("BRIDGE_POLL_SECONDS", "10"))
    while True:
        if not MT5_ENABLED:
            await asyncio.sleep(interval)
            continue

        for row in ACCOUNTS_LIST:
            acc = ACCOUNTS_BY_LOGIN.get(int(row["login"]))
            if not acc:
                continue
            try:
                snap = await asyncio.to_thread(
                    MANAGER.fetch_snapshot,
                    label=acc["label"],
                    login=int(acc["login"]),
                    password=acc["password"],
                    server=acc["server"],
                    currency=acc.get("currency", ""),
                    terminal_path=acc["terminal_path"],
                )
                SNAPSHOTS[int(acc["login"])] = snapshot_to_dict(snap)
            except Exception:
                pass
        await asyncio.sleep(interval)


# ---- REST endpoints ---------------------------------------------------------

@app.get("/accounts")
def list_accounts(group: Optional[str] = Query(default=None)) -> List[dict]:
    """
    List accounts without secrets.
    - Local (MT5_ENABLED=1): from accounts.json
    - Cloud (MT5_ENABLED=0): from Supabase 'accounts' or view 'v_accounts_with_group'
    """
    if MT5_ENABLED:
        return ACCOUNTS_LIST

    if not supabase_client:
        return []

    if group:
        resp = supabase_client.from_("v_accounts_with_group").select(
            "name,broker,mt5_login,base_currency,account_size,group_name"
        ).eq("group_name", group).order("name").execute()
    else:
        resp = supabase_client.table("accounts").select(
            "name,broker,mt5_login,base_currency,account_size"
        ).order("name").execute()

    out: List[dict] = []
    for r in (resp.data or []):
        out.append({
            "label": r.get("name"),
            "login": 0,
            "login_hint": str(r.get("mt5_login") or r.get("id")),
            "server": r.get("broker") or "",
            "currency": r.get("base_currency") or "USD",
            "account_size": r.get("account_size"),
        })
    return out


@app.get("/accounts/{login}/snapshot")
def get_snapshot(login: int) -> dict:
    """Fetch a live snapshot for one account (local MT5 only)."""
    if not MT5_ENABLED:
        raise HTTPException(status_code=503, detail="Live MT5 is disabled on this deployment.")
    acc = ACCOUNTS_BY_LOGIN.get(int(login))
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    try:
        snap = MANAGER.fetch_snapshot(
            label=acc["label"],
            login=int(acc["login"]),
            password=acc["password"],
            server=acc["server"],
            currency=acc.get("currency", ""),
            terminal_path=acc["terminal_path"],
        )
        return snapshot_to_dict(snap)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/groups")
def groups_summary() -> List[dict]:
    """
    Returns [{ name, count, sort_index }], including 'All Accounts'.
    """
    if not SUPABASE_ENABLED or not supabase_client:
        return [
            {"name": "All Accounts", "count": len(ACCOUNTS_LIST), "sort_index": 0},
            {"name": "E2T Demos", "count": 0, "sort_index": 1},
            {"name": "Nish Algos", "count": 0, "sort_index": 2},
        ]

    counts = supabase_client.from_("v_account_counts_by_group").select(
        "group_name,account_count"
    ).execute()

    tabs = supabase_client.table("account_groups").select(
        "name,sort_index"
    ).execute()

    sort_map = {t["name"]: t["sort_index"] for t in (tabs.data or [])}
    out: List[dict] = []
    for row in (counts.data or []):
        name = row.get("group_name") or "All Accounts"
        out.append({
            "name": name,
            "count": int(row.get("account_count") or 0),
            "sort_index": sort_map.get(name, 999),
        })

    if not any(x["name"] == "All Accounts" for x in out):
        out.append({"name": "All Accounts", "count": sum(x["count"] for x in out), "sort_index": 0})

    out.sort(key=lambda x: (x["sort_index"], x["name"].lower()))
    return out


@app.get("/snapshots/latest")
def latest_snapshots() -> List[dict]:
    """
    Returns latest equity metrics per account from Supabase.
    Shape:
    [
      {
        "login_hint": "52512991",
        "snapshot": { "balance":..., "equity":..., "margin":..., "margin_free":... },
        "net_return_pct": 0.25,           # may be null
        "updated_at": "2025-11-04T22:10:15.123Z"
      },
      ...
    ]
    """
    if not SUPABASE_ENABLED or not supabase_client:
        return []

    acc_res = supabase_client.table("accounts").select(
        "id,name,broker,mt5_login,base_currency,account_size"
    ).execute()
    snap_res = supabase_client.table("latest_equity_snapshots").select(
        "account_id,balance,equity,margin,free_margin,profit,net_return_pct,timestamp"
    ).execute()

    by_id = {str(a["id"]): a for a in (acc_res.data or [])}
    out: List[dict] = []
    for s in (snap_res.data or []):
        acc = by_id.get(str(s["account_id"]))
        if not acc:
            continue
        out.append({
            "login_hint": str(acc.get("mt5_login") or acc.get("id")),
            "snapshot": {
                "balance": s.get("balance"),
                "equity": s.get("equity"),
                "margin": s.get("margin"),
                "margin_free": s.get("free_margin"),
            },
            "net_return_pct": s.get("net_return_pct"),
            "updated_at": s.get("timestamp"),
        })
    # discourage caches
    Response(headers={"Cache-Control": "no-store"})
    return out


# ---- SSE (local only) -------------------------------------------------------

@app.get("/live")
async def live(request: Request):
    """
    Local-only SSE stream (Heroku has MT5 disabled, so this will be quiet there).
    """
    async def event_gen():
        while True:
            if await request.is_disconnected():
                break
            now = int(time.time())
            for row in ACCOUNTS_LIST:
                s = SNAPSHOTS.get(int(row["login"]))
                if not s:
                    continue
                evt = {
                    "type": "positions_snapshot",
                    "account": str(row["login"]),
                    "positions": [],
                    "snapshot": {
                        "balance": s.get("balance"),
                        "equity": s.get("equity"),
                        "margin": s.get("margin"),
                        "margin_free": s.get("margin_free"),
                    },
                    "ts": now,
                }
                yield f"data: {json.dumps(evt)}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(event_gen(), media_type="text/event-stream")


# ---- Lifecycle --------------------------------------------------------------

@app.on_event("startup")
async def _on_startup():
    global POLL_TASK
    if POLL_TASK is None:
        POLL_TASK = asyncio.create_task(_poll_snapshots())

@app.on_event("shutdown")
def _on_shutdown():
    global POLL_TASK
    try:
        MANAGER.close()
    except Exception:
        pass
    if POLL_TASK is not None:
        POLL_TASK.cancel()
        POLL_TASK = None

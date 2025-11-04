from fastapi import FastAPI, HTTPException
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

# ---- Supabase (for cloud fallback) ------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

supabase_client: Optional[Any] = None
if SUPABASE_ENABLED:
    try:
        from supabase import create_client  # type: ignore
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)  # type: ignore
    except Exception:
        # If supabase python client import/creation fails, disable fallback
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
        "endpoints": ["/health", "/accounts", "/live"],
    }

# ---- MT5 bridge wiring ------------------------------------------------------

from .mt5_bridge import (  # noqa: E402
    MT5Manager,
    load_accounts_json,
    snapshot_to_dict,
    MT5_ENABLED,
)

# Load accounts.json only when MT5 is enabled (not on Heroku)
ACCOUNTS_BY_LOGIN: Dict[int, dict] = load_accounts_json() if MT5_ENABLED else {}

# Sorted list (for stable UI ordering)
ACCOUNTS_LIST: List[dict] = sorted(
    [
        {
            "label": a["label"],
            "login": int(a["login"]),
            "login_hint": str(a["login"]),  # helpful for the UI
            "server": a["server"],
            "currency": a.get("currency", ""),
            "account_size": a.get("account_size"),  # pass through to UI
        }
        for a in ACCOUNTS_BY_LOGIN.values()
    ],
    key=lambda x: (x["label"] or "").lower(),
)

MANAGER = MT5Manager()

# In-memory latest snapshots (keyed by login)
SNAPSHOTS: Dict[int, dict] = {}

# Background poll task handle
POLL_TASK: Optional[asyncio.Task] = None


async def _poll_snapshots():
    """
    Periodically refresh account snapshots using MT5Manager
    and store them in SNAPSHOTS for the SSE stream.
    """
    interval = int(os.getenv("BRIDGE_POLL_SECONDS", "10"))
    while True:
        if not MT5_ENABLED:
            # On Heroku, MT5 is disabled; keep loop light
            await asyncio.sleep(interval)
            continue

        for row in ACCOUNTS_LIST:
            acc = ACCOUNTS_BY_LOGIN.get(int(row["login"]))
            if not acc:
                continue
            try:
                # fetch_snapshot is synchronous; run in thread
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
                # Keep previous snapshot on failure
                pass
        await asyncio.sleep(interval)


# ---- REST endpoints ---------------------------------------------------------

@app.get("/accounts")
def list_accounts() -> List[dict]:
    """
    List accounts without secrets.

    - Local (MT5_ENABLED=1): returns the accounts.json projection (current behavior).
    - Cloud (MT5_ENABLED=0): returns rows from Supabase 'accounts' table,
      mapped to the frontend's expected shape.
    """
    if MT5_ENABLED:
        return ACCOUNTS_LIST

    # Cloud fallback to Supabase
    if not supabase_client:
        # No Supabase configured; return empty list gracefully
        return []

    # Pull minimal fields and map to your frontend AccountRow shape
    try:
        resp = supabase_client.table("accounts").select(
            "id,name,broker,mt5_login,base_currency"
        ).order("name", desc=False).execute()
    except Exception:
        return []

    out: List[dict] = []
    for r in (resp.data or []):
        out.append({
            "label": r.get("name"),
            # frontend uses login_hint as the stable string id
            "login_hint": str(r.get("mt5_login") or r.get("id")),
            "server": r.get("broker") or "",
            "currency": r.get("base_currency") or "USD",
            # keep this key so frontend math doesn't break (null is OK)
            "account_size": None,
        })
    return out


@app.get("/accounts/{login}/snapshot")
def get_snapshot(login: int) -> dict:
    """Fetch a live snapshot for one account."""
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


# ---- SSE live stream --------------------------------------------------------

@app.get("/live")
async def live(request: Request):
    """
    Server-Sent Events stream. Emits a small event per account with latest snapshot.
    Frontend listens via EventSource(VITE_LIVE_URL).
    """

    async def event_gen():
        # Stream every ~5 seconds (separate from poller interval)
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
                    # positions can be added later
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

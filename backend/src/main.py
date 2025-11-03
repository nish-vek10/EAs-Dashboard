from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

# --- your existing app + CORS setup ---
app = FastAPI()

# Read from env var for production, fallback to localhost for dev
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}


# --- NEW: MT5 bridge wiring ---
from typing import List, Dict
from .mt5_bridge import MT5Manager, load_accounts_json, snapshot_to_dict

# Load accounts.json once on startup
ACCOUNTS_BY_LOGIN: Dict[int, dict] = load_accounts_json()
# Sorted list (for stable UI ordering)
ACCOUNTS_LIST: List[dict] = sorted(
    [
        {
            "label": a["label"],
            "login": int(a["login"]),
            "server": a["server"],
            "currency": a.get("currency", ""),
        }
        for a in ACCOUNTS_BY_LOGIN.values()
    ],
    key=lambda x: x["label"].lower()
)

MANAGER = MT5Manager()

@app.get("/accounts")
def list_accounts() -> List[dict]:
    """
    List accounts without secrets.
    """
    return ACCOUNTS_LIST

@app.get("/accounts/{login}/snapshot")
def get_snapshot(login: int) -> dict:
    """
    Fetch a live snapshot for one account.
    """
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

@app.on_event("shutdown")
def _shutdown():
    try:
        MANAGER.close()
    except Exception:
        pass

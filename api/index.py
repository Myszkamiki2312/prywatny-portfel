"""Vercel serverless entry — exposes the Python backend's /api/* as a FastAPI ASGI app.

Serverless notes:
- Storage is /tmp (writable but ephemeral). State pushed via PUT /api/state does not persist
  across invocations; the frontend is the source of truth (Supabase + client-side compute), and
  the high-value endpoints here are stateless: quotes proxy (browser-CORS bypass) and tax calcs.
- No background RealtimeRunner thread is started (serverless has no long-lived process).
"""
import os

os.environ.setdefault("PRYWATNY_PORTFEL_DATA_ROOT", "/tmp/prywatny-portfel-data")
os.environ.setdefault(
    "PRYWATNY_PORTFEL_PROJECT_ROOT",
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)

import traceback
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.server import (
    Database,
    QuoteService,
    BackupService,
    ExpertToolsService,
    ParityToolsService,
    NotificationService,
    RealtimeRunner,
    BrokerImporter,
    ReportService,
    AppContext,
    ApiError,
    AppHandler,
    PROJECT_ROOT,
)

app = FastAPI(title="Prywatny Portfel API")

_ctx = None


def _context() -> AppContext:
    global _ctx
    if _ctx is not None:
        return _ctx
    storage = Path(os.environ["PRYWATNY_PORTFEL_DATA_ROOT"])
    storage.mkdir(parents=True, exist_ok=True)
    database = Database(storage / "prywatny_portfel.db")
    # Fast-fail on serverless: shorter timeout, no retry/backoff so a multi-asset /quotes/refresh
    # stays well under the function time limit instead of stacking 8s x retries x suffix candidates.
    quotes = QuoteService(timeout_seconds=5, max_retry_attempts=0, retry_backoff_seconds=0.0)
    expert = ExpertToolsService(database)
    notifications = NotificationService(database)
    backup = BackupService(database=database, data_root=storage)
    realtime = RealtimeRunner(
        database=database,
        expert_tools=expert,
        notifications=notifications,
        quote_service=quotes,
        backup_service=backup,
    )
    # Intentionally NOT realtime.start() — no background threads on serverless.
    _ctx = AppContext(
        database=database,
        quote_service=quotes,
        importer=BrokerImporter(database),
        reports=ReportService(
            database.get_state,
            benchmark_history_provider=quotes.fetch_daily_history,
        ),
        expert_tools=expert,
        parity_tools=ParityToolsService(database, quotes),
        notifications=notifications,
        realtime=realtime,
        backup_service=backup,
        project_root=Path(PROJECT_ROOT),
        data_root=storage,
    )
    return _ctx


class _Handler:
    """Minimal stand-in for the stdlib request handler that AppHandler._dispatch expects."""

    def __init__(self, context, headers):
        self.context = context
        self.headers = headers
        self.client_address = ("127.0.0.1", 0)


# Endpoints that do outbound network / process work or admin actions are disabled on the public
# hosted backend (no per-user auth here; the API token would be public in the browser bundle anyway).
_BLOCKED_ON_SERVERLESS = (
    "/api/update/",                    # git pull / remote set-url
    "/api/tools/notifications/test",   # opens SMTP / Telegram to attacker-chosen hosts
    "/api/tools/notifications/config", # would persist SMTP/Telegram secrets (ephemeral, pointless)
    "/api/tools/backup/run",
    "/api/tools/backup/verify",
    "/api/tools/realtime/start",
    "/api/tools/realtime/stop",
    "/api/tools/realtime/run",
)


def _is_blocked(full_path: str) -> bool:
    base = full_path.split("?", 1)[0].rstrip("/")
    for blocked in _BLOCKED_ON_SERVERLESS:
        target = blocked.rstrip("/")
        if base == target or base.startswith(target + "/"):
            return True
    return False


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def api(path: str, request: Request):
    full_path = "/api/" + path
    if _is_blocked(full_path):
        return JSONResponse(
            status_code=403,
            content={"error": "This endpoint is disabled on the hosted backend."},
        )
    handler = _Handler(_context(), request.headers)
    query: dict = {}
    for key, value in request.query_params.multi_items():
        query.setdefault(key, []).append(value)
    payload: dict = {}
    if request.method in ("POST", "PUT", "DELETE"):
        try:
            payload = await request.json()
        except Exception:
            payload = {}
    try:
        return AppHandler._dispatch(handler, request.method, full_path, query, payload)
    except ApiError as error:
        return JSONResponse(status_code=error.status, content={"error": error.message})
    except Exception:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


# Anything rewritten here that is not /api/* (e.g. /backend/*) has no route -> 404,
# which keeps backend source from being served as static.
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def not_found(path: str):
    return JSONResponse(status_code=404, content={"error": "Not found"})

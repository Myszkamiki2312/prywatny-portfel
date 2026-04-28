from __future__ import annotations
import os
import json
import time
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable, Tuple

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .server import (
    Database, QuoteService, BackupService, ExpertToolsService, 
    ParityToolsService, NotificationService, RealtimeRunner, 
    BrokerImporter, ReportService, AppContext, ApiError, APP_NAME,
    PROJECT_ROOT, DATA_ROOT, AppHandler
)

app = FastAPI(title=f"{APP_NAME} FastAPI")

# Global runtime state
@app.on_event("startup")
async def startup_event():
    static_root = Path(os.environ.get("PRYWATNY_PORTFEL_PROJECT_ROOT", PROJECT_ROOT))
    storage_root = Path(os.environ.get("PRYWATNY_PORTFEL_DATA_ROOT", DATA_ROOT))
    db_path = Path(os.environ.get("PRYWATNY_PORTFEL_DB_PATH", storage_root / "prywatny_portfel.db"))
    
    # Try legacy DB if default doesn't exist
    if not db_path.exists():
        legacy_db = storage_root / "myfund_solo.db"
        if legacy_db.exists():
            db_path = legacy_db

    database = Database(db_path)
    quote_service = QuoteService()
    backup_service = BackupService(database=database, data_root=storage_root)
    expert_tools = ExpertToolsService(database)
    parity_tools = ParityToolsService(database, quote_service)
    notifications = NotificationService(database)
    realtime = RealtimeRunner(
        database=database,
        expert_tools=expert_tools,
        notifications=notifications,
        quote_service=quote_service,
        backup_service=backup_service,
    )
    realtime.start()
    
    context = AppContext(
        database=database,
        quote_service=quote_service,
        importer=BrokerImporter(database),
        reports=ReportService(
            database.get_state,
            benchmark_history_provider=quote_service.fetch_daily_history,
        ),
        expert_tools=expert_tools,
        parity_tools=parity_tools,
        notifications=notifications,
        realtime=realtime,
        backup_service=backup_service,
        project_root=static_root,
        data_root=storage_root,
    )
    app.state.context = context
    app.state.realtime = realtime
    app.state.database = database

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, "realtime"):
        app.state.realtime.stop()
    if hasattr(app.state, "database"):
        app.state.database.close()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Proxy to existing logic
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def api_proxy(path: str, request: Request):
    full_path = f"/api/{path}"
    
    # Auth
    expected = str(os.environ.get("PRYWATNY_PORTFEL_API_TOKEN", "")).strip()
    if expected and full_path not in {"/api/health", "/api/monitoring/healthcheck"}:
        provided = request.headers.get("X-App-Token", "")
        if provided != expected:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    # Prepare context for original _dispatch
    class DummyHandler:
        def __init__(self, context, headers):
            self.context = context
            self.headers = headers
    
    handler = DummyHandler(app.state.context, request.headers)
    
    # Query params
    query = {}
    for k, v in request.query_params.multi_items():
        if k not in query: query[k] = []
        query[k].append(v)
        
    # Payload
    payload = {}
    if request.method in {"POST", "PUT"}:
        try:
            payload = await request.json()
        except:
            payload = {}

    try:
        # Call the original dispatch logic
        result = AppHandler._dispatch(handler, request.method, full_path, query, payload)
        return result
    except ApiError as e:
        return JSONResponse(status_code=e.status, content={"error": e.message})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"FastAPI Proxy Error: {str(e)}"})

# Static files - MUST be after API routes
static_dir = Path(os.environ.get("PRYWATNY_PORTFEL_PROJECT_ROOT", PROJECT_ROOT)).resolve()
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

"""Realtime runner for alert workflow cron and webhook/manual triggers."""

from __future__ import annotations

from datetime import datetime, timezone
import threading
from typing import Any, Dict

from .backup import BackupService
from .database import Database
from .expert_tools import ExpertToolsService
from .notifications import NotificationService
from .quotes import QuoteService


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class RealtimeRunner:
    def __init__(
        self,
        *,
        database: Database,
        expert_tools: ExpertToolsService,
        notifications: NotificationService,
        quote_service: QuoteService,
        backup_service: BackupService | None = None,
    ):
        self.database = database
        self.expert_tools = expert_tools
        self.notifications = notifications
        self.quote_service = quote_service
        self.backup_service = backup_service
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.RLock()
        self._last_result: Dict[str, Any] = {
            "lastRunAt": "",
            "lastTriggerSource": "",
            "summary": {},
            "dispatch": {},
            "error": "",
        }

    def start(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._loop, daemon=True, name="prywatny-portfel-realtime")
            self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        thread = self._thread
        if thread and thread.is_alive():
            thread.join(timeout=2.0)

    def status(self) -> Dict[str, Any]:
        config = self.database.get_realtime_config()
        worker_running = bool(self._thread and self._thread.is_alive())
        with self._lock:
            return {
                "running": worker_running,
                "cronEnabled": bool(config.get("enabled")),
                "active": worker_running and bool(config.get("enabled")),
                "config": config,
                "lastRunAt": self._last_result.get("lastRunAt", ""),
                "lastTriggerSource": self._last_result.get("lastTriggerSource", ""),
                "summary": self._last_result.get("summary", {}),
                "dispatch": self._last_result.get("dispatch", {}),
                "error": self._last_result.get("error", ""),
            }

    def set_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        saved = self.database.set_realtime_config(config)
        return saved

    def run_once(self, *, source: str) -> Dict[str, Any]:
        config = self.database.get_realtime_config()
        result: Dict[str, Any] = {}
        error = ""
        try:
            if config.get("autoRefreshQuotes"):
                self._refresh_quotes()

            workflow = self.expert_tools.run_alert_workflow(portfolio_id=str(config.get("portfolioId") or ""))
            dispatch = self.notifications.dispatch_triggered(
                triggered_rows=workflow.get("triggered", []),
                source=source,
            )
            result = {
                "triggerSource": source,
                "workflow": workflow,
                "dispatch": dispatch,
                "ranAt": _now_iso(),
            }
        except Exception as exc:  # noqa: BLE001
            error = str(exc)
            result = {
                "triggerSource": source,
                "workflow": {"summary": {"totalAlerts": 0, "triggered": 0, "waiting": 0}},
                "dispatch": {"enabled": False, "sent": 0, "errors": 1, "items": []},
                "ranAt": _now_iso(),
            }

        with self._lock:
            self._last_result = {
                "lastRunAt": result.get("ranAt", _now_iso()),
                "lastTriggerSource": source,
                "summary": result.get("workflow", {}).get("summary", {}),
                "dispatch": result.get("dispatch", {}),
                "error": error,
            }
        return result

    def _loop(self) -> None:
        while not self._stop_event.is_set():
            if self.backup_service is not None:
                try:
                    self.backup_service.run_scheduled_if_due()
                except Exception:  # noqa: BLE001
                    pass
            config = self.database.get_realtime_config()
            if config.get("enabled"):
                self.run_once(source="cron")
                wait_seconds = max(60, int(config.get("intervalMinutes", 15)) * 60)
            else:
                wait_seconds = 5
            if self._stop_event.wait(wait_seconds):
                break

    def _refresh_quotes(self) -> None:
        state = self.database.get_state()
        tickers = [
            str(asset.get("ticker", "")).strip().upper()
            for asset in state.get("assets", [])
            if str(asset.get("ticker", "")).strip()
        ]
        if not tickers:
            return
        quotes = self.quote_service.refresh(tickers)
        if not quotes:
            return
        self.database.upsert_quotes(quotes)
        quote_map = {str(item.get("ticker", "")).upper(): item for item in quotes}
        updated = False
        for asset in state.get("assets", []):
            ticker = str(asset.get("ticker", "")).upper()
            quote = quote_map.get(ticker)
            if not quote:
                continue
            asset["currentPrice"] = float(quote.get("price", asset.get("currentPrice", 0)))
            asset["currency"] = str(quote.get("currency", asset.get("currency", "PLN")))
            updated = True
        if updated:
            self.database.replace_state(state)

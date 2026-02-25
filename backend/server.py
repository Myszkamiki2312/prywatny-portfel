"""Prywatny Portfel backend server.

Run:
    python3 -m backend.server --port 8080
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple, TypedDict
import time
from urllib.parse import parse_qs, urlparse

from .backup import BackupService
from .database import Database
from .expert_tools import ExpertToolsService
from .importers import BrokerImporter
from .notifications import NotificationService
from .parity_tools import ParityToolsService
from .quotes import QuoteService
from .realtime import RealtimeRunner
from .reports import ReportService
from .utils import now_iso, to_int


PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_NAME = "Prywatny Portfel"
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "prywatny_portfel.db"
LEGACY_DB_PATH = PROJECT_ROOT / "data" / "myfund_solo.db"


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


@dataclass
class AppContext:
    database: Database
    quote_service: QuoteService
    importer: BrokerImporter
    reports: ReportService
    expert_tools: ExpertToolsService
    parity_tools: ParityToolsService
    notifications: NotificationService
    realtime: RealtimeRunner
    backup_service: BackupService
    project_root: Path


RouteKey = Tuple[str, str]


class QuoteUpsertRow(TypedDict):
    ticker: str
    price: float
    currency: str
    provider: str
    fetched_at: str


class ApiQuoteRow(TypedDict):
    ticker: str
    price: float
    currency: str
    provider: str
    fetchedAt: str
    fetched_at: str
    ageSeconds: int
    stale: bool
    source: str


class AppHandler(SimpleHTTPRequestHandler):
    context: AppContext

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(self.context.project_root), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Token")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api("GET", parsed)
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api("POST", parsed)
            return
        self._send_json(404, {"error": "Endpoint not found"})

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api("PUT", parsed)
            return
        self._send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api("DELETE", parsed)
            return
        self._send_json(404, {"error": "Endpoint not found"})

    def _handle_api(self, method: str, parsed) -> None:
        try:
            payload = {}
            if method in {"POST", "PUT"}:
                payload = self._read_json()
            response = self._dispatch(method, parsed.path, parse_qs(parsed.query), payload)
            self._send_json(200, response)
        except ApiError as error:
            self._send_json(error.status, {"error": error.message})
        except Exception as error:  # noqa: BLE001
            self._send_json(500, {"error": f"Internal server error: {error}"})

    def _dispatch(
        self,
        method: str,
        path: str,
        query: Dict[str, List[str]],
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        def _route_health() -> Dict[str, Any]:
            state = self.context.database.get_state()
            return {
                "status": "ok",
                "serverTime": now_iso(),
                "dbPath": str(self.context.database.db_path),
                "counts": {
                    "portfolios": len(state["portfolios"]),
                    "accounts": len(state["accounts"]),
                    "assets": len(state["assets"]),
                    "operations": len(state["operations"]),
                },
            }

        def _route_monitoring_status() -> Dict[str, Any]:
            state = self.context.database.get_state()
            quotes = self.context.database.get_quotes()
            quote_stats = _quote_freshness_stats(quotes)
            return {
                "status": "ok",
                "serverTime": now_iso(),
                "counts": {
                    "portfolios": len(state["portfolios"]),
                    "accounts": len(state["accounts"]),
                    "assets": len(state["assets"]),
                    "operations": len(state["operations"]),
                    "alerts": len(state["alerts"]),
                    "liabilities": len(state["liabilities"]),
                },
                "quotes": quote_stats,
                "realtime": self.context.realtime.status(),
                "backup": {
                    "config": self.context.backup_service.get_config(),
                    "lastRun": self.context.backup_service.last_run(),
                },
            }

        def _route_put_state() -> Dict[str, Any]:
            raw_state = payload.get("state") if isinstance(payload, dict) and "state" in payload else payload
            if not isinstance(raw_state, dict):
                raise ApiError(400, "Expected JSON object for state.")
            saved = self.context.database.replace_state(raw_state)
            return {
                "saved": True,
                "serverTime": now_iso(),
                "counts": {
                    "portfolios": len(saved["portfolios"]),
                    "accounts": len(saved["accounts"]),
                    "assets": len(saved["assets"]),
                    "operations": len(saved["operations"]),
                },
            }

        def _route_quotes_refresh() -> Dict[str, Any]:
            tickers = _payload_tickers(payload)
            if not tickers:
                state = self.context.database.get_state()
                tickers = [asset["ticker"] for asset in state["assets"] if str(asset.get("ticker") or "").strip()]
            refreshed_quotes = self.context.quote_service.refresh(tickers)
            quote_map: Dict[str, ApiQuoteRow] = {
                str(row.get("ticker") or "").upper(): _api_quote_row(row, default_source="market-data")
                for row in refreshed_quotes
                if str(row.get("ticker") or "").strip()
            }

            fresh_quotes = [row for row in quote_map.values() if not bool(row.get("stale"))]
            if fresh_quotes:
                self.context.database.upsert_quotes([_quote_upsert_row(row) for row in fresh_quotes])

            missing_or_stale = [
                ticker
                for ticker in tickers
                if ticker not in quote_map or bool(quote_map[ticker].get("stale"))
            ]
            if missing_or_stale:
                for db_row in self.context.database.get_quotes(missing_or_stale):
                    mapped = _api_quote_row(db_row, default_source="db-cache")
                    existing = quote_map.get(mapped["ticker"])
                    if not existing or (bool(existing.get("stale")) and not bool(mapped.get("stale"))):
                        quote_map[mapped["ticker"]] = mapped

            quotes = [quote_map[ticker] for ticker in tickers if ticker in quote_map]

            if quotes:
                state = self.context.database.get_state()
                updated = False
                for asset in state["assets"]:
                    ticker = str(asset.get("ticker") or "").upper()
                    if ticker in quote_map:
                        asset["currentPrice"] = float(quote_map[ticker]["price"])
                        asset["currency"] = str(quote_map[ticker]["currency"])
                        updated = True
                if updated:
                    self.context.database.replace_state(state)

            return {
                "quotes": quotes,
                "requested": len(tickers),
                "resolved": len(quotes),
                "updated": len(fresh_quotes),
                "fallbackUsed": len([row for row in quotes if bool(row.get("stale"))]),
                "missing": max(0, len(tickers) - len(quotes)),
            }

        def _route_reports_generate() -> Dict[str, Any]:
            report_name = str(payload.get("reportName") or payload.get("report") or "").strip()
            portfolio_id = str(payload.get("portfolioId") or "").strip()
            if not report_name:
                raise ApiError(400, "Missing reportName.")
            report = self.context.reports.generate(report_name=report_name, portfolio_id=portfolio_id)
            return {"report": report}

        def _route_forum_post_add() -> Dict[str, Any]:
            try:
                return self.context.parity_tools.add_forum_post(payload)
            except ValueError as error:
                raise ApiError(400, str(error)) from error

        def _route_option_position_add() -> Dict[str, Any]:
            try:
                return self.context.parity_tools.add_option_position(payload)
            except ValueError as error:
                raise ApiError(400, str(error)) from error

        def _route_model_portfolio_set() -> Dict[str, Any]:
            try:
                return {"model": self.context.parity_tools.set_model_portfolio(payload)}
            except ValueError as error:
                raise ApiError(400, str(error)) from error

        def _route_clone_public_portfolio() -> Dict[str, Any]:
            source_portfolio_id = str(payload.get("sourcePortfolioId") or "").strip()
            new_name = str(payload.get("name") or "").strip()
            if not source_portfolio_id:
                raise ApiError(400, "Missing sourcePortfolioId.")
            try:
                return self.context.parity_tools.clone_public_portfolio(
                    source_portfolio_id=source_portfolio_id,
                    new_name=new_name,
                )
            except ValueError as error:
                raise ApiError(400, str(error)) from error

        def _route_alerts_webhook() -> Dict[str, Any]:
            token = _extract_webhook_token(self.headers, query)
            config = self.context.database.get_realtime_config()
            expected = str(config.get("webhookSecret") or "").strip()
            if expected and token != expected:
                raise ApiError(403, "Invalid webhook token.")
            result = self.context.realtime.run_once(source="webhook")
            return {"ok": True, "result": result}

        def _route_realtime_start() -> Dict[str, Any]:
            config = self.context.database.get_realtime_config()
            config["enabled"] = True
            self.context.database.set_realtime_config(config)
            self.context.realtime.start()
            return self.context.realtime.status()

        def _route_realtime_stop() -> Dict[str, Any]:
            config = self.context.database.get_realtime_config()
            config["enabled"] = False
            self.context.database.set_realtime_config(config)
            self.context.realtime.stop()
            return self.context.realtime.status()

        def _route_backup_run() -> Dict[str, Any]:
            verify_after = payload.get("verifyAfter")
            verify_flag = bool(verify_after) if verify_after is not None else None
            result = self.context.backup_service.run_backup(trigger="manual", verify_after=verify_flag)
            return {"backup": result}

        def _route_import_broker() -> Dict[str, Any]:
            broker_id = path.removeprefix("/api/import/broker/").strip().lower()
            csv_text = payload.get("csv")
            if not isinstance(csv_text, str) or not csv_text.strip():
                raise ApiError(400, "Missing 'csv' in JSON payload.")
            options = payload.get("options") if isinstance(payload.get("options"), dict) else {}
            file_name = payload.get("fileName")
            if isinstance(file_name, str) and file_name.strip():
                options["fileName"] = file_name.strip()
            summary = self.context.importer.import_csv(
                broker=broker_id,
                csv_text=csv_text,
                options=options,
            )
            return {"import": summary}

        routes: Dict[RouteKey, Callable[[], Dict[str, Any]]] = {
            ("GET", "/api/health"): _route_health,
            ("GET", "/api/tools/monitoring/status"): _route_monitoring_status,
            ("GET", "/api/state"): lambda: {"state": self.context.database.get_state()},
            ("PUT", "/api/state"): _route_put_state,
            ("GET", "/api/quotes"): lambda: {
                "quotes": [_api_quote_row(row, default_source="db") for row in self.context.database.get_quotes(_query_tickers(query) or None)]
            },
            ("POST", "/api/quotes/refresh"): _route_quotes_refresh,
            ("GET", "/api/reports/catalog"): lambda: {"reports": self.context.reports.catalog()},
            ("POST", "/api/reports/generate"): _route_reports_generate,
            ("GET", "/api/metrics/portfolio"): lambda: {
                "metrics": self.context.reports.metrics(portfolio_id=str(query.get("portfolioId", [""])[0]).strip())
            },
            ("GET", "/api/tools/scanner"): lambda: self.context.expert_tools.scanner(
                {
                    "minScore": query.get("minScore", ["0"])[0],
                    "maxRisk": query.get("maxRisk", ["10"])[0],
                    "sector": query.get("sector", [""])[0],
                    "minPrice": query.get("minPrice", ["0"])[0],
                    "portfolioId": query.get("portfolioId", [""])[0],
                }
            ),
            ("POST", "/api/tools/scanner"): lambda: self.context.expert_tools.scanner(payload),
            ("GET", "/api/tools/signals"): lambda: self.context.expert_tools.signals(
                portfolio_id=str(query.get("portfolioId", [""])[0]).strip()
            ),
            ("GET", "/api/tools/calendar"): lambda: self.context.expert_tools.calendar(
                days=to_int(query.get("days", ["60"])[0], 60),
                portfolio_id=str(query.get("portfolioId", [""])[0]).strip(),
            ),
            ("GET", "/api/tools/recommendations"): lambda: self.context.expert_tools.recommendations(
                portfolio_id=str(query.get("portfolioId", [""])[0]).strip()
            ),
            ("GET", "/api/tools/charts/candles"): lambda: self.context.parity_tools.candles(
                ticker=str(query.get("ticker", [""])[0]).strip(),
                limit=to_int(query.get("limit", ["120"])[0], 120),
            ),
            ("GET", "/api/tools/charts/tradingview"): lambda: self.context.parity_tools.tradingview(
                ticker=str(query.get("ticker", [""])[0]).strip()
            ),
            ("GET", "/api/tools/catalyst"): lambda: self.context.parity_tools.catalyst_analysis(
                portfolio_id=str(query.get("portfolioId", [""])[0]).strip(),
                limit=to_int(query.get("limit", ["80"])[0], 80),
            ),
            ("GET", "/api/tools/funds/ranking"): lambda: self.context.parity_tools.funds_ranking(
                limit=to_int(query.get("limit", ["30"])[0], 30)
            ),
            ("GET", "/api/tools/espi"): lambda: self.context.parity_tools.espi_messages(
                query=str(query.get("query", [""])[0]).strip(),
                limit=to_int(query.get("limit", ["40"])[0], 40),
            ),
            ("POST", "/api/tools/tax/optimize"): lambda: self.context.parity_tools.tax_optimize(payload),
            ("POST", "/api/tools/tax/foreign-dividend"): lambda: self.context.parity_tools.tax_foreign_dividend(payload),
            ("POST", "/api/tools/tax/crypto"): lambda: self.context.parity_tools.tax_crypto(payload),
            ("POST", "/api/tools/tax/foreign-interest"): lambda: self.context.parity_tools.tax_foreign_interest(payload),
            ("POST", "/api/tools/tax/bond-interest"): lambda: self.context.parity_tools.tax_bond_interest(payload),
            ("GET", "/api/tools/forum"): lambda: self.context.parity_tools.list_forum(
                ticker=str(query.get("ticker", [""])[0]).strip(),
                limit=to_int(query.get("limit", ["200"])[0], 200),
            ),
            ("POST", "/api/tools/forum/post"): _route_forum_post_add,
            ("POST", "/api/tools/options/exercise-price"): lambda: self.context.parity_tools.option_exercise_price(payload),
            ("GET", "/api/tools/options/positions"): lambda: self.context.parity_tools.option_positions(
                refresh_quotes=str(query.get("refresh", ["false"])[0]).strip().lower() in {"1", "true", "yes", "on"}
            ),
            ("POST", "/api/tools/options/positions"): _route_option_position_add,
            ("GET", "/api/tools/model-portfolio"): lambda: {"model": self.context.parity_tools.get_model_portfolio()},
            ("PUT", "/api/tools/model-portfolio"): _route_model_portfolio_set,
            ("GET", "/api/tools/model-portfolio/compare"): lambda: self.context.parity_tools.compare_model_portfolio(
                portfolio_id=str(query.get("portfolioId", [""])[0]).strip()
            ),
            ("GET", "/api/tools/public-portfolios"): lambda: self.context.parity_tools.list_public_portfolios(),
            ("POST", "/api/tools/public-portfolios/clone"): _route_clone_public_portfolio,
            ("POST", "/api/tools/alerts/run"): lambda: self.context.expert_tools.run_alert_workflow(
                portfolio_id=str(payload.get("portfolioId") or "").strip()
            ),
            ("POST", "/api/tools/alerts/webhook"): _route_alerts_webhook,
            ("GET", "/api/tools/alerts/history"): lambda: self.context.expert_tools.alert_history(
                limit=to_int(query.get("limit", ["100"])[0], 100)
            ),
            ("GET", "/api/tools/realtime/status"): lambda: self.context.realtime.status(),
            ("PUT", "/api/tools/realtime/config"): lambda: {
                "config": self.context.realtime.set_config(payload),
                "status": self.context.realtime.status(),
            },
            ("POST", "/api/tools/realtime/run"): lambda: {
                "result": self.context.realtime.run_once(source="manual"),
                "status": self.context.realtime.status(),
            },
            ("POST", "/api/tools/realtime/start"): _route_realtime_start,
            ("POST", "/api/tools/realtime/stop"): _route_realtime_stop,
            ("GET", "/api/tools/backup/config"): lambda: {"config": self.context.backup_service.get_config()},
            ("PUT", "/api/tools/backup/config"): lambda: {"config": self.context.backup_service.set_config(payload)},
            ("POST", "/api/tools/backup/run"): _route_backup_run,
            ("POST", "/api/tools/backup/verify"): lambda: {
                "verify": self.context.backup_service.verify_backup(state_file=str(payload.get("stateFile") or "").strip())
            },
            ("GET", "/api/tools/backup/runs"): lambda: {
                "runs": self.context.backup_service.list_runs(limit=to_int(query.get("limit", ["50"])[0], 50))
            },
            ("GET", "/api/tools/notifications/config"): lambda: {"config": self.context.notifications.get_config()},
            ("PUT", "/api/tools/notifications/config"): lambda: {"config": self.context.notifications.set_config(payload)},
            ("POST", "/api/tools/notifications/test"): lambda: {"result": self.context.notifications.send_test()},
            ("GET", "/api/tools/notifications/history"): lambda: self.context.notifications.history(
                limit=to_int(query.get("limit", ["100"])[0], 100)
            ),
            ("GET", "/api/import/brokers"): lambda: {"brokers": self.context.importer.list_brokers()},
            ("GET", "/api/import/logs"): lambda: {
                "logs": self.context.database.list_import_logs(limit=to_int(query.get("limit", ["50"])[0], 50))
            },
            ("GET", "/api/scanner"): lambda: self.context.expert_tools.scanner({}),
        }

        handler = routes.get((method, path))
        if handler:
            return handler()

        prefix_routes: List[Tuple[str, str, Callable[[], Dict[str, Any]]]] = [
            (
                "DELETE",
                "/api/tools/forum/post/",
                lambda: self.context.parity_tools.delete_forum_post(
                    post_id=path.removeprefix("/api/tools/forum/post/").strip()
                ),
            ),
            (
                "DELETE",
                "/api/tools/options/positions/",
                lambda: self.context.parity_tools.delete_option_position(
                    position_id=path.removeprefix("/api/tools/options/positions/").strip()
                ),
            ),
            (
                "POST",
                "/api/import/broker/",
                _route_import_broker,
            ),
        ]
        for route_method, prefix, prefix_handler in prefix_routes:
            if method == route_method and path.startswith(prefix):
                return prefix_handler()

        raise ApiError(404, "Endpoint not found")

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise ApiError(400, f"Invalid JSON: {error}") from error
        if not isinstance(parsed, dict):
            raise ApiError(400, "Expected top-level JSON object.")
        return parsed

    def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _query_tickers(query: Dict[str, List[str]]) -> List[str]:
    raw = query.get("tickers", [])
    if not raw:
        return []
    values: List[str] = []
    for chunk in raw:
        for ticker in str(chunk).split(","):
            text = ticker.strip().upper()
            if text and text not in values:
                values.append(text)
    return values


def _payload_tickers(payload: Dict[str, Any]) -> List[str]:
    raw = payload.get("tickers")
    values: List[str] = []
    if isinstance(raw, list):
        iterable = raw
    elif isinstance(raw, str):
        iterable = raw.split(",")
    else:
        iterable = []
    for item in iterable:
        text = str(item or "").strip().upper()
        if text and text not in values:
            values.append(text)
    return values


def _extract_webhook_token(headers, query: Dict[str, List[str]]) -> str:
    direct = str(headers.get("X-Webhook-Token") or "").strip()
    if direct:
        return direct
    token_list = query.get("token", [])
    if token_list:
        return str(token_list[0]).strip()
    return ""


def _quote_upsert_row(row: Dict[str, Any]) -> QuoteUpsertRow:
    return {
        "ticker": str(row.get("ticker") or "").upper(),
        "price": float(row.get("price") or 0),
        "currency": str(row.get("currency") or "PLN"),
        "provider": str(row.get("provider") or "unknown"),
        "fetched_at": str(row.get("fetched_at") or row.get("fetchedAt") or now_iso()),
    }


def _api_quote_row(row: Dict[str, Any], *, default_source: str) -> ApiQuoteRow:
    ticker = str(row.get("ticker") or "").upper().strip()
    fetched_at = str(row.get("fetched_at") or row.get("fetchedAt") or now_iso())
    age_seconds = _age_seconds_from_iso(fetched_at)
    stale = bool(row.get("stale")) if row.get("stale") is not None else age_seconds > 15 * 60
    source = str(row.get("source") or default_source or "unknown")
    return {
        "ticker": ticker,
        "price": float(row.get("price") or 0),
        "currency": str(row.get("currency") or "PLN"),
        "provider": str(row.get("provider") or "unknown"),
        "fetchedAt": fetched_at,
        "fetched_at": fetched_at,
        "ageSeconds": age_seconds,
        "stale": stale,
        "source": source,
    }


def _age_seconds_from_iso(value: str) -> int:
    text = str(value or "").strip()
    if not text:
        return 0
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return 0
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return max(0, int(time.time() - parsed.timestamp()))


def _quote_freshness_stats(quotes: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(quotes)
    fresh = 0
    stale = 0
    max_age = 0
    for row in quotes:
        fetched_at = str(row.get("fetchedAt") or row.get("fetched_at") or "")
        age_seconds = _age_seconds_from_iso(fetched_at)
        max_age = max(max_age, age_seconds)
        if age_seconds <= 15 * 60:
            fresh += 1
        else:
            stale += 1
    return {
        "total": total,
        "fresh": fresh,
        "stale": stale,
        "maxAgeSeconds": max_age,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=f"{APP_NAME} backend server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", default=8080, type=int, help="Bind port")
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="SQLite database path")
    return parser.parse_args()


def resolve_db_path(arg_db: str) -> Path:
    db_path = Path(arg_db)
    if db_path == DEFAULT_DB_PATH and not db_path.exists() and LEGACY_DB_PATH.exists():
        return LEGACY_DB_PATH
    return db_path


def main() -> None:
    args = parse_args()
    database = Database(resolve_db_path(args.db))
    quote_service = QuoteService()
    backup_service = BackupService(database=database, project_root=PROJECT_ROOT)
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
        project_root=PROJECT_ROOT,
    )
    AppHandler.context = context
    server = ThreadingHTTPServer((args.host, args.port), AppHandler)
    print(f"{APP_NAME} running at http://{args.host}:{args.port}")
    print(f"Database: {database.db_path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        realtime.stop()
        server.server_close()
        database.close()


if __name__ == "__main__":
    main()

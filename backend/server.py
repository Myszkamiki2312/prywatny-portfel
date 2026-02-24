"""MyFund Solo backend server.

Run:
    python3 -m backend.server --port 8080
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import parse_qs, urlparse

from .database import Database
from .expert_tools import ExpertToolsService
from .importers import BrokerImporter
from .notifications import NotificationService
from .parity_tools import ParityToolsService
from .quotes import QuoteService
from .realtime import RealtimeRunner
from .reports import ReportService
from .state_model import now_iso


PROJECT_ROOT = Path(__file__).resolve().parent.parent


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
    project_root: Path


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
        if method == "GET" and path == "/api/health":
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

        if method == "GET" and path == "/api/state":
            return {"state": self.context.database.get_state()}

        if method == "PUT" and path == "/api/state":
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

        if method == "GET" and path == "/api/quotes":
            tickers = _query_tickers(query)
            return {"quotes": self.context.database.get_quotes(tickers or None)}

        if method == "POST" and path == "/api/quotes/refresh":
            tickers = _payload_tickers(payload)
            if not tickers:
                state = self.context.database.get_state()
                tickers = [asset["ticker"] for asset in state["assets"] if str(asset.get("ticker") or "").strip()]
            quotes = self.context.quote_service.refresh(tickers)
            self.context.database.upsert_quotes(quotes)

            # Mirror latest prices to asset list so frontend state stays in sync.
            if quotes:
                quote_map = {str(row["ticker"]).upper(): row for row in quotes}
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

            return {"quotes": quotes, "requested": len(tickers), "updated": len(quotes)}

        if method == "GET" and path == "/api/reports/catalog":
            return {"reports": self.context.reports.catalog()}

        if method == "POST" and path == "/api/reports/generate":
            report_name = str(payload.get("reportName") or payload.get("report") or "").strip()
            portfolio_id = str(payload.get("portfolioId") or "").strip()
            if not report_name:
                raise ApiError(400, "Missing reportName.")
            report = self.context.reports.generate(report_name=report_name, portfolio_id=portfolio_id)
            return {"report": report}

        if method == "GET" and path == "/api/metrics/portfolio":
            portfolio_id = str(query.get("portfolioId", [""])[0]).strip()
            metrics = self.context.reports.metrics(portfolio_id=portfolio_id)
            return {"metrics": metrics}

        if method == "GET" and path == "/api/tools/scanner":
            filters = {
                "minScore": query.get("minScore", ["0"])[0],
                "maxRisk": query.get("maxRisk", ["10"])[0],
                "sector": query.get("sector", [""])[0],
                "minPrice": query.get("minPrice", ["0"])[0],
                "portfolioId": query.get("portfolioId", [""])[0],
            }
            return self.context.expert_tools.scanner(filters)

        if method == "POST" and path == "/api/tools/scanner":
            return self.context.expert_tools.scanner(payload)

        if method == "GET" and path == "/api/tools/signals":
            portfolio_id = str(query.get("portfolioId", [""])[0]).strip()
            return self.context.expert_tools.signals(portfolio_id=portfolio_id)

        if method == "GET" and path == "/api/tools/calendar":
            portfolio_id = str(query.get("portfolioId", [""])[0]).strip()
            days = _to_int(query.get("days", ["60"])[0], 60)
            return self.context.expert_tools.calendar(days=days, portfolio_id=portfolio_id)

        if method == "GET" and path == "/api/tools/recommendations":
            portfolio_id = str(query.get("portfolioId", [""])[0]).strip()
            return self.context.expert_tools.recommendations(portfolio_id=portfolio_id)

        if method == "GET" and path == "/api/tools/charts/candles":
            ticker = str(query.get("ticker", [""])[0]).strip()
            limit = _to_int(query.get("limit", ["120"])[0], 120)
            return self.context.parity_tools.candles(ticker=ticker, limit=limit)

        if method == "GET" and path == "/api/tools/charts/tradingview":
            ticker = str(query.get("ticker", [""])[0]).strip()
            return self.context.parity_tools.tradingview(ticker=ticker)

        if method == "GET" and path == "/api/tools/catalyst":
            portfolio_id = str(query.get("portfolioId", [""])[0]).strip()
            limit = _to_int(query.get("limit", ["80"])[0], 80)
            return self.context.parity_tools.catalyst_analysis(portfolio_id=portfolio_id, limit=limit)

        if method == "GET" and path == "/api/tools/funds/ranking":
            limit = _to_int(query.get("limit", ["30"])[0], 30)
            return self.context.parity_tools.funds_ranking(limit=limit)

        if method == "GET" and path == "/api/tools/espi":
            limit = _to_int(query.get("limit", ["40"])[0], 40)
            search = str(query.get("query", [""])[0]).strip()
            return self.context.parity_tools.espi_messages(query=search, limit=limit)

        if method == "POST" and path == "/api/tools/tax/optimize":
            return self.context.parity_tools.tax_optimize(payload)

        if method == "POST" and path == "/api/tools/tax/foreign-dividend":
            return self.context.parity_tools.tax_foreign_dividend(payload)

        if method == "POST" and path == "/api/tools/tax/crypto":
            return self.context.parity_tools.tax_crypto(payload)

        if method == "POST" and path == "/api/tools/tax/foreign-interest":
            return self.context.parity_tools.tax_foreign_interest(payload)

        if method == "POST" and path == "/api/tools/tax/bond-interest":
            return self.context.parity_tools.tax_bond_interest(payload)

        if method == "GET" and path == "/api/tools/forum":
            ticker = str(query.get("ticker", [""])[0]).strip()
            limit = _to_int(query.get("limit", ["200"])[0], 200)
            return self.context.parity_tools.list_forum(ticker=ticker, limit=limit)

        if method == "POST" and path == "/api/tools/forum/post":
            try:
                return self.context.parity_tools.add_forum_post(payload)
            except ValueError as error:
                raise ApiError(400, str(error)) from error

        if method == "DELETE" and path.startswith("/api/tools/forum/post/"):
            post_id = path.removeprefix("/api/tools/forum/post/").strip()
            return self.context.parity_tools.delete_forum_post(post_id=post_id)

        if method == "POST" and path == "/api/tools/options/exercise-price":
            return self.context.parity_tools.option_exercise_price(payload)

        if method == "GET" and path == "/api/tools/options/positions":
            refresh = str(query.get("refresh", ["false"])[0]).strip().lower() in {"1", "true", "yes", "on"}
            return self.context.parity_tools.option_positions(refresh_quotes=refresh)

        if method == "POST" and path == "/api/tools/options/positions":
            try:
                return self.context.parity_tools.add_option_position(payload)
            except ValueError as error:
                raise ApiError(400, str(error)) from error

        if method == "DELETE" and path.startswith("/api/tools/options/positions/"):
            position_id = path.removeprefix("/api/tools/options/positions/").strip()
            return self.context.parity_tools.delete_option_position(position_id=position_id)

        if method == "GET" and path == "/api/tools/model-portfolio":
            return {"model": self.context.parity_tools.get_model_portfolio()}

        if method == "PUT" and path == "/api/tools/model-portfolio":
            try:
                return {"model": self.context.parity_tools.set_model_portfolio(payload)}
            except ValueError as error:
                raise ApiError(400, str(error)) from error

        if method == "GET" and path == "/api/tools/model-portfolio/compare":
            portfolio_id = str(query.get("portfolioId", [""])[0]).strip()
            return self.context.parity_tools.compare_model_portfolio(portfolio_id=portfolio_id)

        if method == "GET" and path == "/api/tools/public-portfolios":
            return self.context.parity_tools.list_public_portfolios()

        if method == "POST" and path == "/api/tools/public-portfolios/clone":
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

        if method == "POST" and path == "/api/tools/alerts/run":
            portfolio_id = str(payload.get("portfolioId") or "").strip()
            return self.context.expert_tools.run_alert_workflow(portfolio_id=portfolio_id)

        if method == "POST" and path == "/api/tools/alerts/webhook":
            token = _extract_webhook_token(self.headers, query)
            config = self.context.database.get_realtime_config()
            expected = str(config.get("webhookSecret") or "").strip()
            if expected and token != expected:
                raise ApiError(403, "Invalid webhook token.")
            result = self.context.realtime.run_once(source="webhook")
            return {"ok": True, "result": result}

        if method == "GET" and path == "/api/tools/alerts/history":
            limit = _to_int(query.get("limit", ["100"])[0], 100)
            return self.context.expert_tools.alert_history(limit=limit)

        if method == "GET" and path == "/api/tools/realtime/status":
            return self.context.realtime.status()

        if method == "PUT" and path == "/api/tools/realtime/config":
            saved = self.context.realtime.set_config(payload)
            return {"config": saved, "status": self.context.realtime.status()}

        if method == "POST" and path == "/api/tools/realtime/run":
            result = self.context.realtime.run_once(source="manual")
            return {"result": result, "status": self.context.realtime.status()}

        if method == "POST" and path == "/api/tools/realtime/start":
            config = self.context.database.get_realtime_config()
            config["enabled"] = True
            self.context.database.set_realtime_config(config)
            self.context.realtime.start()
            return self.context.realtime.status()

        if method == "POST" and path == "/api/tools/realtime/stop":
            config = self.context.database.get_realtime_config()
            config["enabled"] = False
            self.context.database.set_realtime_config(config)
            self.context.realtime.stop()
            return self.context.realtime.status()

        if method == "GET" and path == "/api/tools/notifications/config":
            return {"config": self.context.notifications.get_config()}

        if method == "PUT" and path == "/api/tools/notifications/config":
            saved = self.context.notifications.set_config(payload)
            return {"config": saved}

        if method == "POST" and path == "/api/tools/notifications/test":
            return {"result": self.context.notifications.send_test()}

        if method == "GET" and path == "/api/tools/notifications/history":
            limit = _to_int(query.get("limit", ["100"])[0], 100)
            return self.context.notifications.history(limit=limit)

        if method == "GET" and path == "/api/import/brokers":
            return {"brokers": self.context.importer.list_brokers()}

        if method == "GET" and path == "/api/import/logs":
            limit = _to_int(query.get("limit", ["50"])[0], 50)
            return {"logs": self.context.database.list_import_logs(limit=limit)}

        if method == "POST" and path.startswith("/api/import/broker/"):
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

        if method == "GET" and path == "/api/scanner":
            return self.context.expert_tools.scanner({})

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


def _to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _build_scanner_payload(database: Database) -> List[Dict[str, Any]]:
    state = database.get_state()
    quotes = database.get_quotes([asset["ticker"] for asset in state["assets"]])
    quote_map = {str(item["ticker"]).upper(): item for item in quotes}

    items = []
    for asset in state["assets"]:
        ticker = str(asset.get("ticker") or "").upper()
        quote = quote_map.get(ticker)
        price = float(quote["price"]) if quote else float(asset.get("currentPrice") or 0)
        risk = float(asset.get("risk") or 1)
        score = price / max(1.0, risk)
        items.append(
            {
                "ticker": ticker,
                "name": asset.get("name", ""),
                "type": asset.get("type", ""),
                "risk": risk,
                "price": price,
                "currency": quote.get("currency") if quote else asset.get("currency", "PLN"),
                "score": score,
                "sector": asset.get("sector", ""),
                "industry": asset.get("industry", ""),
            }
        )
    items.sort(key=lambda row: row["score"], reverse=True)
    return items


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MyFund Solo backend server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", default=8080, type=int, help="Bind port")
    parser.add_argument("--db", default=str(PROJECT_ROOT / "data" / "myfund_solo.db"), help="SQLite database path")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    database = Database(Path(args.db))
    quote_service = QuoteService()
    expert_tools = ExpertToolsService(database)
    parity_tools = ParityToolsService(database, quote_service)
    notifications = NotificationService(database)
    realtime = RealtimeRunner(
        database=database,
        expert_tools=expert_tools,
        notifications=notifications,
        quote_service=quote_service,
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
        project_root=PROJECT_ROOT,
    )
    AppHandler.context = context
    server = ThreadingHTTPServer((args.host, args.port), AppHandler)
    print(f"MyFund Solo running at http://{args.host}:{args.port}")
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

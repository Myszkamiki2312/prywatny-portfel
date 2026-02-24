import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from backend.database import Database
from backend.importers import BrokerImporter
from backend.reports import ReportService
from backend.server import AppHandler
from backend.state_model import now_iso


class FakeHandler:
    def __init__(self, context):
        self.context = context

    def dispatch(self, method, path, query=None, payload=None):
        return AppHandler._dispatch(self, method, path, query or {}, payload or {})


class StaticQuoteService:
    def __init__(self, rows):
        self.rows_by_ticker = {}
        for item in rows:
            ticker = str(item.get("ticker") or "").upper().strip()
            if not ticker:
                continue
            self.rows_by_ticker[ticker] = dict(item)

    def refresh(self, tickers):
        output = []
        for ticker in tickers:
            key = str(ticker or "").upper().strip()
            row = self.rows_by_ticker.get(key)
            if not row:
                continue
            payload = dict(row)
            payload.setdefault("fetched_at", now_iso())
            payload.setdefault("provider", "test-feed")
            output.append(payload)
        return output


class E2EWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.database = Database(Path(self.tmp.name) / "e2e.db")
        self.quote_service = StaticQuoteService(
            [
                {
                    "ticker": "AAPL",
                    "price": 210.0,
                    "currency": "USD",
                    "provider": "test-feed",
                },
                {
                    "ticker": "CDR",
                    "price": 222.0,
                    "currency": "PLN",
                    "provider": "test-feed",
                },
            ]
        )
        self.handler = FakeHandler(
            SimpleNamespace(
                database=self.database,
                quote_service=self.quote_service,
                importer=BrokerImporter(self.database),
                reports=ReportService(self.database.get_state),
            )
        )

    def tearDown(self):
        self.database.close()
        self.tmp.cleanup()

    def test_e2e_ibkr_import_refresh_and_stats_report(self):
        broker_payload = self.handler.dispatch("GET", "/api/import/brokers")
        broker_ids = [item.get("id") for item in broker_payload.get("brokers", [])]
        self.assertIn("ibkr", broker_ids)
        self.assertIn("bossa", broker_ids)

        csv_text = "\n".join(
            [
                "Date/Time,Symbol,Action,Quantity,T. Price,Proceeds,Comm/Fee,Currency,Description",
                "2026-02-20,AAPL,BUY,2,200.0,-400.0,1.0,USD,Apple Inc",
            ]
        )
        imported = self.handler.dispatch(
            "POST",
            "/api/import/broker/ibkr",
            payload={"csv": csv_text, "fileName": "ibkr.csv"},
        )
        summary = imported.get("import", {})
        self.assertEqual(summary.get("broker"), "ibkr")
        self.assertEqual(summary.get("importedCount"), 1)

        state_before = self.handler.dispatch("GET", "/api/state")["state"]
        portfolio_id = state_before["portfolios"][0]["id"]
        assets_before = [row for row in state_before["assets"] if row.get("ticker") == "AAPL"]
        self.assertEqual(len(assets_before), 1)
        self.assertAlmostEqual(float(assets_before[0].get("currentPrice") or 0.0), 0.0)

        refreshed = self.handler.dispatch(
            "POST",
            "/api/quotes/refresh",
            payload={"tickers": ["AAPL"]},
        )
        self.assertEqual(refreshed.get("requested"), 1)
        self.assertEqual(refreshed.get("resolved"), 1)
        self.assertEqual(refreshed.get("updated"), 1)
        self.assertEqual(refreshed.get("missing"), 0)

        state_after = self.handler.dispatch("GET", "/api/state")["state"]
        assets_after = [row for row in state_after["assets"] if row.get("ticker") == "AAPL"]
        self.assertEqual(len(assets_after), 1)
        self.assertAlmostEqual(float(assets_after[0].get("currentPrice") or 0.0), 210.0)
        self.assertEqual(assets_after[0].get("currency"), "USD")

        report_payload = self.handler.dispatch(
            "POST",
            "/api/reports/generate",
            payload={"reportName": "Statystyki portfela", "portfolioId": portfolio_id},
        )
        report = report_payload["report"]
        self.assertEqual(report["reportName"], "Statystyki portfela")
        self.assertEqual(report["headers"], ["Miara", "Wartość"])
        metric_map = {str(row[0]): row[1] for row in report["rows"] if len(row) >= 2}
        self.assertGreater(float(metric_map.get("Wartość rynkowa", 0.0)), 0.0)

        metrics_payload = self.handler.dispatch(
            "GET",
            "/api/metrics/portfolio",
            query={"portfolioId": [portfolio_id]},
        )
        metrics = metrics_payload["metrics"]
        self.assertEqual(metrics["portfolioId"], portfolio_id)
        self.assertEqual(int(metrics["holdingsCount"]), 1)

    def test_e2e_bossa_import_logs_and_operations_report(self):
        csv_text = "\n".join(
            [
                "Data;Rodzaj;Instrument;Ilosc;Cena;Kwota;Prowizja;Waluta",
                "2026-02-22;Kupno;CDR;1;220;220;1;PLN",
            ]
        )
        imported = self.handler.dispatch(
            "POST",
            "/api/import/broker/bossa",
            payload={"csv": csv_text, "fileName": "bossa.csv"},
        )
        summary = imported.get("import", {})
        self.assertEqual(summary.get("broker"), "bossa")
        self.assertEqual(summary.get("importedCount"), 1)

        logs_payload = self.handler.dispatch("GET", "/api/import/logs", query={"limit": ["5"]})
        logs = logs_payload.get("logs", [])
        self.assertGreaterEqual(len(logs), 1)
        self.assertEqual(logs[0].get("broker"), "bossa")
        self.assertEqual(int(logs[0].get("importedCount") or 0), 1)

        state_payload = self.handler.dispatch("GET", "/api/state")
        portfolio_id = state_payload["state"]["portfolios"][0]["id"]
        report_payload = self.handler.dispatch(
            "POST",
            "/api/reports/generate",
            payload={"reportName": "Historia operacji", "portfolioId": portfolio_id},
        )
        report = report_payload["report"]
        self.assertEqual(report["headers"], ["Data", "Typ", "Walor", "Ilość", "Cena", "Kwota", "Prowizja", "Waluta"])
        self.assertEqual(len(report["rows"]), 1)
        self.assertEqual(report["rows"][0][1], "Kupno waloru")
        self.assertIn("CDR", str(report["rows"][0][2]))


if __name__ == "__main__":
    unittest.main()

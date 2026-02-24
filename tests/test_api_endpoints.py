import unittest
from copy import deepcopy
from types import SimpleNamespace

from backend.parity_tools import ParityToolsService
from backend.reports import ReportService
from backend.server import ApiError, AppHandler


def build_state():
    return {
        "meta": {
            "activePlan": "Expert",
            "baseCurrency": "PLN",
            "createdAt": "2026-01-01T00:00:00+00:00",
        },
        "portfolios": [
            {
                "id": "ptf_1",
                "name": "Glowny",
                "currency": "PLN",
                "benchmark": "WIG20",
                "goal": "",
                "parentId": "",
                "twinOf": "",
                "groupName": "",
                "isPublic": False,
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
        ],
        "accounts": [
            {
                "id": "acc_1",
                "name": "Konto podstawowe",
                "type": "Broker",
                "currency": "PLN",
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
        ],
        "assets": [
            {
                "id": "ast_1",
                "ticker": "CDR",
                "name": "CD Projekt",
                "type": "Akcja",
                "currency": "PLN",
                "currentPrice": 120.0,
                "risk": 5.0,
                "sector": "Gry",
                "industry": "",
                "tags": [],
                "benchmark": "WIG20",
                "createdAt": "2026-01-01T00:00:00+00:00",
            }
        ],
        "operations": [
            {
                "id": "op_1",
                "date": "2026-01-02",
                "type": "Operacja gotowkowa",
                "portfolioId": "ptf_1",
                "accountId": "acc_1",
                "assetId": "",
                "targetAssetId": "",
                "quantity": 0.0,
                "targetQuantity": 0.0,
                "price": 0.0,
                "amount": 1000.0,
                "fee": 0.0,
                "currency": "PLN",
                "tags": [],
                "note": "",
                "createdAt": "2026-01-02T10:00:00+00:00",
            },
            {
                "id": "op_2",
                "date": "2026-01-03",
                "type": "Kupno waloru",
                "portfolioId": "ptf_1",
                "accountId": "acc_1",
                "assetId": "ast_1",
                "targetAssetId": "",
                "quantity": 2.0,
                "targetQuantity": 0.0,
                "price": 100.0,
                "amount": 200.0,
                "fee": 2.0,
                "currency": "PLN",
                "tags": [],
                "note": "",
                "createdAt": "2026-01-03T10:00:00+00:00",
            },
        ],
        "recurringOps": [],
        "liabilities": [],
        "alerts": [],
        "notes": [],
        "strategies": [],
        "favorites": [],
    }


class FakeHandler:
    def __init__(self, context):
        self.context = context

    def dispatch(self, method, path, query=None, payload=None):
        return AppHandler._dispatch(self, method, path, query or {}, payload or {})


class QuoteDbMock:
    def __init__(self, *, state, quotes):
        self.state = deepcopy(state)
        self.quotes = [dict(item) for item in quotes]
        self.upserted = []

    def get_state(self):
        return deepcopy(self.state)

    def replace_state(self, new_state):
        self.state = deepcopy(new_state)
        return self.state

    def get_quotes(self, tickers=None):
        rows = [dict(item) for item in self.quotes]
        if not tickers:
            return rows
        wanted = {str(item).upper() for item in tickers}
        return [row for row in rows if str(row.get("ticker") or "").upper() in wanted]

    def upsert_quotes(self, quotes):
        self.upserted.extend([dict(item) for item in quotes])


class QuoteServiceMock:
    def __init__(self, response):
        self.response = [dict(item) for item in response]

    def refresh(self, tickers):  # noqa: ARG002
        return [dict(item) for item in self.response]


class ApiEndpointTests(unittest.TestCase):
    def setUp(self):
        self.state = build_state()
        self.handler = FakeHandler(
            SimpleNamespace(
                reports=ReportService(lambda: self.state),
                parity_tools=ParityToolsService(database=object(), quote_service=object()),
            )
        )

    def test_reports_catalog_endpoint(self):
        response = self.handler.dispatch("GET", "/api/reports/catalog")
        self.assertIn("reports", response)
        names = [item.get("name") for item in response["reports"]]
        self.assertIn("Statystyki portfela", names)

    def test_reports_generate_endpoint(self):
        response = self.handler.dispatch(
            "POST",
            "/api/reports/generate",
            payload={"reportName": "Statystyki portfela", "portfolioId": "ptf_1"},
        )
        report = response["report"]
        self.assertEqual(report["reportName"], "Statystyki portfela")
        self.assertEqual(report["headers"], ["Miara", "Wartość"])
        self.assertTrue(len(report["rows"]) >= 4)
        self.assertIn("Portfel: Glowny", report["info"])

    def test_reports_generate_requires_report_name(self):
        with self.assertRaises(ApiError) as ctx:
            self.handler.dispatch("POST", "/api/reports/generate", payload={})
        self.assertEqual(ctx.exception.status, 400)
        self.assertIn("Missing reportName", ctx.exception.message)

    def test_tax_optimize_endpoint(self):
        response = self.handler.dispatch(
            "POST",
            "/api/tools/tax/optimize",
            payload={
                "realizedGain": 1000.0,
                "realizedLoss": 100.0,
                "dividends": 50.0,
                "costs": 50.0,
                "taxRatePct": 19.0,
                "unrealizedPositions": [
                    {"ticker": "AAA", "unrealizedPL": -400.0},
                    {"ticker": "CCC", "unrealizedPL": -700.0},
                ],
            },
        )
        self.assertAlmostEqual(response["taxableBaseBefore"], 900.0)
        self.assertAlmostEqual(response["taxSaved"], 171.0)
        self.assertEqual(response["actions"][0]["ticker"], "CCC")

    def test_tax_foreign_dividend_endpoint(self):
        response = self.handler.dispatch(
            "POST",
            "/api/tools/tax/foreign-dividend",
            payload={
                "grossDividend": 100.0,
                "foreignWithholdingPct": 30.0,
                "localTaxPct": 19.0,
                "treatyCreditCapPct": 15.0,
            },
        )
        self.assertAlmostEqual(response["netDividendAfterTax"], 66.0)

    def test_tax_crypto_endpoint(self):
        response = self.handler.dispatch(
            "POST",
            "/api/tools/tax/crypto",
            payload={
                "proceeds": 1200.0,
                "acquisitionCost": 500.0,
                "transactionCosts": 50.0,
                "carryForwardLoss": 100.0,
                "taxRatePct": 19.0,
            },
        )
        self.assertAlmostEqual(response["taxableBase"], 550.0)
        self.assertAlmostEqual(response["taxDue"], 104.5)

    def test_tax_foreign_interest_endpoint(self):
        response = self.handler.dispatch(
            "POST",
            "/api/tools/tax/foreign-interest",
            payload={
                "grossInterest": 100.0,
                "foreignWithholdingPct": 10.0,
                "localTaxPct": 19.0,
                "treatyCreditCapPct": 15.0,
            },
        )
        self.assertAlmostEqual(response["localTaxDue"], 9.0)
        self.assertAlmostEqual(response["netInterestAfterTax"], 81.0)

    def test_tax_bond_interest_endpoint(self):
        response = self.handler.dispatch(
            "POST",
            "/api/tools/tax/bond-interest",
            payload={
                "couponInterest": 100.0,
                "discountGain": 10.0,
                "costs": 5.0,
                "taxRatePct": 19.0,
            },
        )
        self.assertAlmostEqual(response["taxableBase"], 105.0)
        self.assertAlmostEqual(response["taxDue"], 19.95)


if __name__ == "__main__":
    unittest.main()


class QuoteEndpointTests(unittest.TestCase):
    def setUp(self):
        self.state = build_state()
        self.database = QuoteDbMock(
            state=self.state,
            quotes=[
                {
                    "ticker": "CDR",
                    "price": 150.0,
                    "currency": "PLN",
                    "provider": "db-seed",
                    "fetchedAt": "2000-01-01T00:00:00+00:00",
                }
            ],
        )
        self.handler = FakeHandler(
            SimpleNamespace(
                database=self.database,
                quote_service=QuoteServiceMock(response=[]),
            )
        )

    def test_quotes_refresh_uses_db_fallback_when_provider_returns_nothing(self):
        response = self.handler.dispatch(
            "POST",
            "/api/quotes/refresh",
            payload={"tickers": ["CDR"]},
        )

        self.assertEqual(response["requested"], 1)
        self.assertEqual(response["resolved"], 1)
        self.assertEqual(response["updated"], 0)
        self.assertEqual(response["fallbackUsed"], 1)
        self.assertEqual(response["missing"], 0)
        self.assertEqual(len(response["quotes"]), 1)
        self.assertEqual(response["quotes"][0]["ticker"], "CDR")
        self.assertEqual(response["quotes"][0]["source"], "db-cache")
        self.assertEqual(response["quotes"][0]["stale"], True)
        self.assertEqual(len(self.database.upserted), 0)

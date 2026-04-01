import unittest

from backend.reports import ReportService, _densify_daily_series


class ReportMathTests(unittest.TestCase):
    def setUp(self):
        self.service = ReportService(lambda: {})
        self.series = [
            {"date": "2026-01-01", "netWorth": 100.0},
            {"date": "2026-01-02", "netWorth": 110.0},
            {"date": "2026-01-03", "netWorth": 99.0},
            {"date": "2026-01-04", "netWorth": 120.0},
        ]

    def test_period_returns(self):
        rows = self.service._period_returns(self.series, value_key="netWorth")
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]["date"], "2026-01-02")
        self.assertAlmostEqual(rows[0]["value"], 10.0)
        self.assertAlmostEqual(rows[1]["value"], -10.0)
        self.assertAlmostEqual(rows[2]["value"], 21.2121212121, places=6)

    def test_rolling_returns_with_window_two(self):
        rows = self.service._rolling_returns(self.series, 2, value_key="netWorth")
        self.assertEqual(len(rows), 4)
        self.assertAlmostEqual(rows[0]["value"], 0.0)
        self.assertAlmostEqual(rows[1]["value"], 0.0)
        self.assertAlmostEqual(rows[2]["value"], -1.0)
        self.assertAlmostEqual(rows[3]["value"], 9.0909090909, places=6)

    def test_drawdown(self):
        rows = self.service._drawdown(self.series, value_key="netWorth")
        self.assertEqual(len(rows), 4)
        self.assertAlmostEqual(rows[0]["value"], 0.0)
        self.assertAlmostEqual(rows[1]["value"], 0.0)
        self.assertAlmostEqual(rows[2]["value"], -10.0)
        self.assertAlmostEqual(rows[3]["value"], 0.0)

    def test_densify_daily_series_fills_missing_days(self):
        rows = _densify_daily_series(
            [
                {"date": "2026-01-01", "netWorth": 100.0},
                {"date": "2026-01-03", "netWorth": 120.0},
            ]
        )

        self.assertEqual(
            rows,
            [
                {"date": "2026-01-01", "netWorth": 100.0},
                {"date": "2026-01-02", "netWorth": 100.0},
                {"date": "2026-01-03", "netWorth": 120.0},
            ],
        )

    def test_metrics_history_builds_daily_series_and_summary(self):
        state = {
            "meta": {"baseCurrency": "PLN", "fxRates": {}},
            "portfolios": [{"id": "ptf_1", "name": "Glowny", "benchmark": ""}],
            "accounts": [{"id": "acc_1", "name": "Konto", "currency": "PLN"}],
            "assets": [
                {
                    "id": "ast_1",
                    "ticker": "AAA",
                    "name": "Asset",
                    "type": "Akcja",
                    "currency": "PLN",
                    "currentPrice": 120.0,
                    "risk": 5.0,
                    "sector": "",
                    "industry": "",
                    "tags": [],
                    "benchmark": "",
                }
            ],
            "operations": [
                {
                    "id": "op_1",
                    "date": "2026-01-01",
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
                    "createdAt": "2026-01-01T10:00:00+00:00",
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
                    "fee": 0.0,
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
        service = ReportService(
            lambda: state,
            benchmark_history_provider=lambda ticker, _limit: [
                {"date": "2026-01-03", "close": 100.0},
                {"date": "2026-01-04", "close": 110.0},
                {"date": "2026-01-05", "close": 120.0},
            ]
            if ticker == "AAA"
            else [],
        )

        history = service.metrics_history(portfolio_id="ptf_1")

        self.assertGreaterEqual(len(history["series"]), 5)
        self.assertEqual(history["series"][0]["date"], "2026-01-01")
        self.assertEqual(history["series"][1]["date"], "2026-01-02")
        self.assertEqual(history["summary"]["daily"]["toDate"], history["series"][-1]["date"])


if __name__ == "__main__":
    unittest.main()

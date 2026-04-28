import unittest

from backend.reports import ReportService


class ReportBenchmarkFeedTests(unittest.TestCase):
    def test_report_uses_market_benchmark_when_history_available(self):
        service = ReportService(
            lambda: {},
            benchmark_history_provider=lambda _ticker, _limit: [
                {"date": "2026-01-01", "close": 100.0},
                {"date": "2026-01-02", "close": 110.0},
                {"date": "2026-01-03", "close": 99.0},
            ],
        )
        state = {"portfolios": [{"id": "ptf_1", "benchmark": "WIG20"}]}
        series = [
            {"date": "2026-01-01", "netWorth": 100.0},
            {"date": "2026-01-02", "netWorth": 110.0},
            {"date": "2026-01-03", "netWorth": 121.0},
        ]

        report = service._report_return_and_benchmark(
            "Stopa zwrotu w czasie i benchmark",
            "Info",
            state,
            "ptf_1",
            series,
        )

        self.assertIn("(market-data)", report["info"])
        self.assertEqual(report["rows"][0], ["2026-01-02", 10.0, 10.0])
        self.assertEqual(report["rows"][1], ["2026-01-03", 10.0, -10.0])

    def test_report_falls_back_to_proxy_when_history_missing(self):
        service = ReportService(
            lambda: {},
            benchmark_history_provider=lambda _ticker, _limit: [],
        )
        state = {"portfolios": [{"id": "ptf_1", "benchmark": "WIG20"}]}
        series = [
            {"date": "2026-01-01", "netWorth": 100.0},
            {"date": "2026-01-02", "netWorth": 104.0},
        ]

        report = service._report_return_and_benchmark(
            "Stopa zwrotu w czasie i benchmark",
            "Info",
            state,
            "ptf_1",
            series,
        )

        self.assertIn("(proxy)", report["info"])
        self.assertEqual(report["rows"][0], ["2026-01-02", 4.0, 3.0])


if __name__ == "__main__":
    unittest.main()

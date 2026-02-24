import unittest

from backend.reports import ReportService


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


if __name__ == "__main__":
    unittest.main()

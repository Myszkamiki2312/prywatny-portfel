import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from backend.database import Database
from backend.state_model import normalize_state


class AppearanceMetaTests(unittest.TestCase):
    def test_normalize_state_keeps_appearance_meta(self):
        normalized = normalize_state(
            {
                "meta": {
                    "activePlan": "Expert",
                    "baseCurrency": "PLN",
                    "createdAt": "2026-01-01T00:00:00+00:00",
                    "theme": "midnight",
                    "lastLightTheme": "gold",
                    "iconSet": "market",
                    "fontScale": "large",
                    "dashboardInflationEnabled": True,
                    "dashboardInflationRatePct": "7.5",
                }
            }
        )

        self.assertEqual(normalized["meta"]["theme"], "midnight")
        self.assertEqual(normalized["meta"]["lastLightTheme"], "gold")
        self.assertEqual(normalized["meta"]["iconSet"], "market")
        self.assertEqual(normalized["meta"]["fontScale"], "large")
        self.assertEqual(normalized["meta"]["dashboardInflationEnabled"], True)
        self.assertEqual(normalized["meta"]["dashboardInflationRatePct"], 7.5)

    def test_database_roundtrip_preserves_appearance_meta(self):
        with TemporaryDirectory() as tmp_dir:
            database = Database(Path(tmp_dir) / "appearance.db")
            try:
                state = database.get_state()
                state["meta"]["theme"] = "gold"
                state["meta"]["lastLightTheme"] = "gold"
                state["meta"]["iconSet"] = "minimal"
                state["meta"]["fontScale"] = "compact"
                state["meta"]["dashboardInflationEnabled"] = True
                state["meta"]["dashboardInflationRatePct"] = 6.2
                database.replace_state(state)

                first = database.get_state()
                self.assertEqual(first["meta"]["theme"], "gold")
                self.assertEqual(first["meta"]["lastLightTheme"], "gold")
                self.assertEqual(first["meta"]["iconSet"], "minimal")
                self.assertEqual(first["meta"]["fontScale"], "compact")
                self.assertEqual(first["meta"]["dashboardInflationEnabled"], True)
                self.assertEqual(first["meta"]["dashboardInflationRatePct"], 6.2)

                first["meta"]["theme"] = "ice"
                first["meta"]["lastLightTheme"] = "ice"
                first["meta"]["iconSet"] = "classic"
                first["meta"]["fontScale"] = "large"
                first["meta"]["dashboardInflationEnabled"] = False
                first["meta"]["dashboardInflationRatePct"] = 3.5
                database.replace_state(first)

                second = database.get_state()
                self.assertEqual(second["meta"]["theme"], "ice")
                self.assertEqual(second["meta"]["lastLightTheme"], "ice")
                self.assertEqual(second["meta"]["iconSet"], "classic")
                self.assertEqual(second["meta"]["fontScale"], "large")
                self.assertEqual(second["meta"]["dashboardInflationEnabled"], False)
                self.assertEqual(second["meta"]["dashboardInflationRatePct"], 3.5)
            finally:
                database.close()

"""Python half of the shared tax contract.

The same calculations exist independently in Kotlin (OfflineRepository.kt) for the offline phone
app. Nothing compared the two, and they had drifted in eight places by the time this file was
written. tests/fixtures/tax-spec.json is the single set of cases both sides must satisfy; this
test pins the Python side, which the fixture treats as the reference.
"""

import json
import unittest
from pathlib import Path

from backend.parity_tools import ParityToolsService

SPEC_PATH = Path(__file__).resolve().parent / "fixtures" / "tax-spec.json"


def load_spec():
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


class TaxSpecTests(unittest.TestCase):
    def setUp(self):
        self.spec = load_spec()
        self.tolerance = self.spec.get("tolerance", 0.01)
        self.service = ParityToolsService(database=object(), quote_service=object())

    def call(self, fn_name, payload):
        fn = getattr(self.service, fn_name, None)
        self.assertIsNotNone(fn, f"backend/parity_tools.py has no {fn_name}")
        return fn(payload)

    def test_spec_has_cases(self):
        self.assertTrue(self.spec["cases"], "The shared tax spec is empty.")

    def test_every_case_matches_the_reference(self):
        for case in self.spec["cases"]:
            with self.subTest(case=case["id"]):
                result = self.call(case["fn"], case["input"])
                for field, expected in case["expect"].items():
                    self.assertIn(field, result, f"{case['fn']} returned no {field}")
                    actual = result[field]
                    if isinstance(expected, str):
                        self.assertEqual(actual, expected, f"{case['id']}: {field} — {case['why']}")
                    else:
                        self.assertAlmostEqual(
                            float(actual),
                            float(expected),
                            delta=self.tolerance,
                            msg=f"{case['id']}: {field} — {case['why']}",
                        )

    def test_harvesting_actions_match_where_the_spec_states_them(self):
        for case in self.spec["cases"]:
            if "expectActions" not in case:
                continue
            with self.subTest(case=case["id"]):
                actions = self.call(case["fn"], case["input"]).get("actions")
                self.assertIsInstance(actions, list)
                self.assertEqual(
                    len(actions),
                    len(case["expectActions"]),
                    f"{case['id']}: wrong number of harvesting actions",
                )
                for index, expected in enumerate(case["expectActions"]):
                    actual = actions[index]
                    self.assertEqual(
                        actual.get("ticker"),
                        expected["ticker"],
                        f"{case['id']}: action {index} is for the wrong position — order matters, "
                        "the largest loss is harvested first",
                    )
                    self.assertAlmostEqual(
                        float(actual.get("suggestedHarvestLoss")),
                        float(expected["suggestedHarvestLoss"]),
                        delta=self.tolerance,
                    )

    def test_every_documented_divergence_names_the_other_implementation(self):
        """A divergence note is what tells the next reader why a case exists. Keep them honest."""
        for case in self.spec["cases"]:
            note = case.get("divergence")
            if note is None:
                continue
            with self.subTest(case=case["id"]):
                self.assertIn(
                    "Kotlin",
                    note,
                    f"{case['id']}: a divergence note must say which implementation disagrees",
                )


if __name__ == "__main__":
    unittest.main()

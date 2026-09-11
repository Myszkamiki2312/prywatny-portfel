"""Python half of the shared currency-conversion contract.

The same fixture drives frontend_tests/fx-spec.test.js and the Kotlin FxSpecTest. Conversion is
implemented three times — web, server, phone — and the phone had simply omitted it, reporting a
net worth that summed mixed currencies as raw numbers.
"""

import json
import unittest
from pathlib import Path

from backend.utils import (
    convert_currency,
    find_currency_conversion_rate,
    normalize_fx_rates,
)

SPEC_PATH = Path(__file__).resolve().parent / "fixtures" / "fx-spec.json"


def load_spec():
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


def rates_for(case, spec):
    if "ratesJson" in case:
        return case["ratesJson"]
    return case.get("rates", spec["rates"])


class FxSpecTests(unittest.TestCase):
    def setUp(self):
        self.spec = load_spec()
        self.tolerance = self.spec.get("tolerance", 1e-6)

    def applicable(self):
        for case in self.spec["cases"]:
            if "python" in case.get("appliesTo", ["python", "js", "kotlin"]):
                yield case

    def test_spec_has_cases(self):
        self.assertTrue(list(self.applicable()), "The shared FX spec is empty.")

    def test_conversion_rates_match_the_spec(self):
        for case in self.applicable():
            with self.subTest(case=case["id"]):
                actual = find_currency_conversion_rate(
                    case["from"], case["to"], rates_for(case, self.spec)
                )
                self.assertAlmostEqual(
                    actual,
                    case["expectRate"],
                    delta=self.tolerance,
                    msg=f"{case['id']}: {case['why']}",
                )

    def test_converted_amounts_match_the_spec(self):
        for case in self.applicable():
            with self.subTest(case=case["id"]):
                actual = convert_currency(
                    case["amount"], case["from"], case["to"], rates_for(case, self.spec)
                )
                self.assertAlmostEqual(
                    actual,
                    case["expectConverted"],
                    delta=self.tolerance,
                    msg=f"{case['id']}: {case['why']}",
                )

    def test_a_missing_rate_never_zeroes_a_holding(self):
        """The costliest failure mode: silently valuing an asset at nothing."""
        for case in self.applicable():
            if case["expectRate"] != 0.0:
                continue
            with self.subTest(case=case["id"]):
                self.assertEqual(
                    convert_currency(
                        case["amount"], case["from"], case["to"], rates_for(case, self.spec)
                    ),
                    case["amount"],
                    "An unusable rate must leave the amount untouched, not zero it.",
                )

    def test_corrupt_rate_payloads_are_dropped(self):
        for payload in ({"USD/PLN": -1}, "not-json", None, ["list"], {"NOTAPAIR": 4.0}):
            with self.subTest(payload=str(payload)):
                self.assertEqual(normalize_fx_rates(payload), {})


if __name__ == "__main__":
    unittest.main()

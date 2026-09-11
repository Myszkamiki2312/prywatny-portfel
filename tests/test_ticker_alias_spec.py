"""Python half of the shared ticker-resolution contract.

The same fixture drives frontend_tests/ticker-alias-spec.test.js. Quotes are this repo's largest
bug cluster, and the recurring shape was a symbol fixed on one resolution path while the other
kept its old behaviour. Asserting both sides against one file is what stops that.
"""

import json
import unittest
from pathlib import Path

from backend.quotes import _stooq_candidates, _yahoo_quote_candidates

SPEC_PATH = Path(__file__).resolve().parent / "fixtures" / "ticker-alias-spec.json"

# Mirrors QuoteService._YAHOO_SUFFIXES / _SUFFIX_FOR_CURRENCY.
SUFFIXES = (".WA", ".DE", ".L", ".PA", ".MI", ".MC", ".AS", ".SW", ".US")
SUFFIX_BY_CURRENCY = {"PLN": ".WA", "EUR": ".DE", "GBP": ".L", "GBX": ".L", "CHF": ".SW"}


def load_spec():
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))["cases"]


def resolved_symbols(symbol, currency):
    """Every provider symbol the backend would try, upper-cased for comparison."""
    candidates = _yahoo_quote_candidates(symbol, currency, SUFFIXES, SUFFIX_BY_CURRENCY)
    candidates += _stooq_candidates(symbol)
    return {str(candidate).upper() for candidate in candidates}


class TickerAliasSpecTests(unittest.TestCase):
    def test_spec_is_not_empty(self):
        self.assertTrue(load_spec(), "The shared spec has no cases.")

    def test_backend_resolves_every_shared_case(self):
        for case in load_spec():
            symbol = case["symbol"]
            resolved = resolved_symbols(symbol, case.get("currency"))
            for expected in case["mustInclude"]:
                with self.subTest(symbol=symbol, expected=expected):
                    self.assertIn(
                        expected.upper(),
                        resolved,
                        f"{symbol} must resolve to {expected} — {case['why']}",
                    )

    def test_alias_table_entries_are_covered_by_the_spec(self):
        """A new alias without a spec case would drift between the two implementations."""
        from backend.quotes import _TICKER_ALIAS_ROOTS

        covered = {str(case["symbol"]).upper() for case in load_spec()}
        for alias in _TICKER_ALIAS_ROOTS:
            with self.subTest(alias=alias):
                self.assertIn(
                    alias,
                    covered,
                    f"{alias} is aliased in backend/quotes.py but absent from the shared spec, "
                    "so nothing checks the frontend agrees.",
                )


if __name__ == "__main__":
    unittest.main()

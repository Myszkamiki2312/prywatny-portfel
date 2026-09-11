import unittest
import urllib.request

from backend.quotes import (
    QuoteService,
    _guess_currency_from_ticker,
    _stooq_candidates,
    _stooq_history_candidates,
    _yahoo_quote_candidates,
    now_iso,
)


class StubQuoteService(QuoteService):
    def __init__(self):
        super().__init__(
            quote_cache_ttl_seconds=300,
            history_cache_ttl_seconds=300,
            stale_fallback_max_age_seconds=10**10,
            max_retry_attempts=0,
            retry_backoff_seconds=0,
        )
        self.yahoo_calls = 0
        self.stooq_calls = 0
        self.history_calls = 0
        self.yahoo_responses = []
        self.stooq_responses = []
        self.history_response = []
        self.stooq_hints = {}

    def _fetch_yahoo(self, tickers, currency_hints=None):  # noqa: ARG002
        self.yahoo_calls += 1
        if self.yahoo_responses:
            return [dict(item) for item in self.yahoo_responses.pop(0)]
        return []

    def _fetch_stooq(self, tickers, currency_hints=None):  # noqa: ARG002
        self.stooq_calls += 1
        self.stooq_hints = dict(currency_hints or {})
        if self.stooq_responses:
            return [dict(item) for item in self.stooq_responses.pop(0)]
        return []

    def _fetch_stooq_history(self, ticker):  # noqa: ARG002
        self.history_calls += 1
        return [dict(item) for item in self.history_response]


class RetryQuoteService(QuoteService):
    def __init__(self):
        super().__init__(max_retry_attempts=2, retry_backoff_seconds=0)
        self.calls = 0

    def _urlopen_once(self, request, *, verify_ssl):  # noqa: ARG002
        self.calls += 1
        if self.calls == 1:
            raise TimeoutError("temporary timeout")
        return b"ok"


class YahooCandidateQuoteService(QuoteService):
    def __init__(self):
        super().__init__()
        self.candidates = []

    def _yahoo_chart_meta(self, symbol):
        self.candidates.append(symbol)
        if symbol == "CDR.WA":
            return {"regularMarketPrice": 224.1, "currency": "PLN"}
        return None


class StooqCsvQuoteService(QuoteService):
    """Serves one canned Stooq CSV row, so currency labelling is testable without the network."""

    def __init__(self):
        super().__init__(max_retry_attempts=0, retry_backoff_seconds=0)
        self.requested = []

    def _urlopen_bytes(self, request):
        self.requested.append(request.full_url)
        return (
            b"Symbol,Date,Time,Open,High,Low,Close,Volume\n"
            b"DNP,2026-09-11,17:00:00,100,101,99,100.5,1000\n"
        )


class StooqCurrencyTests(unittest.TestCase):
    """Stooq is a Polish service: a suffix-less symbol resolves against GPW, but the symbol-based
    guess defaults it to USD. The caller's hint has to win, or PLN holdings get priced in dollars."""

    def test_refresh_passes_currency_hints_to_the_stooq_fallback(self):
        service = StubQuoteService()
        service.yahoo_responses = [[]]  # Yahoo resolves nothing, so Stooq is asked next

        service.refresh(["DNP"], {"DNP": "PLN"})

        self.assertEqual(service.stooq_calls, 1)
        self.assertEqual(
            service.stooq_hints.get("DNP"),
            "PLN",
            "The hint reached Yahoo but was dropped on the Stooq path.",
        )

    def test_stooq_quote_prefers_the_caller_hint_over_guessing(self):
        service = StooqCsvQuoteService()

        row = service._fetch_single_stooq("DNP", "PLN")

        self.assertIsNotNone(row)
        self.assertEqual(row["price"], 100.5)
        self.assertEqual(row["currency"], "PLN")

    def test_stooq_quote_without_a_hint_still_guesses_from_the_symbol(self):
        service = StooqCsvQuoteService()

        row = service._fetch_single_stooq("DNP")

        self.assertEqual(row["currency"], "USD", "Unhinted behaviour must stay as it was.")

    def test_suffixed_symbol_keeps_its_own_currency_without_a_hint(self):
        service = StooqCsvQuoteService()

        self.assertEqual(service._fetch_single_stooq("CDR.PL")["currency"], "PLN")


class TickerResolutionSpecTests(unittest.TestCase):
    """Pins the symbol -> provider-symbol spec. It lived only in the implementations, so each
    reported symbol was fixed on one provider path and left broken on the other."""

    SUFFIXES = (".WA", ".DE", ".L", ".PA", ".MI", ".MC", ".AS", ".SW", ".US")
    SUFFIX_BY_CURRENCY = {"PLN": ".WA", "EUR": ".DE", "GBP": ".L", "GBX": ".L", "CHF": ".SW"}

    def yahoo(self, symbol, hint=None):
        return _yahoo_quote_candidates(symbol, hint, self.SUFFIXES, self.SUFFIX_BY_CURRENCY)

    def test_alias_expands_on_both_provider_paths(self):
        # One shared table, each provider spelling Warsaw its own way.
        self.assertEqual(self.yahoo("ORLEN", "PLN")[:2], ["PKN.WA", "PKN"])
        self.assertEqual(_stooq_candidates("ORLEN")[:3], ["orlen", "pkn.pl", "pkn"])

    def test_currency_hint_orders_the_exchange_before_the_bare_symbol(self):
        for symbol, hint, expected in (
            ("DNP", "PLN", ["DNP.WA", "DNP"]),
            ("SAP", "EUR", ["SAP.DE", "SAP"]),
            ("SHEL", "GBP", ["SHEL.L", "SHEL"]),
            ("NESN", "CHF", ["NESN.SW", "NESN"]),
        ):
            with self.subTest(symbol=symbol):
                self.assertEqual(self.yahoo(symbol, hint)[:2], expected)

    def test_unhinted_symbol_tries_itself_first(self):
        self.assertEqual(self.yahoo("AAPL")[0], "AAPL")

    def test_multi_dot_symbols_keep_their_class_marker(self):
        # rsplit, not split: BRK.B on Warsaw is "brk.b", never "brk".
        self.assertIn("brk.b", _stooq_candidates("BRK.B.PL"))
        self.assertNotIn("brk", _stooq_candidates("BRK.B.PL"))
        self.assertIn("brk.b", _stooq_history_candidates("BRK.B.PL"))
        self.assertNotIn("brk", _stooq_history_candidates("BRK.B.PL"))

    def test_currency_guess_covers_every_supported_exchange_suffix(self):
        for suffix, expected in (
            (".PL", "PLN"), (".WA", "PLN"), (".DE", "EUR"), (".PA", "EUR"), (".MI", "EUR"),
            (".MC", "EUR"), (".AS", "EUR"), (".L", "GBP"), (".SW", "CHF"), (".US", "USD"),
        ):
            with self.subTest(suffix=suffix):
                self.assertEqual(_guess_currency_from_ticker(f"XYZ{suffix}"), expected)


class QuoteQualityTests(unittest.TestCase):
    def test_refresh_uses_fresh_memory_cache_before_requery(self):
        service = StubQuoteService()
        service.yahoo_responses = [
            [
                {
                    "ticker": "AAPL",
                    "price": 100.0,
                    "currency": "USD",
                    "provider": "yahoo",
                    "fetched_at": now_iso(),
                }
            ]
        ]

        first = service.refresh(["AAPL"])
        second = service.refresh(["AAPL"])

        self.assertEqual(len(first), 1)
        self.assertEqual(len(second), 1)
        self.assertEqual(service.yahoo_calls, 1)
        self.assertEqual(second[0]["source"], "memory-cache")
        self.assertEqual(second[0]["stale"], False)

    def test_refresh_falls_back_to_stale_memory_cache(self):
        service = StubQuoteService()
        service._set_quote_cache(
            {
                "ticker": "AAPL",
                "price": 99.0,
                "currency": "USD",
                "provider": "yahoo",
                "fetched_at": "2000-01-01T00:00:00+00:00",
            }
        )

        quotes = service.refresh(["AAPL"])

        self.assertEqual(len(quotes), 1)
        self.assertEqual(quotes[0]["ticker"], "AAPL")
        self.assertEqual(quotes[0]["source"], "memory-cache-stale")
        self.assertEqual(quotes[0]["stale"], True)

    def test_history_fetch_uses_ttl_cache(self):
        service = StubQuoteService()
        service.history_response = [
            {"date": "2026-02-20", "close": 100.0},
            {"date": "2026-02-21", "close": 101.0},
            {"date": "2026-02-22", "close": 102.0},
        ]

        first = service.fetch_daily_history("WIG20", limit=2)
        second = service.fetch_daily_history("WIG20", limit=2)

        self.assertEqual(service.history_calls, 1)
        self.assertEqual(first, second)
        self.assertEqual(first, [{"date": "2026-02-21", "close": 101.0}, {"date": "2026-02-22", "close": 102.0}])

    def test_fx_history_candidates_use_stooq_pair_symbol(self):
        self.assertEqual(_stooq_history_candidates("FX:USD/PLN"), ["usdpln"])
        self.assertEqual(_stooq_history_candidates("USD/PLN"), ["usdpln"])

    def test_polish_xtb_suffix_uses_stooq_root_candidate(self):
        self.assertEqual(_stooq_candidates("CDR.PL")[:2], ["cdr.pl", "cdr"])
        self.assertEqual(_stooq_candidates("KGH.WA")[:2], ["kgh.wa", "kgh"])

    def test_yahoo_quote_for_polish_pl_suffix_falls_back_to_warsaw_suffix(self):
        service = YahooCandidateQuoteService()

        quote = service._fetch_yahoo_chart_quote("CDR.PL", "PLN")

        self.assertIsNotNone(quote)
        self.assertEqual(quote["ticker"], "CDR.PL")
        self.assertEqual(quote["price"], 224.1)
        self.assertEqual(quote["currency"], "PLN")
        self.assertEqual(service.candidates[:2], ["CDR.PL", "CDR.WA"])

    def test_yahoo_candidates_handle_common_user_suffixes_and_currency_hints(self):
        suffixes = (".WA", ".DE", ".L", ".PA", ".MI", ".MC", ".AS", ".SW", ".US")
        suffix_by_currency = {"PLN": ".WA", "EUR": ".DE", "GBP": ".L", "GBX": ".L", "CHF": ".SW"}

        self.assertEqual(
            _yahoo_quote_candidates("AAPL.US", "USD", suffixes, suffix_by_currency)[:2],
            ["AAPL.US", "AAPL"],
        )
        self.assertEqual(
            _yahoo_quote_candidates("CDR.PL", "PLN", suffixes, suffix_by_currency)[:3],
            ["CDR.PL", "CDR.WA", "CDR"],
        )
        self.assertEqual(
            _yahoo_quote_candidates("DNP", "PLN", suffixes, suffix_by_currency)[:2],
            ["DNP.WA", "DNP"],
        )
        self.assertEqual(
            _yahoo_quote_candidates("SAP", "EUR", suffixes, suffix_by_currency)[:2],
            ["SAP.DE", "SAP"],
        )
        self.assertEqual(
            _yahoo_quote_candidates("ORLEN", "PLN", suffixes, suffix_by_currency)[:3],
            ["PKN.WA", "PKN", "ORLEN.WA"],
        )
        self.assertEqual(_guess_currency_from_ticker("AIR.PA"), "EUR")
        self.assertEqual(_guess_currency_from_ticker("ENEL.MI"), "EUR")

    def test_urlopen_retries_after_transient_error(self):
        service = RetryQuoteService()
        request = urllib.request.Request("https://example.com")

        payload = service._urlopen_bytes(request)

        self.assertEqual(payload, b"ok")
        self.assertEqual(service.calls, 2)


if __name__ == "__main__":
    unittest.main()

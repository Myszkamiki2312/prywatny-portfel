import unittest
import urllib.request

from backend.quotes import QuoteService, now_iso


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

    def _fetch_yahoo(self, tickers):  # noqa: ARG002
        self.yahoo_calls += 1
        if self.yahoo_responses:
            return [dict(item) for item in self.yahoo_responses.pop(0)]
        return []

    def _fetch_stooq(self, tickers):  # noqa: ARG002
        self.stooq_calls += 1
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

    def test_urlopen_retries_after_transient_error(self):
        service = RetryQuoteService()
        request = urllib.request.Request("https://example.com")

        payload = service._urlopen_bytes(request)

        self.assertEqual(payload, b"ok")
        self.assertEqual(service.calls, 2)


if __name__ == "__main__":
    unittest.main()

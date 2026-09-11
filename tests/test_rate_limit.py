import unittest

from backend.ratelimit import RateLimiter, client_key


class FakeClock:
    """Controllable clock so window expiry is tested without sleeping."""

    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


class ClientKeyTests(unittest.TestCase):
    def test_prefers_original_client_over_proxy_chain(self):
        headers = {"x-forwarded-for": "203.0.113.7, 70.41.3.18"}
        self.assertEqual(client_key(headers, "10.0.0.1"), "203.0.113.7")

    def test_falls_back_to_socket_host(self):
        self.assertEqual(client_key({}, "192.0.2.5"), "192.0.2.5")

    def test_unknown_when_nothing_identifies_the_caller(self):
        self.assertEqual(client_key({}, None), "unknown")


class RateLimiterTests(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.limiter = RateLimiter(clock=self.clock)

    def spend(self, count, caller="203.0.113.7", path="/api/quotes/refresh"):
        return [self.limiter.check(caller, path) for _ in range(count)]

    def test_quotes_refresh_blocks_after_its_budget(self):
        self.assertTrue(all(result is None for result in self.spend(10)))
        throttled = self.limiter.check("203.0.113.7", "/api/quotes/refresh")
        self.assertIsNotNone(throttled)
        retry_after, limit = throttled
        self.assertEqual(limit, 10)
        self.assertEqual(retry_after, 60)

    def test_budget_frees_up_once_the_window_passes(self):
        self.spend(10)
        self.assertIsNotNone(self.limiter.check("203.0.113.7", "/api/quotes/refresh"))
        self.clock.advance(61)
        self.assertIsNone(
            self.limiter.check("203.0.113.7", "/api/quotes/refresh"),
            "The window is a sliding one, so an idle caller must regain its budget.",
        )

    def test_limit_is_per_caller(self):
        self.spend(10, caller="198.51.100.1")
        self.assertIsNone(
            self.limiter.check("198.51.100.2", "/api/quotes/refresh"),
            "A different caller must not inherit someone else's spent budget.",
        )

    def test_buckets_are_per_path_group(self):
        self.spend(10)
        self.assertIsNotNone(self.limiter.check("203.0.113.7", "/api/quotes/refresh"))
        self.assertIsNone(
            self.limiter.check("203.0.113.7", "/api/state"),
            "Exhausting the quotes bucket must not throttle the general API bucket.",
        )

    def test_general_api_bucket_is_looser(self):
        results = [self.limiter.check("203.0.113.7", "/api/state") for _ in range(120)]
        self.assertTrue(all(result is None for result in results))
        self.assertIsNotNone(self.limiter.check("203.0.113.7", "/api/state"))

    def test_query_string_does_not_escape_the_bucket(self):
        self.spend(10, path="/api/quotes/refresh?tickers=CDR")
        self.assertIsNotNone(
            self.limiter.check("203.0.113.7", "/api/quotes/refresh?tickers=PKN"),
            "The bucket keys on the path, so varying the query must not reset it.",
        )

    def test_non_api_paths_are_not_rate_limited(self):
        results = [self.limiter.check("203.0.113.7", "/index.html") for _ in range(500)]
        self.assertTrue(all(result is None for result in results))

    def test_stale_buckets_are_pruned(self):
        limiter = RateLimiter(max_keys=2, clock=self.clock)
        for index in range(5):
            limiter.check(f"198.51.100.{index}", "/api/state")
        self.clock.advance(61)
        limiter.check("203.0.113.7", "/api/state")
        self.assertLessEqual(
            len(limiter._hits), 3, "Expired callers must not accumulate in memory."
        )


if __name__ == "__main__":
    unittest.main()

"""Rate limiting for the public hosted API.

The hosted /api/* surface has no per-user auth (an API token would be public in the browser
bundle anyway), so the quotes proxy is callable by anyone who knows the URL, and every call does
outbound network work inside a 60s function budget. Without a cap, one caller can burn the plan's
quota. These buckets blunt that.

Best-effort by design: state lives in process memory, so N concurrent serverless instances allow
up to N x the limit and a cold start resets the window. That is the right trade here — the goal is
stopping casual abuse of an open proxy, not exact quota accounting. Swap in a shared store
(Vercel KV / Redis) behind the same interface if abuse ever actually materialises.

Kept free of FastAPI imports on purpose: the policy is plain stdlib, so it stays unit-testable in
an environment that has no web framework installed.
"""

import time

# (path prefix, max requests, window seconds) — first match wins, so order matters.
DEFAULT_RULES = (
    ("/api/quotes/refresh", 10, 60),   # outbound fetch per ticker — the expensive one
    ("/api/reports/generate", 30, 60),
    ("/api/", 120, 60),                # catch-all for the rest of the surface
)

DEFAULT_MAX_KEYS = 4096


def client_key(headers, fallback_host=None):
    """Identify the caller, preferring the original client IP over the proxy's."""
    forwarded = ""
    if headers is not None:
        forwarded = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For") or ""
    if forwarded:
        return forwarded.split(",")[0].strip()
    return fallback_host or "unknown"


class RateLimiter:
    """Sliding-window counter keyed by (caller, path bucket)."""

    def __init__(self, rules=DEFAULT_RULES, max_keys=DEFAULT_MAX_KEYS, clock=time.monotonic):
        self._rules = tuple(rules)
        self._max_keys = max_keys
        self._clock = clock
        self._hits = {}

    def reset(self):
        self._hits.clear()

    def _rule_for(self, full_path):
        base = full_path.split("?", 1)[0]
        for prefix, limit, window in self._rules:
            if base == prefix.rstrip("/") or base.startswith(prefix):
                return prefix, limit, window
        return None

    def _prune(self, now, window):
        """Drop stale buckets so a long-lived instance cannot grow this dict without bound."""
        if len(self._hits) <= self._max_keys:
            return
        for key, stamps in list(self._hits.items()):
            if not stamps or now - stamps[-1] > window:
                self._hits.pop(key, None)

    def check(self, caller, full_path):
        """Record a request. Returns (retry_after_seconds, limit) when over budget, else None."""
        rule = self._rule_for(full_path)
        if rule is None:
            return None
        prefix, limit, window = rule
        now = self._clock()
        key = (caller, prefix)
        self._prune(now, window)

        stamps = [stamp for stamp in self._hits.get(key, ()) if now - stamp < window]
        if len(stamps) >= limit:
            self._hits[key] = stamps
            return max(1, int(window - (now - stamps[0]))), limit
        stamps.append(now)
        self._hits[key] = stamps
        return None

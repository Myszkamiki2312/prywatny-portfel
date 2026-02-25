"""Quote providers and refresh service."""

from __future__ import annotations

import csv
from datetime import datetime, timezone
import io
import json
import ssl
import threading
import time
from typing import Any, Dict, Iterable, List, TypedDict
import urllib.error
import urllib.parse
import urllib.request

from .utils import now_iso


class QuoteRow(TypedDict):
    ticker: str
    price: float
    currency: str
    provider: str
    fetched_at: str


class ApiQuoteRow(QuoteRow, total=False):
    fetchedAt: str
    stale: bool
    ageSeconds: int
    source: str


class HistoryRow(TypedDict):
    date: str
    close: float


class QuoteService:
    def __init__(
        self,
        *,
        timeout_seconds: int = 8,
        quote_cache_ttl_seconds: int = 90,
        history_cache_ttl_seconds: int = 6 * 60 * 60,
        stale_fallback_max_age_seconds: int = 7 * 24 * 60 * 60,
        max_retry_attempts: int = 2,
        retry_backoff_seconds: float = 0.3,
    ):
        self.timeout_seconds = timeout_seconds
        self.quote_cache_ttl_seconds = max(0, int(quote_cache_ttl_seconds))
        self.history_cache_ttl_seconds = max(0, int(history_cache_ttl_seconds))
        self.stale_fallback_max_age_seconds = max(0, int(stale_fallback_max_age_seconds))
        self.max_retry_attempts = max(0, int(max_retry_attempts))
        self.retry_backoff_seconds = max(0.0, float(retry_backoff_seconds))
        self._quote_cache: Dict[str, Dict[str, object]] = {}
        self._history_cache: Dict[str, Dict[str, object]] = {}
        self._lock = threading.RLock()

    def refresh(self, tickers: Iterable[str]) -> List[ApiQuoteRow]:
        requested = _normalize_tickers(tickers)
        if not requested:
            return []

        now_ts = time.time()
        found: Dict[str, ApiQuoteRow] = {}
        missing: List[str] = []

        for ticker in requested:
            cached = self._get_quote_cache(ticker)
            if cached and _is_iso_fresh(str(cached.get("fetched_at") or ""), self.quote_cache_ttl_seconds, now_ts):
                found[ticker] = self._quote_output(cached, now_ts=now_ts, source="memory-cache", stale=False)
            else:
                missing.append(ticker)

        fetched: Dict[str, QuoteRow] = {}
        if missing:
            for row in self._fetch_yahoo(missing):
                normalized = self._normalize_quote_row(row)
                if normalized:
                    fetched[normalized["ticker"]] = normalized

        unresolved = [ticker for ticker in missing if ticker not in fetched]
        if unresolved:
            for row in self._fetch_stooq(unresolved):
                normalized = self._normalize_quote_row(row)
                if normalized:
                    fetched[normalized["ticker"]] = normalized

        for ticker, row in fetched.items():
            self._set_quote_cache(row)
            found[ticker] = self._quote_output(
                row,
                now_ts=now_ts,
                source=str(row.get("provider") or "market-data"),
                stale=False,
            )

        unresolved = [ticker for ticker in missing if ticker not in fetched]
        for ticker in unresolved:
            stale_cached = self._get_quote_cache(ticker)
            if not stale_cached:
                continue
            age_seconds = _age_seconds_from_iso(str(stale_cached.get("fetched_at") or ""), now_ts)
            if self.stale_fallback_max_age_seconds > 0 and age_seconds > self.stale_fallback_max_age_seconds:
                continue
            found[ticker] = self._quote_output(
                stale_cached,
                now_ts=now_ts,
                source="memory-cache-stale",
                stale=True,
            )

        # Keep stable order for response payload.
        return [found[ticker] for ticker in requested if ticker in found]

    def fetch_daily_history(self, ticker: str, limit: int = 400) -> List[HistoryRow]:
        symbol = str(ticker or "").strip()
        if not symbol:
            return []

        now_ts = time.time()
        cache_key = symbol.upper()
        cached = self._get_history_cache(cache_key)
        if cached and _is_iso_fresh(str(cached.get("fetched_at") or ""), self.history_cache_ttl_seconds, now_ts):
            rows = [dict(item) for item in cached.get("rows", [])]
        else:
            rows = self._fetch_stooq_history(symbol)
            if rows:
                self._set_history_cache(cache_key, rows)
            elif cached:
                rows = [dict(item) for item in cached.get("rows", [])]

        safe_limit = max(1, int(limit or 400))
        if safe_limit > 0:
            rows = rows[-safe_limit:]
        return rows

    def _fetch_yahoo(self, tickers: List[str]) -> List[QuoteRow]:
        symbols = ",".join(tickers)
        query = urllib.parse.urlencode({"symbols": symbols})
        url = f"https://query1.finance.yahoo.com/v7/finance/quote?{query}"
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "PrywatnyPortfel/1.0",
                "Accept": "application/json",
            },
        )
        try:
            raw = self._urlopen_bytes(request)
            payload = json.loads(raw.decode("utf-8", errors="ignore"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ssl.SSLError):
            return []

        rows = payload.get("quoteResponse", {}).get("result", [])
        output: List[QuoteRow] = []
        for row in rows:
            symbol = str(row.get("symbol") or "").upper().strip()
            price = row.get("regularMarketPrice")
            if not symbol or not isinstance(price, (float, int)):
                continue
            currency = str(row.get("currency") or _guess_currency_from_ticker(symbol))
            output.append(
                {
                    "ticker": symbol,
                    "price": float(price),
                    "currency": currency,
                    "provider": "yahoo",
                    "fetched_at": now_iso(),
                }
            )
        return output

    def _fetch_stooq(self, tickers: List[str]) -> List[QuoteRow]:
        output: List[QuoteRow] = []
        for ticker in tickers:
            row = self._fetch_single_stooq(ticker)
            if row:
                output.append(row)
        return output

    def _fetch_stooq_history(self, ticker: str) -> List[HistoryRow]:
        for candidate in _stooq_history_candidates(ticker):
            url = "https://stooq.com/q/d/l/?" + urllib.parse.urlencode({"s": candidate, "i": "d"})
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "PrywatnyPortfel/1.0", "Accept": "text/csv"},
            )
            try:
                text = self._urlopen_bytes(request).decode("utf-8", errors="ignore")
            except (urllib.error.URLError, TimeoutError, ssl.SSLError):
                continue
            rows = _parse_stooq_history_csv(text)
            if rows:
                return rows
        return []

    def _fetch_single_stooq(self, ticker: str) -> QuoteRow | None:
        candidates = _stooq_candidates(ticker)
        for candidate in candidates:
            url = (
                "https://stooq.com/q/l/?"
                + urllib.parse.urlencode({"s": candidate, "f": "sd2t2ohlcv", "h": "", "e": "csv"})
            )
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "PrywatnyPortfel/1.0", "Accept": "text/csv"},
            )
            try:
                text = self._urlopen_bytes(request).decode("utf-8", errors="ignore")
            except (urllib.error.URLError, TimeoutError, ssl.SSLError):
                continue

            parsed = _parse_stooq_csv(text)
            close_val = parsed.get("Close")
            if not close_val or close_val == "N/D":
                continue
            try:
                price = float(close_val)
            except ValueError:
                continue
            return {
                "ticker": ticker,
                "price": price,
                "currency": _guess_currency_from_ticker(candidate),
                "provider": "stooq",
                "fetched_at": now_iso(),
            }
        return None

    def _urlopen_bytes(self, request: urllib.request.Request) -> bytes:
        attempts = self.max_retry_attempts + 1
        last_error: Exception | None = None
        for attempt in range(attempts):
            try:
                return self._urlopen_once(request, verify_ssl=True)
            except urllib.error.URLError as error:
                # Some self-hosted environments do not ship full CA chain.
                if isinstance(error.reason, ssl.SSLError):
                    try:
                        return self._urlopen_once(request, verify_ssl=False)
                    except Exception as secondary_error:  # noqa: BLE001
                        last_error = secondary_error
                else:
                    last_error = error
            except (TimeoutError, ssl.SSLError) as error:
                last_error = error

            if attempt < attempts - 1 and self.retry_backoff_seconds > 0:
                time.sleep(self.retry_backoff_seconds * (2**attempt))

        if last_error:
            raise last_error
        raise TimeoutError("Quote request failed without explicit error.")

    def _urlopen_once(self, request: urllib.request.Request, *, verify_ssl: bool) -> bytes:
        if verify_ssl:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return response.read()
        context = ssl._create_unverified_context()  # noqa: S323
        with urllib.request.urlopen(request, timeout=self.timeout_seconds, context=context) as response:
            return response.read()

    def _normalize_quote_row(self, row: Dict[str, Any]) -> QuoteRow | None:
        ticker = str(row.get("ticker") or "").upper().strip()
        price_raw = row.get("price")
        if not ticker:
            return None
        if not isinstance(price_raw, (float, int)):
            return None
        price = float(price_raw)
        if price <= 0:
            return None
        currency = str(row.get("currency") or _guess_currency_from_ticker(ticker)).upper().strip() or "USD"
        provider = str(row.get("provider") or "unknown").strip() or "unknown"
        fetched_at = _normalize_iso(str(row.get("fetched_at") or row.get("fetchedAt") or now_iso()))
        return {
            "ticker": ticker,
            "price": price,
            "currency": currency,
            "provider": provider,
            "fetched_at": fetched_at,
        }

    def _quote_output(
        self,
        row: Dict[str, Any],
        *,
        now_ts: float,
        source: str,
        stale: bool,
    ) -> ApiQuoteRow:
        fetched_at = _normalize_iso(str(row.get("fetched_at") or row.get("fetchedAt") or ""))
        age_seconds = _age_seconds_from_iso(fetched_at, now_ts)
        return {
            "ticker": str(row.get("ticker") or "").upper(),
            "price": float(row.get("price") or 0),
            "currency": str(row.get("currency") or "USD"),
            "provider": str(row.get("provider") or "unknown"),
            "fetched_at": fetched_at,
            "fetchedAt": fetched_at,
            "stale": bool(stale),
            "ageSeconds": age_seconds,
            "source": source,
        }

    def _get_quote_cache(self, ticker: str) -> Dict[str, object] | None:
        key = str(ticker or "").upper().strip()
        if not key:
            return None
        with self._lock:
            cached = self._quote_cache.get(key)
            if not cached:
                return None
            return dict(cached)

    def _set_quote_cache(self, row: Dict[str, Any]) -> None:
        key = str(row.get("ticker") or "").upper().strip()
        if not key:
            return
        with self._lock:
            self._quote_cache[key] = dict(row)
            if len(self._quote_cache) > 5000:
                self._quote_cache = dict(list(self._quote_cache.items())[-2500:])

    def _get_history_cache(self, key: str) -> Dict[str, object] | None:
        cache_key = str(key or "").upper().strip()
        if not cache_key:
            return None
        with self._lock:
            cached = self._history_cache.get(cache_key)
            if not cached:
                return None
            return {
                "fetched_at": str(cached.get("fetched_at") or ""),
                "rows": [dict(item) for item in cached.get("rows", [])],
            }

    def _set_history_cache(self, key: str, rows: List[HistoryRow]) -> None:
        cache_key = str(key or "").upper().strip()
        if not cache_key:
            return
        with self._lock:
            self._history_cache[cache_key] = {
                "fetched_at": now_iso(),
                "rows": [dict(item) for item in rows],
            }
            if len(self._history_cache) > 200:
                self._history_cache = dict(list(self._history_cache.items())[-100:])


def _parse_stooq_csv(text: str) -> Dict[str, str]:
    stream = io.StringIO(text)
    reader = csv.DictReader(stream)
    for row in reader:
        return {str(key): str(value) for key, value in row.items()}
    return {}


def _normalize_tickers(tickers: Iterable[str]) -> List[str]:
    output: List[str] = []
    for ticker in tickers:
        text = str(ticker or "").upper().strip()
        if not text:
            continue
        if text not in output:
            output.append(text)
    return output


def _parse_stooq_history_csv(text: str) -> List[HistoryRow]:
    stream = io.StringIO(text)
    reader = csv.DictReader(stream)
    output: List[HistoryRow] = []
    for row in reader:
        date_text = str(row.get("Date") or "").strip()
        close_text = str(row.get("Close") or "").strip()
        if not date_text or not close_text or close_text == "N/D":
            continue
        try:
            close_value = float(close_text)
        except ValueError:
            continue
        output.append({"date": date_text[:10], "close": close_value})
    output.sort(key=lambda item: str(item.get("date") or ""))
    return output


def _stooq_candidates(ticker: str) -> List[str]:
    base = ticker.lower().strip()
    if not base:
        return []
    candidates = [base]
    if "." not in base:
        candidates.extend([f"{base}.us", f"{base}.pl"])
    return candidates


def _stooq_history_candidates(ticker: str) -> List[str]:
    raw = str(ticker or "").strip()
    if not raw:
        return []
    alias_map = {
        "WIG20": "wig20",
        "WIG": "wig",
        "MWIG40": "mwig40",
        "SWIG80": "swig80",
        "SP500": "spx",
        "S&P500": "spx",
        "GSPC": "spx",
        "^GSPC": "spx",
        "NASDAQ100": "ndq",
        "NASDAQ-100": "ndq",
        "NDX": "ndq",
        "DAX": "dax",
        "CAC40": "cac",
        "FTSE100": "uk100",
    }
    normalized = (
        raw.upper()
        .replace(" ", "")
        .replace("-", "")
        .replace("_", "")
    )
    candidates: List[str] = []
    alias = alias_map.get(raw.upper()) or alias_map.get(normalized)
    if alias:
        candidates.append(alias)
    base = raw.lower()
    if base not in candidates:
        candidates.append(base)
    if "." in base:
        root = base.split(".", 1)[0]
        if root not in candidates:
            candidates.append(root)
    else:
        for suffix in (".pl", ".us"):
            candidate = f"{base}{suffix}"
            if candidate not in candidates:
                candidates.append(candidate)
    return candidates


def _guess_currency_from_ticker(ticker: str) -> str:
    lower = ticker.lower()
    if lower.endswith(".pl") or lower.endswith(".wa"):
        return "PLN"
    if lower.endswith(".de"):
        return "EUR"
    if lower.endswith(".l"):
        return "GBP"
    if lower.endswith(".sw"):
        return "CHF"
    return "USD"


def _normalize_iso(value: str) -> str:
    ts = _timestamp_from_iso(value)
    if ts is None:
        return now_iso()
    return datetime.fromtimestamp(ts, timezone.utc).isoformat()


def _timestamp_from_iso(value: str) -> float | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def _age_seconds_from_iso(value: str, now_ts: float) -> int:
    ts = _timestamp_from_iso(value)
    if ts is None:
        return 0
    return max(0, int(now_ts - ts))


def _is_iso_fresh(value: str, ttl_seconds: int, now_ts: float) -> bool:
    if ttl_seconds <= 0:
        return False
    return _age_seconds_from_iso(value, now_ts) <= ttl_seconds

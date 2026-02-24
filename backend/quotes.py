"""Quote providers and refresh service."""

from __future__ import annotations

import csv
from datetime import datetime, timezone
import io
import json
import ssl
from typing import Dict, Iterable, List
import urllib.error
import urllib.parse
import urllib.request


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class QuoteService:
    def __init__(self, *, timeout_seconds: int = 8):
        self.timeout_seconds = timeout_seconds

    def refresh(self, tickers: Iterable[str]) -> List[Dict[str, object]]:
        requested = _normalize_tickers(tickers)
        if not requested:
            return []

        found: Dict[str, Dict[str, object]] = {}
        for row in self._fetch_yahoo(requested):
            found[row["ticker"]] = row

        missing = [ticker for ticker in requested if ticker not in found]
        if missing:
            for row in self._fetch_stooq(missing):
                found[row["ticker"]] = row

        # Keep stable order for response payload.
        return [found[ticker] for ticker in requested if ticker in found]

    def fetch_daily_history(self, ticker: str, limit: int = 400) -> List[Dict[str, object]]:
        symbol = str(ticker or "").strip()
        if not symbol:
            return []
        rows = self._fetch_stooq_history(symbol)
        safe_limit = max(1, int(limit or 400))
        if safe_limit > 0:
            rows = rows[-safe_limit:]
        return rows

    def _fetch_yahoo(self, tickers: List[str]) -> List[Dict[str, object]]:
        symbols = ",".join(tickers)
        query = urllib.parse.urlencode({"symbols": symbols})
        url = f"https://query1.finance.yahoo.com/v7/finance/quote?{query}"
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "MyFundSolo/1.0",
                "Accept": "application/json",
            },
        )
        try:
            raw = self._urlopen_bytes(request)
            payload = json.loads(raw.decode("utf-8", errors="ignore"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ssl.SSLError):
            return []

        rows = payload.get("quoteResponse", {}).get("result", [])
        output: List[Dict[str, object]] = []
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

    def _fetch_stooq(self, tickers: List[str]) -> List[Dict[str, object]]:
        output: List[Dict[str, object]] = []
        for ticker in tickers:
            row = self._fetch_single_stooq(ticker)
            if row:
                output.append(row)
        return output

    def _fetch_stooq_history(self, ticker: str) -> List[Dict[str, object]]:
        for candidate in _stooq_history_candidates(ticker):
            url = "https://stooq.com/q/d/l/?" + urllib.parse.urlencode({"s": candidate, "i": "d"})
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "MyFundSolo/1.0", "Accept": "text/csv"},
            )
            try:
                text = self._urlopen_bytes(request).decode("utf-8", errors="ignore")
            except (urllib.error.URLError, TimeoutError, ssl.SSLError):
                continue
            rows = _parse_stooq_history_csv(text)
            if rows:
                return rows
        return []

    def _fetch_single_stooq(self, ticker: str) -> Dict[str, object] | None:
        candidates = _stooq_candidates(ticker)
        for candidate in candidates:
            url = (
                "https://stooq.com/q/l/?"
                + urllib.parse.urlencode({"s": candidate, "f": "sd2t2ohlcv", "h": "", "e": "csv"})
            )
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "MyFundSolo/1.0", "Accept": "text/csv"},
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
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return response.read()
        except urllib.error.URLError as error:
            # Some self-hosted environments do not ship full CA chain.
            if isinstance(error.reason, ssl.SSLError):
                context = ssl._create_unverified_context()  # noqa: S323
                with urllib.request.urlopen(request, timeout=self.timeout_seconds, context=context) as response:
                    return response.read()
            raise


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


def _parse_stooq_history_csv(text: str) -> List[Dict[str, object]]:
    stream = io.StringIO(text)
    reader = csv.DictReader(stream)
    output: List[Dict[str, object]] = []
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

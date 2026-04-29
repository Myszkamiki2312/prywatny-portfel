"""Shared scalar/date/text helpers used across backend modules."""

from __future__ import annotations

from collections import deque
from datetime import date, datetime, timezone
import json
import re
from typing import Any
import unicodedata


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_num(value: Any, default: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = re.sub(r"[^\d,.\-]", "", str(value or "").strip().replace(" ", ""))
    last_comma = text.rfind(",")
    last_dot = text.rfind(".")
    if last_comma >= 0 and last_dot >= 0:
        decimal_separator = "," if last_comma > last_dot else "."
        thousands_separator = "." if decimal_separator == "," else ","
        text = text.replace(thousands_separator, "").replace(decimal_separator, ".")
    elif last_comma >= 0:
        text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return float(default)


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def norm(value: Any, *, strip_accents: bool = False) -> str:
    text = str(value or "").strip().lower()
    if strip_accents:
        text = "".join(
            char
            for char in unicodedata.normalize("NFKD", text)
            if not unicodedata.combining(char)
        )
    return " ".join(text.split())


def parse_date(value: Any, *, default: date | None = None) -> date:
    fallback = default or datetime.now(timezone.utc).date()
    text = str(value or "").strip()
    if not text:
        return fallback
    if len(text) >= 10 and text[4:5] == "-" and text[7:8] == "-":
        try:
            return date.fromisoformat(text[:10])
        except ValueError:
            return fallback
    for fmt in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%d.%m.%Y %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
    ):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return fallback


def normalize_currency(value: Any, fallback: str = "PLN") -> str:
    text = str(value or "").upper().strip()
    return text if len(text) == 3 and text.isalpha() else fallback


def normalize_fx_pair_key(value: Any, quote_currency: Any | None = None) -> str:
    if quote_currency is not None:
        base = normalize_currency(value, "")
        quote = normalize_currency(quote_currency, "")
        if base and quote and base != quote:
            return f"{base}/{quote}"
        return ""

    text = str(value or "").upper().strip()
    if not text:
        return ""
    if text.startswith("FX:"):
        text = text[3:]

    direct = re.fullmatch(r"([A-Z]{3})/([A-Z]{3})", text)
    if direct:
        return f"{direct.group(1)}/{direct.group(2)}"

    provider = re.fullmatch(r"([A-Z]{3})([A-Z]{3})(?:=X)?", text)
    if provider and provider.group(1) != provider.group(2):
        return f"{provider.group(1)}/{provider.group(2)}"
    return ""


def normalize_fx_rates(raw: Any) -> dict[str, float]:
    payload = raw
    if isinstance(raw, str):
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {}

    if not isinstance(payload, dict):
        return {}

    output: dict[str, float] = {}
    for key, value in payload.items():
        pair_key = normalize_fx_pair_key(key)
        if not pair_key:
            continue
        rate = to_num(value)
        if rate > 0:
            output[pair_key] = rate
    return output


def find_currency_conversion_rate(from_currency: Any, to_currency: Any, fx_rates: Any) -> float:
    base = normalize_currency(from_currency, "")
    quote = normalize_currency(to_currency, "")
    if not base or not quote:
        return 0.0
    if base == quote:
        return 1.0

    graph: dict[str, list[tuple[str, float]]] = {}
    for key, rate in normalize_fx_rates(fx_rates).items():
        src, dst = key.split("/", 1)
        graph.setdefault(src, []).append((dst, rate))
        graph.setdefault(dst, []).append((src, 1.0 / rate))

    queue: deque[tuple[str, float]] = deque([(base, 1.0)])
    visited = {base}
    while queue:
        current, current_rate = queue.popleft()
        if current == quote:
            return current_rate
        for next_currency, edge_rate in graph.get(current, []):
            if next_currency in visited:
                continue
            visited.add(next_currency)
            queue.append((next_currency, current_rate * edge_rate))
    return 0.0


def convert_currency(value: Any, from_currency: Any, to_currency: Any, fx_rates: Any) -> float:
    amount = to_num(value)
    base = normalize_currency(from_currency, "")
    quote = normalize_currency(to_currency, "")
    if not base or not quote:
        return amount
    if base == quote:
        return amount
    rate = find_currency_conversion_rate(base, quote, fx_rates)
    if rate <= 0:
        return amount
    return amount * rate

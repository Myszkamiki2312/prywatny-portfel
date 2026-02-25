"""Shared scalar/date/text helpers used across backend modules."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
import unicodedata


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_num(value: Any, default: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip().replace(" ", "").replace(",", ".")
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

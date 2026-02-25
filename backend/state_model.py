"""State model helpers shared by API, importers and DB adapter."""

from __future__ import annotations

from datetime import datetime, timezone
import random
import string
from typing import Any, Dict, Iterable, List
from .utils import now_iso, parse_date, to_num


PLAN_ORDER = ["Brak", "Basic", "Standard", "Pro", "Expert"]

def today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def make_id(prefix: str) -> str:
    chars = "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{chars}"

def to_tags(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [part.strip() for part in str(value).split(",") if part.strip()]


def normalize_date(value: Any) -> str:
    if value is None:
        return today_iso()
    text = str(value).strip()
    if not text:
        return today_iso()
    if len(text) >= 10 and text[4:5] == "-" and text[7:8] == "-":
        return text[:10]
    return _parse_date(text)


def _parse_date(text: str) -> str:
    return parse_date(text).isoformat()


def text_or_fallback(value: Any, fallback: str) -> str:
    text = str(value or "").strip()
    return text if text else fallback


def default_state() -> Dict[str, Any]:
    created_at = now_iso()
    return {
        "meta": {
            "activePlan": "Expert",
            "baseCurrency": "PLN",
            "createdAt": created_at,
        },
        "portfolios": [
            {
                "id": make_id("ptf"),
                "name": "Glowny",
                "currency": "PLN",
                "benchmark": "WIG20",
                "goal": "Dlugoterminowy wzrost",
                "parentId": "",
                "twinOf": "",
                "groupName": "",
                "isPublic": False,
                "createdAt": created_at,
            }
        ],
        "accounts": [
            {
                "id": make_id("acc"),
                "name": "Konto podstawowe",
                "type": "Broker",
                "currency": "PLN",
                "createdAt": created_at,
            }
        ],
        "assets": [],
        "operations": [],
        "recurringOps": [],
        "liabilities": [],
        "alerts": [],
        "notes": [],
        "strategies": [],
        "favorites": [],
    }


def normalize_state(state_value: Any) -> Dict[str, Any]:
    value = state_value if isinstance(state_value, dict) else {}
    fallback = default_state()
    meta = value.get("meta") if isinstance(value.get("meta"), dict) else {}
    active_plan = meta.get("activePlan")
    if active_plan not in PLAN_ORDER:
        active_plan = fallback["meta"]["activePlan"]

    normalized = {
        "meta": {
            "activePlan": active_plan,
            "baseCurrency": text_or_fallback(meta.get("baseCurrency"), fallback["meta"]["baseCurrency"]),
            "createdAt": text_or_fallback(meta.get("createdAt"), fallback["meta"]["createdAt"]),
        },
        "portfolios": _normalize_portfolios(value.get("portfolios"), fallback),
        "accounts": _normalize_accounts(value.get("accounts"), fallback),
        "assets": _normalize_assets(value.get("assets"), fallback),
        "operations": _normalize_operations(value.get("operations"), fallback),
        "recurringOps": _normalize_recurring(value.get("recurringOps"), fallback),
        "liabilities": _normalize_liabilities(value.get("liabilities"), fallback),
        "alerts": _normalize_alerts(value.get("alerts"), fallback),
        "notes": _normalize_notes(value.get("notes")),
        "strategies": _normalize_strategies(value.get("strategies")),
        "favorites": _normalize_favorites(value.get("favorites")),
    }
    if not normalized["portfolios"]:
        normalized["portfolios"] = fallback["portfolios"]
    if not normalized["accounts"]:
        normalized["accounts"] = fallback["accounts"]
    return normalized


def _normalize_portfolios(raw: Any, fallback: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return fallback["portfolios"]
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("ptf")),
                "name": text_or_fallback(item.get("name"), "Portfel"),
                "currency": text_or_fallback(item.get("currency"), fallback["meta"]["baseCurrency"]),
                "benchmark": str(item.get("benchmark") or ""),
                "goal": str(item.get("goal") or ""),
                "parentId": str(item.get("parentId") or ""),
                "twinOf": str(item.get("twinOf") or ""),
                "groupName": str(item.get("groupName") or ""),
                "isPublic": bool(item.get("isPublic")),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_accounts(raw: Any, fallback: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return fallback["accounts"]
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("acc")),
                "name": text_or_fallback(item.get("name"), "Konto"),
                "type": text_or_fallback(item.get("type"), "Broker"),
                "currency": text_or_fallback(item.get("currency"), fallback["meta"]["baseCurrency"]),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_assets(raw: Any, fallback: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("ast")),
                "ticker": text_or_fallback(item.get("ticker"), "N/A").upper(),
                "name": text_or_fallback(item.get("name"), "Brak nazwy"),
                "type": text_or_fallback(item.get("type"), "Inny"),
                "currency": text_or_fallback(item.get("currency"), fallback["meta"]["baseCurrency"]),
                "currentPrice": to_num(item.get("currentPrice")),
                "risk": max(1.0, min(10.0, to_num(item.get("risk")) or 5.0)),
                "sector": str(item.get("sector") or ""),
                "industry": str(item.get("industry") or ""),
                "tags": to_tags(item.get("tags")),
                "benchmark": str(item.get("benchmark") or ""),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_operations(raw: Any, fallback: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("op")),
                "date": normalize_date(item.get("date")),
                "type": text_or_fallback(item.get("type"), "Operacja gotowkowa"),
                "portfolioId": str(item.get("portfolioId") or ""),
                "accountId": str(item.get("accountId") or ""),
                "assetId": str(item.get("assetId") or ""),
                "targetAssetId": str(item.get("targetAssetId") or ""),
                "quantity": to_num(item.get("quantity")),
                "targetQuantity": to_num(item.get("targetQuantity")),
                "price": to_num(item.get("price")),
                "amount": to_num(item.get("amount")),
                "fee": to_num(item.get("fee")),
                "currency": text_or_fallback(item.get("currency"), fallback["meta"]["baseCurrency"]),
                "tags": to_tags(item.get("tags")),
                "note": str(item.get("note") or ""),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_recurring(raw: Any, fallback: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("rec")),
                "name": text_or_fallback(item.get("name"), "Operacja cykliczna"),
                "type": text_or_fallback(item.get("type"), "Operacja gotowkowa"),
                "frequency": text_or_fallback(item.get("frequency"), "monthly"),
                "startDate": normalize_date(item.get("startDate")),
                "amount": to_num(item.get("amount")),
                "portfolioId": str(item.get("portfolioId") or ""),
                "accountId": str(item.get("accountId") or ""),
                "assetId": str(item.get("assetId") or ""),
                "currency": text_or_fallback(item.get("currency"), fallback["meta"]["baseCurrency"]),
                "lastGeneratedDate": str(item.get("lastGeneratedDate") or ""),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_liabilities(raw: Any, fallback: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("liab")),
                "name": text_or_fallback(item.get("name"), "Zobowiazanie"),
                "amount": to_num(item.get("amount")),
                "currency": text_or_fallback(item.get("currency"), fallback["meta"]["baseCurrency"]),
                "rate": to_num(item.get("rate")),
                "dueDate": str(item.get("dueDate") or ""),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_alerts(raw: Any, fallback: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("alt")),
                "assetId": str(item.get("assetId") or ""),
                "direction": "lte" if str(item.get("direction") or "").lower() == "lte" else "gte",
                "targetPrice": to_num(item.get("targetPrice")),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
                "lastTriggerAt": str(item.get("lastTriggerAt") or ""),
            }
        )
    return output


def _normalize_notes(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("note")),
                "content": str(item.get("content") or ""),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_strategies(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    output = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        output.append(
            {
                "id": text_or_fallback(item.get("id"), make_id("str")),
                "name": text_or_fallback(item.get("name"), "Strategia"),
                "description": str(item.get("description") or ""),
                "createdAt": text_or_fallback(item.get("createdAt"), now_iso()),
            }
        )
    return output


def _normalize_favorites(raw: Any) -> List[str]:
    if not isinstance(raw, Iterable) or isinstance(raw, (str, bytes, dict)):
        return []
    output = []
    for item in raw:
        text = str(item or "").strip()
        if text:
            output.append(text)
    return output

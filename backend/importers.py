"""Broker CSV importers."""

from __future__ import annotations

import csv
import io
import re
from typing import Any, Dict, List
import unicodedata

from .database import Database
from .state_model import make_id, normalize_date, now_iso, text_or_fallback, to_num, to_tags


SUPPORTED_BROKERS: Dict[str, Dict[str, Any]] = {
    "generic": {
        "name": "Generic CSV",
        "description": "Uniwersalny importer oparty o naglowki z aplikacji.",
        "requiredHeaders": ["date", "type"],
    },
    "xtb": {
        "name": "XTB",
        "description": "Import historii transakcji XTB (CSV).",
        "requiredHeaders": ["time", "symbol", "type"],
    },
    "mbank": {
        "name": "mBank",
        "description": "Import historii rachunku maklerskiego mBank (CSV).",
        "requiredHeaders": ["data", "rodzaj", "instrument"],
    },
    "degiro": {
        "name": "DEGIRO",
        "description": "Import historii transakcji DEGIRO (CSV).",
        "requiredHeaders": ["date", "product", "quantity"],
    },
}


class BrokerImporter:
    def __init__(self, database: Database):
        self.database = database

    def list_brokers(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": broker_id,
                "name": item["name"],
                "description": item["description"],
                "requiredHeaders": item["requiredHeaders"],
            }
            for broker_id, item in SUPPORTED_BROKERS.items()
        ]

    def import_csv(self, *, broker: str, csv_text: str, options: Dict[str, Any]) -> Dict[str, Any]:
        broker_id = str(broker or "").strip().lower()
        if broker_id not in SUPPORTED_BROKERS:
            raise ValueError(f"Unsupported broker: {broker_id}")

        rows = parse_csv_rows(csv_text)
        state = self.database.get_state()
        created = {"assets": 0, "accounts": 0, "portfolios": 0}

        default_portfolio_id = _ensure_portfolio(
            state,
            preferred_id=str(options.get("portfolioId") or "").strip(),
            preferred_name=str(options.get("portfolioName") or "").strip(),
            created=created,
        )
        default_account_id = _ensure_account(
            state,
            preferred_id=str(options.get("accountId") or "").strip(),
            preferred_name=str(options.get("accountName") or "").strip(),
            created=created,
        )

        mapper = _pick_mapper(broker_id)
        imported_count = 0

        for raw_row in rows:
            row = normalize_row_keys(raw_row)
            mapped = mapper(
                row,
                state=state,
                created=created,
                default_portfolio_id=default_portfolio_id,
                default_account_id=default_account_id,
            )
            if not mapped:
                continue
            state["operations"].append(mapped)
            imported_count += 1

        self.database.replace_state(state)
        self.database.log_import(
            broker=broker_id,
            file_name=str(options.get("fileName") or "inline"),
            row_count=len(rows),
            imported_count=imported_count,
            status="success",
            message=f"Imported {imported_count} operations",
            imported_at=now_iso(),
        )

        return {
            "broker": broker_id,
            "rowCount": len(rows),
            "importedCount": imported_count,
            "created": created,
        }


def parse_csv_rows(text: str) -> List[Dict[str, str]]:
    payload = str(text or "").strip()
    if not payload:
        return []
    stream = io.StringIO(payload)
    sample = payload[:4096]
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,|\t,")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = _pick_delimiter(payload)
    reader = csv.DictReader(stream, delimiter=delimiter)
    output = []
    for row in reader:
        if not row:
            continue
        if not any(str(value or "").strip() for value in row.values()):
            continue
        output.append({str(key or "").strip(): str(value or "").strip() for key, value in row.items()})
    return output


def normalize_row_keys(row: Dict[str, str]) -> Dict[str, str]:
    normalized = {}
    for key, value in row.items():
        normalized[_normalize_key(key)] = str(value or "").strip()
    return normalized


def row_value(row: Dict[str, str], *keys: str) -> str:
    for key in keys:
        value = row.get(_normalize_key(key), "")
        if str(value).strip():
            return str(value).strip()
    return ""


def _pick_mapper(broker_id: str):
    if broker_id == "xtb":
        return _map_xtb_row
    if broker_id == "mbank":
        return _map_mbank_row
    if broker_id == "degiro":
        return _map_degiro_row
    return _map_generic_row


def _map_generic_row(
    row: Dict[str, str],
    *,
    state: Dict[str, Any],
    created: Dict[str, int],
    default_portfolio_id: str,
    default_account_id: str,
) -> Dict[str, Any] | None:
    op_type = _normalize_operation_type(
        row_value(row, "type", "operation_type", "rodzaj", "operacja", "typ")
    )
    date = normalize_date(row_value(row, "date", "data", "time"))
    portfolio_id = _ensure_portfolio(
        state,
        preferred_id=row_value(row, "portfolioId", "portfolio_id"),
        preferred_name=row_value(row, "portfolio", "portfel"),
        created=created,
        fallback_id=default_portfolio_id,
    )
    account_id = _ensure_account(
        state,
        preferred_id=row_value(row, "accountId", "account_id"),
        preferred_name=row_value(row, "account", "konto"),
        created=created,
        fallback_id=default_account_id,
    )
    asset_id = _ensure_asset(
        state,
        token=row_value(row, "asset", "walor", "ticker", "symbol", "instrument"),
        created=created,
    )
    target_asset_id = _ensure_asset(
        state,
        token=row_value(row, "targetAsset", "target_asset", "walorDocelowy", "instrumentdocelowy"),
        created=created,
    )
    quantity = to_num(row_value(row, "quantity", "ilosc", "qty", "volume"))
    target_quantity = to_num(row_value(row, "targetQuantity", "target_quantity", "iloscDocelowa"))
    price = to_num(row_value(row, "price", "cena", "openprice"))
    amount = to_num(row_value(row, "amount", "kwota", "value"))
    fee = to_num(row_value(row, "fee", "prowizja", "commission"))
    currency = text_or_fallback(row_value(row, "currency", "waluta"), state["meta"]["baseCurrency"])
    tags = to_tags(row_value(row, "tags", "tagi"))
    note = row_value(row, "note", "notatka", "comment")

    if op_type in ("Kupno waloru", "Sprzedaż waloru") and amount == 0 and quantity and price:
        amount = quantity * price

    return {
        "id": make_id("op"),
        "date": date,
        "type": op_type,
        "portfolioId": portfolio_id,
        "accountId": account_id,
        "assetId": asset_id,
        "targetAssetId": target_asset_id,
        "quantity": quantity,
        "targetQuantity": target_quantity,
        "price": price,
        "amount": amount,
        "fee": fee,
        "currency": currency,
        "tags": tags,
        "note": note,
        "createdAt": now_iso(),
    }


def _map_xtb_row(
    row: Dict[str, str],
    *,
    state: Dict[str, Any],
    created: Dict[str, int],
    default_portfolio_id: str,
    default_account_id: str,
) -> Dict[str, Any] | None:
    side = _simplify_text(row_value(row, "type", "side", "transakcja"))
    symbol = row_value(row, "symbol", "instrument", "ticker")
    quantity = to_num(row_value(row, "volume", "lots", "quantity", "ilosc"))
    price = to_num(row_value(row, "openprice", "price", "cena"))
    commission = to_num(row_value(row, "commission", "fee", "prowizja"))
    profit = to_num(row_value(row, "profit", "amount", "kwota"))
    currency = text_or_fallback(row_value(row, "currency", "waluta"), state["meta"]["baseCurrency"])

    op_type = _normalize_operation_type(side)
    if "buy" in side:
        op_type = "Kupno waloru"
    elif "sell" in side:
        op_type = "Sprzedaż waloru"
    elif "dividend" in side:
        op_type = "Dywidenda"
    elif "deposit" in side:
        op_type = "Operacja gotówkowa"
    elif "withdraw" in side:
        op_type = "Przelew gotówkowy"

    portfolio_id = _ensure_portfolio(
        state,
        preferred_name=row_value(row, "portfolio", "portfel"),
        preferred_id=row_value(row, "portfolioid"),
        created=created,
        fallback_id=default_portfolio_id,
    )
    account_id = _ensure_account(
        state,
        preferred_name=row_value(row, "account", "konto"),
        preferred_id=row_value(row, "accountid"),
        created=created,
        fallback_id=default_account_id,
    )
    asset_id = _ensure_asset(state, token=symbol, created=created)
    amount = profit
    if op_type in ("Kupno waloru", "Sprzedaż waloru") and quantity and price:
        amount = quantity * price

    return {
        "id": make_id("op"),
        "date": normalize_date(row_value(row, "time", "date", "data")),
        "type": op_type,
        "portfolioId": portfolio_id,
        "accountId": account_id,
        "assetId": asset_id,
        "targetAssetId": "",
        "quantity": quantity,
        "targetQuantity": 0.0,
        "price": price,
        "amount": amount,
        "fee": commission,
        "currency": currency,
        "tags": ["xtb"],
        "note": row_value(row, "comment", "note"),
        "createdAt": now_iso(),
    }


def _map_mbank_row(
    row: Dict[str, str],
    *,
    state: Dict[str, Any],
    created: Dict[str, int],
    default_portfolio_id: str,
    default_account_id: str,
) -> Dict[str, Any] | None:
    kind = row_value(row, "rodzajoperacji", "rodzaj", "type", "typ")
    op_type = _normalize_operation_type(kind)
    instrument = row_value(row, "instrument", "walor", "ticker", "symbol")
    quantity = to_num(row_value(row, "ilosc", "quantity"))
    price = to_num(row_value(row, "cena", "price"))
    amount = to_num(row_value(row, "kwota", "amount", "wartosc"))
    fee = to_num(row_value(row, "prowizja", "fee", "commission"))
    currency = text_or_fallback(row_value(row, "waluta", "currency"), state["meta"]["baseCurrency"])

    if op_type in ("Kupno waloru", "Sprzedaż waloru") and amount == 0 and quantity and price:
        amount = quantity * price

    portfolio_id = _ensure_portfolio(
        state,
        preferred_name=row_value(row, "portfel", "portfolio"),
        preferred_id=row_value(row, "portfolioid"),
        created=created,
        fallback_id=default_portfolio_id,
    )
    account_id = _ensure_account(
        state,
        preferred_name=row_value(row, "konto", "account"),
        preferred_id=row_value(row, "accountid"),
        created=created,
        fallback_id=default_account_id,
    )
    asset_id = _ensure_asset(state, token=instrument, created=created)

    return {
        "id": make_id("op"),
        "date": normalize_date(row_value(row, "data", "date", "time")),
        "type": op_type,
        "portfolioId": portfolio_id,
        "accountId": account_id,
        "assetId": asset_id,
        "targetAssetId": "",
        "quantity": quantity,
        "targetQuantity": 0.0,
        "price": price,
        "amount": amount,
        "fee": fee,
        "currency": currency,
        "tags": ["mbank"],
        "note": row_value(row, "notatka", "note", "comment"),
        "createdAt": now_iso(),
    }


def _map_degiro_row(
    row: Dict[str, str],
    *,
    state: Dict[str, Any],
    created: Dict[str, int],
    default_portfolio_id: str,
    default_account_id: str,
) -> Dict[str, Any] | None:
    action_raw = row_value(row, "action", "side", "transactiontype", "type", "description")
    action = _simplify_text(action_raw)
    raw_quantity = to_num(row_value(row, "quantity", "ilosc", "qty", "size"))
    quantity = abs(raw_quantity)
    price = to_num(row_value(row, "price", "cena", "executionprice"))
    amount = to_num(
        row_value(
            row,
            "total",
            "amount",
            "value",
            "localvalue",
            "kwota",
            "change",
            "wartosc",
        )
    )
    fee = abs(to_num(row_value(row, "fee", "commission", "transactionandorthird", "costs")))
    currency = text_or_fallback(row_value(row, "currency", "waluta"), state["meta"]["baseCurrency"])

    portfolio_id = _ensure_portfolio(
        state,
        preferred_name=row_value(row, "portfolio", "portfel"),
        preferred_id=row_value(row, "portfolioid"),
        created=created,
        fallback_id=default_portfolio_id,
    )
    account_id = _ensure_account(
        state,
        preferred_name=row_value(row, "account", "konto"),
        preferred_id=row_value(row, "accountid"),
        created=created,
        fallback_id=default_account_id,
    )

    product = row_value(row, "product", "instrument", "security", "nazwa")
    isin = row_value(row, "isin")
    symbol = row_value(row, "symbol", "ticker") or _extract_degiro_ticker(product, isin)
    asset_id = _ensure_asset(state, token=symbol, created=created) if symbol else ""

    buy_markers = ("buy", "koop", "kupno", "purchase", "kauf")
    sell_markers = ("sell", "sprzedaz", "verkoop", "vente")
    dividend_markers = ("dividend",)
    deposit_markers = ("deposit", "wplata", "storting")
    withdraw_markers = ("withdraw", "withdrawal", "wyplata", "transfer out")

    op_type = _normalize_operation_type(action_raw)
    if any(marker in action for marker in buy_markers):
        op_type = "Kupno waloru"
    elif any(marker in action for marker in sell_markers):
        op_type = "Sprzedaż waloru"
    elif any(marker in action for marker in dividend_markers):
        op_type = "Dywidenda"
    elif any(marker in action for marker in deposit_markers):
        op_type = "Operacja gotówkowa"
    elif any(marker in action for marker in withdraw_markers):
        op_type = "Przelew gotówkowy"
    elif asset_id and raw_quantity > 0:
        op_type = "Kupno waloru"
    elif asset_id and raw_quantity < 0:
        op_type = "Sprzedaż waloru"

    if op_type in ("Kupno waloru", "Sprzedaż waloru"):
        if quantity <= 0 and price > 0 and amount != 0:
            quantity = abs(amount / price) if price else 0.0
        if amount == 0 and quantity > 0 and price > 0:
            amount = quantity * price
        else:
            amount = abs(amount)

    return {
        "id": make_id("op"),
        "date": normalize_date(row_value(row, "date", "data", "time", "executiondate", "tradedate")),
        "type": op_type,
        "portfolioId": portfolio_id,
        "accountId": account_id,
        "assetId": asset_id,
        "targetAssetId": "",
        "quantity": quantity,
        "targetQuantity": 0.0,
        "price": price,
        "amount": amount,
        "fee": fee,
        "currency": currency,
        "tags": ["degiro"],
        "note": row_value(row, "comment", "description", "notatka"),
        "createdAt": now_iso(),
    }


def _ensure_portfolio(
    state: Dict[str, Any],
    *,
    preferred_id: str = "",
    preferred_name: str = "",
    created: Dict[str, int],
    fallback_id: str = "",
) -> str:
    if preferred_id:
        for row in state["portfolios"]:
            if row["id"] == preferred_id:
                return row["id"]
    if preferred_name:
        wanted = preferred_name.strip().lower()
        for row in state["portfolios"]:
            if row["name"].strip().lower() == wanted:
                return row["id"]
    if fallback_id:
        for row in state["portfolios"]:
            if row["id"] == fallback_id:
                return row["id"]
    if state["portfolios"]:
        return state["portfolios"][0]["id"]

    created_row = {
        "id": make_id("ptf"),
        "name": text_or_fallback(preferred_name, "Import"),
        "currency": state["meta"]["baseCurrency"],
        "benchmark": "",
        "goal": "",
        "parentId": "",
        "twinOf": "",
        "groupName": "",
        "isPublic": False,
        "createdAt": now_iso(),
    }
    state["portfolios"].append(created_row)
    created["portfolios"] += 1
    return created_row["id"]


def _ensure_account(
    state: Dict[str, Any],
    *,
    preferred_id: str = "",
    preferred_name: str = "",
    created: Dict[str, int],
    fallback_id: str = "",
) -> str:
    if preferred_id:
        for row in state["accounts"]:
            if row["id"] == preferred_id:
                return row["id"]
    if preferred_name:
        wanted = preferred_name.strip().lower()
        for row in state["accounts"]:
            if row["name"].strip().lower() == wanted:
                return row["id"]
    if fallback_id:
        for row in state["accounts"]:
            if row["id"] == fallback_id:
                return row["id"]
    if state["accounts"]:
        return state["accounts"][0]["id"]

    created_row = {
        "id": make_id("acc"),
        "name": text_or_fallback(preferred_name, "Konto importu"),
        "type": "Broker",
        "currency": state["meta"]["baseCurrency"],
        "createdAt": now_iso(),
    }
    state["accounts"].append(created_row)
    created["accounts"] += 1
    return created_row["id"]


def _ensure_asset(state: Dict[str, Any], *, token: str, created: Dict[str, int]) -> str:
    text = str(token or "").strip()
    if not text:
        return ""
    lookup = text.lower()
    for row in state["assets"]:
        if row["id"] == text:
            return row["id"]
        if row["ticker"].lower() == lookup or row["name"].lower() == lookup:
            return row["id"]
    created_row = {
        "id": make_id("ast"),
        "ticker": text.upper(),
        "name": text.upper(),
        "type": "Inny",
        "currency": state["meta"]["baseCurrency"],
        "currentPrice": 0.0,
        "risk": 5.0,
        "sector": "",
        "industry": "",
        "tags": [],
        "benchmark": "",
        "createdAt": now_iso(),
    }
    state["assets"].append(created_row)
    created["assets"] += 1
    return created_row["id"]


def _normalize_operation_type(raw: str) -> str:
    text = _simplify_text(raw)
    if any(word in text for word in ["kupno", "buy"]):
        return "Kupno waloru"
    if any(word in text for word in ["sprzedaz", "sell"]):
        return "Sprzedaż waloru"
    if any(word in text for word in ["dywid", "dividend"]):
        return "Dywidenda"
    if any(word in text for word in ["przelew", "transfer", "withdraw"]):
        return "Przelew gotówkowy"
    if any(word in text for word in ["gotowk", "deposit", "wplata"]):
        return "Operacja gotówkowa"
    if any(word in text for word in ["lokat"]):
        return "Lokata"
    if any(word in text for word in ["pozyczk", "loan"]):
        return "Pożyczka społecznościowa"
    if any(word in text for word in ["konwers", "conversion"]):
        return "Konwersja walorów"
    if any(word in text for word in ["zobowiaz"]):
        return "Zobowiązanie"
    if any(word in text for word in ["prowiz", "commission"]):
        return "Prowizja"
    if any(word in text for word in ["odset"]):
        return "Odsetki"
    return "Import operacji"


def _extract_degiro_ticker(product: str, isin: str) -> str:
    source = str(product or "").strip()
    if not source:
        return str(isin or "").strip().upper()
    match = re.search(r"\(([A-Za-z0-9._-]{1,12})\)", source)
    if match:
        candidate = match.group(1).upper().strip()
        if candidate:
            return candidate

    separators = re.compile(r"[\s,;:/\\|+\-]+")
    stop_words = {
        "INC",
        "PLC",
        "ETF",
        "SA",
        "NV",
        "CORP",
        "CLASS",
        "SHARES",
        "COMMON",
        "USD",
        "EUR",
        "PLN",
    }
    for token in separators.split(source.upper()):
        token = token.strip()
        if not token or any(ch.isdigit() for ch in token):
            continue
        if token in stop_words:
            continue
        if 1 <= len(token) <= 8:
            return token
    return str(isin or "").strip().upper()


def _pick_delimiter(text: str) -> str:
    first = text.splitlines()[0] if text.splitlines() else ""
    options = [",", ";", "|", "\t"]
    best = ","
    best_count = 0
    for option in options:
        count = first.count(option)
        if count > best_count:
            best = option
            best_count = count
    return best


def _normalize_key(value: str) -> str:
    text = _simplify_text(value)
    return "".join(ch for ch in text if ch.isalnum())


def _simplify_text(value: str) -> str:
    raw = str(value or "").strip().lower()
    normalized = unicodedata.normalize("NFKD", raw)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))

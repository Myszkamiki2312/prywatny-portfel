"""SQLite storage adapter for Prywatny Portfel backend."""

from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from .state_model import default_state, normalize_state


class Database:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()
        self._seed_if_empty()

    def _init_schema(self) -> None:
        schema = """
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = OFF;

        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS portfolios (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            currency TEXT NOT NULL,
            benchmark TEXT NOT NULL,
            goal TEXT NOT NULL,
            parent_id TEXT NOT NULL,
            twin_of TEXT NOT NULL,
            group_name TEXT NOT NULL,
            is_public INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            currency TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            ticker TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            currency TEXT NOT NULL,
            current_price REAL NOT NULL,
            risk REAL NOT NULL,
            sector TEXT NOT NULL,
            industry TEXT NOT NULL,
            tags_json TEXT NOT NULL,
            benchmark TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS operations (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            portfolio_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            asset_id TEXT NOT NULL,
            target_asset_id TEXT NOT NULL,
            quantity REAL NOT NULL,
            target_quantity REAL NOT NULL,
            price REAL NOT NULL,
            amount REAL NOT NULL,
            fee REAL NOT NULL,
            currency TEXT NOT NULL,
            tags_json TEXT NOT NULL,
            note TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recurring_ops (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            frequency TEXT NOT NULL,
            start_date TEXT NOT NULL,
            amount REAL NOT NULL,
            portfolio_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            asset_id TEXT NOT NULL,
            currency TEXT NOT NULL,
            last_generated_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS liabilities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            rate REAL NOT NULL,
            due_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            asset_id TEXT NOT NULL,
            direction TEXT NOT NULL,
            target_price REAL NOT NULL,
            created_at TEXT NOT NULL,
            last_trigger_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS strategies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS favorites (
            asset_id TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS quotes (
            ticker TEXT PRIMARY KEY,
            price REAL NOT NULL,
            currency TEXT NOT NULL,
            provider TEXT NOT NULL,
            fetched_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS import_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            broker TEXT NOT NULL,
            file_name TEXT NOT NULL,
            row_count INTEGER NOT NULL,
            imported_count INTEGER NOT NULL,
            status TEXT NOT NULL,
            message TEXT NOT NULL,
            imported_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS alert_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id TEXT NOT NULL,
            asset_id TEXT NOT NULL,
            ticker TEXT NOT NULL,
            direction TEXT NOT NULL,
            target_price REAL NOT NULL,
            current_price REAL NOT NULL,
            status TEXT NOT NULL,
            message TEXT NOT NULL,
            event_time TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS alert_notification_state (
            alert_id TEXT PRIMARY KEY,
            last_sent_at TEXT NOT NULL,
            last_status TEXT NOT NULL,
            last_message TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notification_dispatches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id TEXT NOT NULL,
            channel TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            dispatched_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS forum_posts (
            id TEXT PRIMARY KEY,
            ticker TEXT NOT NULL,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS option_positions (
            id TEXT PRIMARY KEY,
            ticker TEXT NOT NULL,
            option_type TEXT NOT NULL,
            strike REAL NOT NULL,
            expiry_date TEXT NOT NULL,
            premium REAL NOT NULL,
            contracts REAL NOT NULL,
            multiplier REAL NOT NULL,
            underlying_price REAL NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS backup_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger TEXT NOT NULL,
            status TEXT NOT NULL,
            state_file TEXT NOT NULL,
            db_file TEXT NOT NULL,
            state_size INTEGER NOT NULL,
            db_size INTEGER NOT NULL,
            verified INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
        with self._lock:
            self._conn.executescript(schema)
            self._conn.commit()

    def _seed_if_empty(self) -> None:
        with self._lock:
            row = self._conn.execute("SELECT COUNT(*) AS count FROM portfolios").fetchone()
            if row and row["count"] > 0:
                return
        self.replace_state(default_state())

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def get_meta_value(self, key: str, default: str = "") -> str:
        with self._lock:
            row = self._conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        if row is None:
            return default
        return str(row["value"])

    def set_meta_value(self, key: str, value: str) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO meta (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, value),
            )
            self._conn.commit()

    def get_meta_json(self, key: str, default: Dict[str, Any]) -> Dict[str, Any]:
        raw = self.get_meta_value(key, "")
        if not raw:
            return dict(default)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return dict(default)
        if not isinstance(parsed, dict):
            return dict(default)
        merged = dict(default)
        merged.update(parsed)
        return merged

    def set_meta_json(self, key: str, payload: Dict[str, Any]) -> None:
        self.set_meta_value(key, json.dumps(payload, ensure_ascii=False))

    def get_realtime_config(self) -> Dict[str, Any]:
        default = {
            "enabled": False,
            "intervalMinutes": 15,
            "autoRefreshQuotes": True,
            "portfolioId": "",
            "webhookSecret": "",
        }
        config = self.get_meta_json("realtimeConfig", default)
        config["enabled"] = bool(config.get("enabled"))
        config["intervalMinutes"] = max(1, min(24 * 60, _to_int(config.get("intervalMinutes"), 15)))
        config["autoRefreshQuotes"] = bool(config.get("autoRefreshQuotes", True))
        config["portfolioId"] = str(config.get("portfolioId") or "")
        config["webhookSecret"] = str(config.get("webhookSecret") or "")
        return config

    def set_realtime_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        payload = {
            "enabled": bool(config.get("enabled")),
            "intervalMinutes": max(1, min(24 * 60, _to_int(config.get("intervalMinutes"), 15))),
            "autoRefreshQuotes": bool(config.get("autoRefreshQuotes", True)),
            "portfolioId": str(config.get("portfolioId") or ""),
            "webhookSecret": str(config.get("webhookSecret") or ""),
        }
        self.set_meta_json("realtimeConfig", payload)
        return payload

    def get_backup_config(self) -> Dict[str, Any]:
        default = {
            "enabled": False,
            "intervalMinutes": 12 * 60,
            "keepLast": 30,
            "verifyAfterBackup": True,
            "includeStateJson": True,
            "includeDbCopy": True,
        }
        config = self.get_meta_json("backupConfig", default)
        config["enabled"] = bool(config.get("enabled"))
        config["intervalMinutes"] = max(1, min(30 * 24 * 60, _to_int(config.get("intervalMinutes"), default["intervalMinutes"])))
        config["keepLast"] = max(1, min(2000, _to_int(config.get("keepLast"), default["keepLast"])))
        config["verifyAfterBackup"] = bool(config.get("verifyAfterBackup", True))
        config["includeStateJson"] = bool(config.get("includeStateJson", True))
        config["includeDbCopy"] = bool(config.get("includeDbCopy", True))
        return config

    def set_backup_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        current = self.get_backup_config()
        payload = {
            "enabled": bool(config.get("enabled", current["enabled"])),
            "intervalMinutes": max(
                1,
                min(30 * 24 * 60, _to_int(config.get("intervalMinutes"), current["intervalMinutes"])),
            ),
            "keepLast": max(1, min(2000, _to_int(config.get("keepLast"), current["keepLast"]))),
            "verifyAfterBackup": bool(config.get("verifyAfterBackup", current["verifyAfterBackup"])),
            "includeStateJson": bool(config.get("includeStateJson", current["includeStateJson"])),
            "includeDbCopy": bool(config.get("includeDbCopy", current["includeDbCopy"])),
        }
        self.set_meta_json("backupConfig", payload)
        return payload

    def get_notification_config(self) -> Dict[str, Any]:
        default = {
            "enabled": False,
            "cooldownMinutes": 60,
            "email": {
                "enabled": False,
                "smtpHost": "",
                "smtpPort": 587,
                "username": "",
                "password": "",
                "from": "",
                "to": "",
                "useTls": True,
            },
            "telegram": {
                "enabled": False,
                "botToken": "",
                "chatId": "",
            },
        }
        config = self.get_meta_json("notificationConfig", default)
        email_config = config.get("email")
        if not isinstance(email_config, dict):
            email_config = {}
        telegram_config = config.get("telegram")
        if not isinstance(telegram_config, dict):
            telegram_config = {}
        merged = {
            "enabled": bool(config.get("enabled")),
            "cooldownMinutes": max(1, min(7 * 24 * 60, _to_int(config.get("cooldownMinutes"), 60))),
            "email": {
                "enabled": bool(email_config.get("enabled")),
                "smtpHost": str(email_config.get("smtpHost") or ""),
                "smtpPort": max(1, min(65535, _to_int(email_config.get("smtpPort"), 587))),
                "username": str(email_config.get("username") or ""),
                "password": str(email_config.get("password") or ""),
                "from": str(email_config.get("from") or ""),
                "to": str(email_config.get("to") or ""),
                "useTls": bool(email_config.get("useTls", True)),
            },
            "telegram": {
                "enabled": bool(telegram_config.get("enabled")),
                "botToken": str(telegram_config.get("botToken") or ""),
                "chatId": str(telegram_config.get("chatId") or ""),
            },
        }
        return merged

    def set_notification_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        payload = self.get_notification_config()
        payload["enabled"] = bool(config.get("enabled", payload["enabled"]))
        payload["cooldownMinutes"] = max(
            1,
            min(7 * 24 * 60, _to_int(config.get("cooldownMinutes"), payload["cooldownMinutes"])),
        )
        email_input = config.get("email") if isinstance(config.get("email"), dict) else {}
        telegram_input = config.get("telegram") if isinstance(config.get("telegram"), dict) else {}
        payload["email"].update(
            {
                "enabled": bool(email_input.get("enabled", payload["email"]["enabled"])),
                "smtpHost": str(email_input.get("smtpHost", payload["email"]["smtpHost"]) or ""),
                "smtpPort": max(
                    1,
                    min(65535, _to_int(email_input.get("smtpPort"), payload["email"]["smtpPort"])),
                ),
                "username": str(email_input.get("username", payload["email"]["username"]) or ""),
                "password": str(email_input.get("password", payload["email"]["password"]) or ""),
                "from": str(email_input.get("from", payload["email"]["from"]) or ""),
                "to": str(email_input.get("to", payload["email"]["to"]) or ""),
                "useTls": bool(email_input.get("useTls", payload["email"]["useTls"])),
            }
        )
        payload["telegram"].update(
            {
                "enabled": bool(telegram_input.get("enabled", payload["telegram"]["enabled"])),
                "botToken": str(telegram_input.get("botToken", payload["telegram"]["botToken"]) or ""),
                "chatId": str(telegram_input.get("chatId", payload["telegram"]["chatId"]) or ""),
            }
        )
        self.set_meta_json("notificationConfig", payload)
        return payload

    def get_state(self) -> Dict[str, Any]:
        with self._lock:
            meta_rows = self._conn.execute("SELECT key, value FROM meta").fetchall()
            meta = {row["key"]: row["value"] for row in meta_rows}

            portfolios = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "currency": row["currency"],
                    "benchmark": row["benchmark"],
                    "goal": row["goal"],
                    "parentId": row["parent_id"],
                    "twinOf": row["twin_of"],
                    "groupName": row["group_name"],
                    "isPublic": bool(row["is_public"]),
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM portfolios ORDER BY created_at ASC").fetchall()
            ]

            accounts = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"],
                    "currency": row["currency"],
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM accounts ORDER BY created_at ASC").fetchall()
            ]

            assets = [
                {
                    "id": row["id"],
                    "ticker": row["ticker"],
                    "name": row["name"],
                    "type": row["type"],
                    "currency": row["currency"],
                    "currentPrice": row["current_price"],
                    "risk": row["risk"],
                    "sector": row["sector"],
                    "industry": row["industry"],
                    "tags": _json_loads_list(row["tags_json"]),
                    "benchmark": row["benchmark"],
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM assets ORDER BY created_at ASC").fetchall()
            ]

            operations = [
                {
                    "id": row["id"],
                    "date": row["date"],
                    "type": row["type"],
                    "portfolioId": row["portfolio_id"],
                    "accountId": row["account_id"],
                    "assetId": row["asset_id"],
                    "targetAssetId": row["target_asset_id"],
                    "quantity": row["quantity"],
                    "targetQuantity": row["target_quantity"],
                    "price": row["price"],
                    "amount": row["amount"],
                    "fee": row["fee"],
                    "currency": row["currency"],
                    "tags": _json_loads_list(row["tags_json"]),
                    "note": row["note"],
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM operations ORDER BY date ASC, created_at ASC").fetchall()
            ]

            recurring_ops = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"],
                    "frequency": row["frequency"],
                    "startDate": row["start_date"],
                    "amount": row["amount"],
                    "portfolioId": row["portfolio_id"],
                    "accountId": row["account_id"],
                    "assetId": row["asset_id"],
                    "currency": row["currency"],
                    "lastGeneratedDate": row["last_generated_date"],
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM recurring_ops ORDER BY created_at ASC").fetchall()
            ]

            liabilities = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "amount": row["amount"],
                    "currency": row["currency"],
                    "rate": row["rate"],
                    "dueDate": row["due_date"],
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM liabilities ORDER BY created_at ASC").fetchall()
            ]

            alerts = [
                {
                    "id": row["id"],
                    "assetId": row["asset_id"],
                    "direction": row["direction"],
                    "targetPrice": row["target_price"],
                    "createdAt": row["created_at"],
                    "lastTriggerAt": row["last_trigger_at"],
                }
                for row in self._conn.execute("SELECT * FROM alerts ORDER BY created_at DESC").fetchall()
            ]

            notes = [
                {
                    "id": row["id"],
                    "content": row["content"],
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM notes ORDER BY created_at DESC").fetchall()
            ]

            strategies = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"],
                    "createdAt": row["created_at"],
                }
                for row in self._conn.execute("SELECT * FROM strategies ORDER BY created_at DESC").fetchall()
            ]

            favorites = [
                row["asset_id"]
                for row in self._conn.execute("SELECT asset_id FROM favorites ORDER BY asset_id ASC").fetchall()
            ]

        merged = {
            "meta": {
                "activePlan": meta.get("activePlan", "Expert"),
                "baseCurrency": meta.get("baseCurrency", "PLN"),
                "createdAt": meta.get("createdAt", ""),
            },
            "portfolios": portfolios,
            "accounts": accounts,
            "assets": assets,
            "operations": operations,
            "recurringOps": recurring_ops,
            "liabilities": liabilities,
            "alerts": alerts,
            "notes": notes,
            "strategies": strategies,
            "favorites": favorites,
        }
        return normalize_state(merged)

    def replace_state(self, state_payload: Dict[str, Any]) -> Dict[str, Any]:
        state = normalize_state(state_payload)
        with self._lock:
            cursor = self._conn.cursor()
            cursor.execute("BEGIN")
            meta_rows = cursor.execute("SELECT key, value FROM meta").fetchall()
            preserved_meta = {
                row["key"]: row["value"]
                for row in meta_rows
                if row["key"] not in {"activePlan", "baseCurrency", "createdAt"}
            }
            for table in [
                "meta",
                "portfolios",
                "accounts",
                "assets",
                "operations",
                "recurring_ops",
                "liabilities",
                "alerts",
                "notes",
                "strategies",
                "favorites",
            ]:
                cursor.execute(f"DELETE FROM {table}")

            for key, value in state["meta"].items():
                cursor.execute("INSERT INTO meta (key, value) VALUES (?, ?)", (key, str(value)))
            for key, value in preserved_meta.items():
                cursor.execute("INSERT INTO meta (key, value) VALUES (?, ?)", (key, str(value)))

            for item in state["portfolios"]:
                cursor.execute(
                    """
                    INSERT INTO portfolios
                    (id, name, currency, benchmark, goal, parent_id, twin_of, group_name, is_public, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["name"],
                        item["currency"],
                        item["benchmark"],
                        item["goal"],
                        item["parentId"],
                        item["twinOf"],
                        item["groupName"],
                        1 if item["isPublic"] else 0,
                        item["createdAt"],
                    ),
                )

            for item in state["accounts"]:
                cursor.execute(
                    "INSERT INTO accounts (id, name, type, currency, created_at) VALUES (?, ?, ?, ?, ?)",
                    (item["id"], item["name"], item["type"], item["currency"], item["createdAt"]),
                )

            for item in state["assets"]:
                cursor.execute(
                    """
                    INSERT INTO assets
                    (id, ticker, name, type, currency, current_price, risk, sector, industry, tags_json, benchmark, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["ticker"],
                        item["name"],
                        item["type"],
                        item["currency"],
                        item["currentPrice"],
                        item["risk"],
                        item["sector"],
                        item["industry"],
                        json.dumps(item["tags"], ensure_ascii=False),
                        item["benchmark"],
                        item["createdAt"],
                    ),
                )

            for item in state["operations"]:
                cursor.execute(
                    """
                    INSERT INTO operations
                    (id, date, type, portfolio_id, account_id, asset_id, target_asset_id, quantity, target_quantity, price, amount, fee, currency, tags_json, note, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["date"],
                        item["type"],
                        item["portfolioId"],
                        item["accountId"],
                        item["assetId"],
                        item["targetAssetId"],
                        item["quantity"],
                        item["targetQuantity"],
                        item["price"],
                        item["amount"],
                        item["fee"],
                        item["currency"],
                        json.dumps(item["tags"], ensure_ascii=False),
                        item["note"],
                        item["createdAt"],
                    ),
                )

            for item in state["recurringOps"]:
                cursor.execute(
                    """
                    INSERT INTO recurring_ops
                    (id, name, type, frequency, start_date, amount, portfolio_id, account_id, asset_id, currency, last_generated_date, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["name"],
                        item["type"],
                        item["frequency"],
                        item["startDate"],
                        item["amount"],
                        item["portfolioId"],
                        item["accountId"],
                        item["assetId"],
                        item["currency"],
                        item["lastGeneratedDate"],
                        item["createdAt"],
                    ),
                )

            for item in state["liabilities"]:
                cursor.execute(
                    """
                    INSERT INTO liabilities
                    (id, name, amount, currency, rate, due_date, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["name"],
                        item["amount"],
                        item["currency"],
                        item["rate"],
                        item["dueDate"],
                        item["createdAt"],
                    ),
                )

            for item in state["alerts"]:
                cursor.execute(
                    """
                    INSERT INTO alerts
                    (id, asset_id, direction, target_price, created_at, last_trigger_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["assetId"],
                        item["direction"],
                        item["targetPrice"],
                        item["createdAt"],
                        item["lastTriggerAt"],
                    ),
                )

            for item in state["notes"]:
                cursor.execute(
                    "INSERT INTO notes (id, content, created_at) VALUES (?, ?, ?)",
                    (item["id"], item["content"], item["createdAt"]),
                )

            for item in state["strategies"]:
                cursor.execute(
                    "INSERT INTO strategies (id, name, description, created_at) VALUES (?, ?, ?, ?)",
                    (item["id"], item["name"], item["description"], item["createdAt"]),
                )

            for asset_id in state["favorites"]:
                cursor.execute("INSERT INTO favorites (asset_id) VALUES (?)", (asset_id,))

            self._conn.commit()
        return state

    def upsert_quotes(self, quotes: List[Dict[str, Any]]) -> None:
        with self._lock:
            for item in quotes:
                self._conn.execute(
                    """
                    INSERT INTO quotes (ticker, price, currency, provider, fetched_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(ticker) DO UPDATE SET
                        price = excluded.price,
                        currency = excluded.currency,
                        provider = excluded.provider,
                        fetched_at = excluded.fetched_at
                    """,
                    (
                        item.get("ticker", ""),
                        float(item.get("price", 0)),
                        str(item.get("currency", "PLN")),
                        str(item.get("provider", "unknown")),
                        str(item.get("fetched_at", "")),
                    ),
                )
            self._conn.commit()

    def get_quotes(self, tickers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        with self._lock:
            if tickers:
                placeholders = ",".join("?" for _ in tickers)
                rows = self._conn.execute(
                    f"SELECT * FROM quotes WHERE ticker IN ({placeholders}) ORDER BY ticker ASC",
                    tickers,
                ).fetchall()
            else:
                rows = self._conn.execute("SELECT * FROM quotes ORDER BY ticker ASC").fetchall()
        return [
            {
                "ticker": row["ticker"],
                "price": row["price"],
                "currency": row["currency"],
                "provider": row["provider"],
                "fetchedAt": row["fetched_at"],
            }
            for row in rows
        ]

    def log_import(
        self,
        *,
        broker: str,
        file_name: str,
        row_count: int,
        imported_count: int,
        status: str,
        message: str,
        imported_at: str,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO import_logs
                (broker, file_name, row_count, imported_count, status, message, imported_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (broker, file_name, row_count, imported_count, status, message, imported_at),
            )
            self._conn.commit()

    def list_import_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM import_logs ORDER BY id DESC LIMIT ?",
                (max(1, min(limit, 200)),),
            ).fetchall()
        return [
            {
                "id": row["id"],
                "broker": row["broker"],
                "fileName": row["file_name"],
                "rowCount": row["row_count"],
                "importedCount": row["imported_count"],
                "status": row["status"],
                "message": row["message"],
                "importedAt": row["imported_at"],
            }
            for row in rows
        ]

    def log_alert_event(
        self,
        *,
        alert_id: str,
        asset_id: str,
        ticker: str,
        direction: str,
        target_price: float,
        current_price: float,
        status: str,
        message: str,
        event_time: str,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO alert_events
                (alert_id, asset_id, ticker, direction, target_price, current_price, status, message, event_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert_id,
                    asset_id,
                    ticker,
                    direction,
                    float(target_price),
                    float(current_price),
                    status,
                    message,
                    event_time,
                ),
            )
            self._conn.commit()

    def list_alert_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM alert_events ORDER BY id DESC LIMIT ?",
                (max(1, min(limit, 1000)),),
            ).fetchall()
        return [
            {
                "id": row["id"],
                "alertId": row["alert_id"],
                "assetId": row["asset_id"],
                "ticker": row["ticker"],
                "direction": row["direction"],
                "targetPrice": row["target_price"],
                "currentPrice": row["current_price"],
                "status": row["status"],
                "message": row["message"],
                "eventTime": row["event_time"],
            }
            for row in rows
        ]

    def get_alert_notification_state(self, alert_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM alert_notification_state WHERE alert_id = ?",
                (alert_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "alertId": row["alert_id"],
            "lastSentAt": row["last_sent_at"],
            "lastStatus": row["last_status"],
            "lastMessage": row["last_message"],
        }

    def upsert_alert_notification_state(
        self,
        *,
        alert_id: str,
        last_sent_at: str,
        last_status: str,
        last_message: str,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO alert_notification_state (alert_id, last_sent_at, last_status, last_message)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(alert_id) DO UPDATE SET
                    last_sent_at = excluded.last_sent_at,
                    last_status = excluded.last_status,
                    last_message = excluded.last_message
                """,
                (alert_id, last_sent_at, last_status, last_message),
            )
            self._conn.commit()

    def log_notification_dispatch(
        self,
        *,
        alert_id: str,
        channel: str,
        status: str,
        message: str,
        payload_json: str,
        dispatched_at: str,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO notification_dispatches
                (alert_id, channel, status, message, payload_json, dispatched_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (alert_id, channel, status, message, payload_json, dispatched_at),
            )
            self._conn.commit()

    def list_notification_dispatches(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM notification_dispatches ORDER BY id DESC LIMIT ?",
                (max(1, min(limit, 1000)),),
            ).fetchall()
        return [
            {
                "id": row["id"],
                "alertId": row["alert_id"],
                "channel": row["channel"],
                "status": row["status"],
                "message": row["message"],
                "payloadJson": row["payload_json"],
                "dispatchedAt": row["dispatched_at"],
            }
            for row in rows
        ]

    def list_forum_posts(self, *, ticker: str = "", limit: int = 200) -> List[Dict[str, Any]]:
        ticker = str(ticker or "").strip().upper()
        with self._lock:
            if ticker:
                rows = self._conn.execute(
                    """
                    SELECT * FROM forum_posts
                    WHERE ticker = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (ticker, max(1, min(limit, 2000))),
                ).fetchall()
            else:
                rows = self._conn.execute(
                    "SELECT * FROM forum_posts ORDER BY created_at DESC LIMIT ?",
                    (max(1, min(limit, 2000)),),
                ).fetchall()
        return [
            {
                "id": row["id"],
                "ticker": row["ticker"],
                "author": row["author"],
                "content": row["content"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ]

    def upsert_forum_post(
        self,
        *,
        post_id: str,
        ticker: str,
        author: str,
        content: str,
        created_at: str,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO forum_posts (id, ticker, author, content, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    ticker = excluded.ticker,
                    author = excluded.author,
                    content = excluded.content,
                    created_at = excluded.created_at
                """,
                (post_id, ticker, author, content, created_at),
            )
            self._conn.commit()

    def delete_forum_post(self, post_id: str) -> bool:
        with self._lock:
            cursor = self._conn.execute("DELETE FROM forum_posts WHERE id = ?", (post_id,))
            self._conn.commit()
        return cursor.rowcount > 0

    def list_option_positions(self, limit: int = 500) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM option_positions ORDER BY created_at DESC LIMIT ?",
                (max(1, min(limit, 5000)),),
            ).fetchall()
        return [
            {
                "id": row["id"],
                "ticker": row["ticker"],
                "optionType": row["option_type"],
                "strike": row["strike"],
                "expiryDate": row["expiry_date"],
                "premium": row["premium"],
                "contracts": row["contracts"],
                "multiplier": row["multiplier"],
                "underlyingPrice": row["underlying_price"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ]

    def upsert_option_position(
        self,
        *,
        position_id: str,
        ticker: str,
        option_type: str,
        strike: float,
        expiry_date: str,
        premium: float,
        contracts: float,
        multiplier: float,
        underlying_price: float,
        created_at: str,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO option_positions
                (id, ticker, option_type, strike, expiry_date, premium, contracts, multiplier, underlying_price, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    ticker = excluded.ticker,
                    option_type = excluded.option_type,
                    strike = excluded.strike,
                    expiry_date = excluded.expiry_date,
                    premium = excluded.premium,
                    contracts = excluded.contracts,
                    multiplier = excluded.multiplier,
                    underlying_price = excluded.underlying_price,
                    created_at = excluded.created_at
                """,
                (
                    position_id,
                    ticker,
                    option_type,
                    float(strike),
                    expiry_date,
                    float(premium),
                    float(contracts),
                    float(multiplier),
                    float(underlying_price),
                    created_at,
                ),
            )
            self._conn.commit()

    def delete_option_position(self, position_id: str) -> bool:
        with self._lock:
            cursor = self._conn.execute("DELETE FROM option_positions WHERE id = ?", (position_id,))
            self._conn.commit()
        return cursor.rowcount > 0

    def backup_to_file(self, target_path: Path) -> None:
        destination = Path(target_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            dest_conn = sqlite3.connect(str(destination))
            try:
                self._conn.backup(dest_conn)
                dest_conn.commit()
            finally:
                dest_conn.close()

    def log_backup_run(
        self,
        *,
        trigger: str,
        status: str,
        state_file: str,
        db_file: str,
        state_size: int,
        db_size: int,
        verified: bool,
        message: str,
        created_at: str,
    ) -> Dict[str, Any]:
        with self._lock:
            cursor = self._conn.execute(
                """
                INSERT INTO backup_runs
                (trigger, status, state_file, db_file, state_size, db_size, verified, message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(trigger or "manual"),
                    str(status or "success"),
                    str(state_file or ""),
                    str(db_file or ""),
                    max(0, _to_int(state_size, 0)),
                    max(0, _to_int(db_size, 0)),
                    1 if verified else 0,
                    str(message or ""),
                    str(created_at or ""),
                ),
            )
            self._conn.commit()
            row_id = cursor.lastrowid
            row = self._conn.execute("SELECT * FROM backup_runs WHERE id = ?", (row_id,)).fetchone()
        if row is None:
            return {}
        return {
            "id": row["id"],
            "trigger": row["trigger"],
            "status": row["status"],
            "stateFile": row["state_file"],
            "dbFile": row["db_file"],
            "stateSize": row["state_size"],
            "dbSize": row["db_size"],
            "verified": bool(row["verified"]),
            "message": row["message"],
            "createdAt": row["created_at"],
        }

    def list_backup_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM backup_runs ORDER BY id DESC LIMIT ?",
                (max(1, min(limit, 2000)),),
            ).fetchall()
        return [
            {
                "id": row["id"],
                "trigger": row["trigger"],
                "status": row["status"],
                "stateFile": row["state_file"],
                "dbFile": row["db_file"],
                "stateSize": row["state_size"],
                "dbSize": row["db_size"],
                "verified": bool(row["verified"]),
                "message": row["message"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ]

    def get_last_backup_run(self, *, status: str = "") -> Dict[str, Any]:
        filter_status = str(status or "").strip().lower()
        with self._lock:
            if filter_status:
                row = self._conn.execute(
                    "SELECT * FROM backup_runs WHERE lower(status) = ? ORDER BY id DESC LIMIT 1",
                    (filter_status,),
                ).fetchone()
            else:
                row = self._conn.execute(
                    "SELECT * FROM backup_runs ORDER BY id DESC LIMIT 1",
                ).fetchone()
        if row is None:
            return {}
        return {
            "id": row["id"],
            "trigger": row["trigger"],
            "status": row["status"],
            "stateFile": row["state_file"],
            "dbFile": row["db_file"],
            "stateSize": row["state_size"],
            "dbSize": row["db_size"],
            "verified": bool(row["verified"]),
            "message": row["message"],
            "createdAt": row["created_at"],
        }


def _json_loads_list(value: Any) -> List[Any]:
    if value is None:
        return []
    text = str(value)
    if not text:
        return []
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def _to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

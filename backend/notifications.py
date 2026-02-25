"""Notification dispatch service (email + Telegram)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import smtplib
from email.message import EmailMessage
import ssl
from typing import Any, Dict, List, Optional
import urllib.parse
import urllib.request

from .database import Database


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_num(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip().replace(" ", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def _parse_iso(value: str) -> Optional[datetime]:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


class NotificationService:
    def __init__(self, database: Database):
        self.database = database

    def get_config(self) -> Dict[str, Any]:
        return self.database.get_notification_config()

    def set_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return self.database.set_notification_config(config)

    def dispatch_triggered(
        self,
        *,
        triggered_rows: List[Dict[str, Any]],
        source: str,
    ) -> Dict[str, Any]:
        config = self.database.get_notification_config()
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        summary = {
            "enabled": bool(config.get("enabled")),
            "source": source,
            "sent": 0,
            "skippedCooldown": 0,
            "skippedDisabled": 0,
            "errors": 0,
            "items": [],
        }

        if not config.get("enabled"):
            summary["skippedDisabled"] = len(triggered_rows)
            return summary

        cooldown_minutes = max(1, int(config.get("cooldownMinutes", 60)))
        cooldown_delta = timedelta(minutes=cooldown_minutes)

        for row in triggered_rows:
            alert_id = str(row.get("alertId") or "")
            if not alert_id:
                continue

            state = self.database.get_alert_notification_state(alert_id)
            if state and state.get("lastSentAt"):
                previous = _parse_iso(state["lastSentAt"])
                if previous and now - previous < cooldown_delta:
                    summary["skippedCooldown"] += 1
                    summary["items"].append(
                        {
                            "alertId": alert_id,
                            "status": "cooldown",
                            "message": f"Cooldown {cooldown_minutes}m",
                        }
                    )
                    continue

            message = self._build_message(row=row, source=source)
            sent_channels = []
            channel_errors = []

            email_cfg = config.get("email") if isinstance(config.get("email"), dict) else {}
            telegram_cfg = config.get("telegram") if isinstance(config.get("telegram"), dict) else {}

            if email_cfg.get("enabled"):
                ok, info = self._send_email(email_cfg, message)
                self._log_dispatch(
                    alert_id=alert_id,
                    channel="email",
                    status="sent" if ok else "error",
                    message=info,
                    payload=message,
                    dispatched_at=now_iso,
                )
                if ok:
                    sent_channels.append("email")
                else:
                    channel_errors.append(info)

            if telegram_cfg.get("enabled"):
                ok, info = self._send_telegram(telegram_cfg, message)
                self._log_dispatch(
                    alert_id=alert_id,
                    channel="telegram",
                    status="sent" if ok else "error",
                    message=info,
                    payload=message,
                    dispatched_at=now_iso,
                )
                if ok:
                    sent_channels.append("telegram")
                else:
                    channel_errors.append(info)

            if sent_channels:
                summary["sent"] += 1
                summary["items"].append(
                    {
                        "alertId": alert_id,
                        "status": "sent",
                        "channels": sent_channels,
                    }
                )
                self.database.upsert_alert_notification_state(
                    alert_id=alert_id,
                    last_sent_at=now_iso,
                    last_status="sent",
                    last_message=",".join(sent_channels),
                )
            else:
                summary["errors"] += 1
                error_text = "; ".join(channel_errors) if channel_errors else "Brak aktywnych kanałów."
                summary["items"].append(
                    {
                        "alertId": alert_id,
                        "status": "error",
                        "message": error_text,
                    }
                )
                self._log_dispatch(
                    alert_id=alert_id,
                    channel="none",
                    status="error",
                    message=error_text,
                    payload=message,
                    dispatched_at=now_iso,
                )
                self.database.upsert_alert_notification_state(
                    alert_id=alert_id,
                    last_sent_at=now_iso,
                    last_status="error",
                    last_message=error_text,
                )
        return summary

    def send_test(self) -> Dict[str, Any]:
        unique = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        row = {
            "alertId": f"test_{unique}",
            "ticker": "TEST",
            "direction": "gte",
            "targetPrice": 100.0,
            "currentPrice": 101.0,
            "currency": "PLN",
            "checkedAt": _now_iso(),
        }
        result = self.dispatch_triggered(triggered_rows=[row], source="test")
        return result

    def history(self, limit: int = 100) -> Dict[str, Any]:
        return {"history": self.database.list_notification_dispatches(limit=max(1, min(limit, 500)))}

    def _build_message(self, *, row: Dict[str, Any], source: str) -> Dict[str, str]:
        ticker = str(row.get("ticker") or "N/D")
        direction = str(row.get("direction") or "gte").upper()
        target_price = _to_num(row.get("targetPrice"))
        current_price = _to_num(row.get("currentPrice"))
        currency = str(row.get("currency") or "PLN")
        checked_at = str(row.get("checkedAt") or _now_iso())
        subject = f"[Prywatny Portfel] Alert {ticker} {direction}"
        body = (
            f"Alert aktywny: {ticker}\n"
            f"Warunek: {direction}\n"
            f"Target: {target_price:.4f} {currency}\n"
            f"Aktualna cena: {current_price:.4f} {currency}\n"
            f"Czas: {checked_at}\n"
            f"Źródło: {source}\n"
        )
        return {"subject": subject, "body": body}

    def _send_email(self, config: Dict[str, Any], message: Dict[str, str]) -> tuple[bool, str]:
        smtp_host = str(config.get("smtpHost") or "").strip()
        username = str(config.get("username") or "").strip()
        password = str(config.get("password") or "")
        sender = str(config.get("from") or "").strip()
        recipient = str(config.get("to") or "").strip()
        smtp_port = int(config.get("smtpPort") or 587)
        use_tls = bool(config.get("useTls", True))

        if not smtp_host or not sender or not recipient:
            return False, "Brak konfiguracji SMTP (host/from/to)."

        email = EmailMessage()
        email["Subject"] = message["subject"]
        email["From"] = sender
        email["To"] = recipient
        email.set_content(message["body"])

        try:
            if use_tls:
                context = ssl.create_default_context()
                with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as smtp:
                    smtp.starttls(context=context)
                    if username:
                        smtp.login(username, password)
                    smtp.send_message(email)
            else:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as smtp:
                    if username:
                        smtp.login(username, password)
                    smtp.send_message(email)
            return True, "Email sent."
        except Exception as error:  # noqa: BLE001
            return False, f"Email error: {error}"

    def _send_telegram(self, config: Dict[str, Any], message: Dict[str, str]) -> tuple[bool, str]:
        token = str(config.get("botToken") or "").strip()
        chat_id = str(config.get("chatId") or "").strip()
        if not token or not chat_id:
            return False, "Brak konfiguracji Telegram (botToken/chatId)."

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = urllib.parse.urlencode(
            {
                "chat_id": chat_id,
                "text": f"{message['subject']}\n\n{message['body']}",
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                text = response.read().decode("utf-8", errors="ignore")
            return True, text[:120]
        except Exception as error:  # noqa: BLE001
            return False, f"Telegram error: {error}"

    def _log_dispatch(
        self,
        *,
        alert_id: str,
        channel: str,
        status: str,
        message: str,
        payload: Dict[str, str],
        dispatched_at: str,
    ) -> None:
        self.database.log_notification_dispatch(
            alert_id=alert_id,
            channel=channel,
            status=status,
            message=message,
            payload_json=json.dumps(payload, ensure_ascii=False),
            dispatched_at=dispatched_at,
        )

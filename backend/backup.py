"""Backup and restore-check service."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List

from .database import Database
from .state_model import normalize_state, now_iso


def _parse_iso(value: str) -> float | None:
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


class BackupService:
    def __init__(self, *, database: Database, project_root: Path):
        self.database = database
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / "data" / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def get_config(self) -> Dict[str, Any]:
        return self.database.get_backup_config()

    def set_config(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.database.set_backup_config(payload)

    def list_runs(self, *, limit: int = 50) -> List[Dict[str, Any]]:
        return self.database.list_backup_runs(limit=limit)

    def last_run(self) -> Dict[str, Any]:
        return self.database.get_last_backup_run()

    def run_scheduled_if_due(self) -> Dict[str, Any]:
        config = self.get_config()
        if not bool(config.get("enabled")):
            return {"ran": False, "reason": "disabled"}
        interval_minutes = max(1, int(config.get("intervalMinutes") or 720))
        now_ts = datetime.now(timezone.utc).timestamp()

        last = self.database.get_last_backup_run(status="success")
        last_ts = _parse_iso(str(last.get("createdAt") or "")) if last else None
        if last_ts is not None:
            age_seconds = max(0, int(now_ts - last_ts))
            min_interval_seconds = interval_minutes * 60
            if age_seconds < min_interval_seconds:
                return {
                    "ran": False,
                    "reason": "not-due",
                    "nextRunInSeconds": max(0, min_interval_seconds - age_seconds),
                }

        result = self.run_backup(trigger="auto")
        return {"ran": True, "result": result}

    def run_backup(self, *, trigger: str = "manual", verify_after: bool | None = None) -> Dict[str, Any]:
        config = self.get_config()
        include_state = bool(config.get("includeStateJson", True))
        include_db = bool(config.get("includeDbCopy", True))
        should_verify = (
            bool(config.get("verifyAfterBackup", True))
            if verify_after is None
            else bool(verify_after)
        )
        keep_last = max(1, int(config.get("keepLast") or 30))

        timestamp_tag = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        state_file = ""
        db_file = ""
        state_size = 0
        db_size = 0
        verified = False
        status = "success"
        message = "Backup completed."

        try:
            if include_state:
                state_payload = {
                    "version": 1,
                    "exportedAt": now_iso(),
                    "state": self.database.get_state(),
                }
                state_path = self.backup_dir / f"prywatny-portfel-state-{timestamp_tag}.json"
                state_path.write_text(
                    json.dumps(state_payload, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                state_file = str(state_path)
                state_size = state_path.stat().st_size

            if include_db:
                db_path = self.backup_dir / f"prywatny-portfel-db-{timestamp_tag}.sqlite3"
                self.database.backup_to_file(db_path)
                db_file = str(db_path)
                db_size = db_path.stat().st_size if db_path.exists() else 0

            if should_verify and state_file:
                verify_result = self.verify_backup(state_file=state_file, log_run=False)
                verified = bool(verify_result.get("ok"))
                message = str(verify_result.get("message") or message)
                if not verified:
                    status = "error"
            elif should_verify and not state_file:
                message = "Backup created without state JSON; verify skipped."
            else:
                message = "Backup completed (verify disabled)."
        except Exception as exc:  # noqa: BLE001
            status = "error"
            message = str(exc)

        row = self.database.log_backup_run(
            trigger=trigger,
            status=status,
            state_file=state_file,
            db_file=db_file,
            state_size=state_size,
            db_size=db_size,
            verified=verified,
            message=message,
            created_at=now_iso(),
        )
        self._prune_files(keep_last=keep_last)
        result = dict(row)
        result["backupDir"] = str(self.backup_dir)
        return result

    def verify_backup(
        self,
        *,
        state_file: str = "",
        log_run: bool = True,
    ) -> Dict[str, Any]:
        target = str(state_file or "").strip()
        if not target:
            last = self.database.get_last_backup_run()
            target = str(last.get("stateFile") or "") if last else ""
        path = Path(target)
        if not target or not path.exists() or not path.is_file():
            result = {
                "ok": False,
                "message": "State backup file not found.",
                "stateFile": target,
                "portfolioCount": 0,
                "accountCount": 0,
                "assetCount": 0,
                "operationCount": 0,
            }
            if log_run:
                self.database.log_backup_run(
                    trigger="verify",
                    status="error",
                    state_file=target,
                    db_file="",
                    state_size=0,
                    db_size=0,
                    verified=False,
                    message=result["message"],
                    created_at=now_iso(),
                )
            return result

        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            candidate = payload.get("state") if isinstance(payload, dict) and isinstance(payload.get("state"), dict) else payload
            normalized = normalize_state(candidate)
            result = {
                "ok": True,
                "message": "Restore-check passed.",
                "stateFile": str(path),
                "portfolioCount": len(normalized.get("portfolios", [])),
                "accountCount": len(normalized.get("accounts", [])),
                "assetCount": len(normalized.get("assets", [])),
                "operationCount": len(normalized.get("operations", [])),
            }
        except Exception as exc:  # noqa: BLE001
            result = {
                "ok": False,
                "message": f"Restore-check failed: {exc}",
                "stateFile": str(path),
                "portfolioCount": 0,
                "accountCount": 0,
                "assetCount": 0,
                "operationCount": 0,
            }

        if log_run:
            result_status = "success" if result["ok"] else "error"
            state_size = path.stat().st_size if path.exists() else 0
            self.database.log_backup_run(
                trigger="verify",
                status=result_status,
                state_file=str(path),
                db_file="",
                state_size=state_size,
                db_size=0,
                verified=bool(result["ok"]),
                message=str(result["message"]),
                created_at=now_iso(),
            )
        return result

    def _prune_files(self, *, keep_last: int) -> None:
        keep = max(1, keep_last)
        for pattern in (
            "prywatny-portfel-state-*.json",
            "prywatny-portfel-db-*.sqlite3",
            "myfund-state-*.json",
            "myfund-db-*.sqlite3",
        ):
            files = sorted(
                self.backup_dir.glob(pattern),
                key=lambda item: item.name,
                reverse=True,
            )
            for stale in files[keep:]:
                try:
                    stale.unlink(missing_ok=True)
                except OSError:
                    continue

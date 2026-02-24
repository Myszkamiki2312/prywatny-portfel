import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from backend.backup import BackupService
from backend.database import Database
from backend.server import AppHandler
from backend.state_model import now_iso


class FakeHandler:
    def __init__(self, context):
        self.context = context

    def dispatch(self, method, path, query=None, payload=None):
        return AppHandler._dispatch(self, method, path, query or {}, payload or {})


class FakeRealtime:
    def status(self):
        return {
            "running": False,
            "cronEnabled": False,
            "active": False,
            "config": {},
            "lastRunAt": "",
            "lastTriggerSource": "",
            "summary": {},
            "dispatch": {},
            "error": "",
        }


class BackupMonitoringTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.database = Database(Path(self.tmp.name) / "backup.db")
        self.backup_service = BackupService(
            database=self.database,
            project_root=Path(self.tmp.name),
        )
        self.handler = FakeHandler(
            SimpleNamespace(
                database=self.database,
                backup_service=self.backup_service,
                realtime=FakeRealtime(),
            )
        )

    def tearDown(self):
        self.database.close()
        self.tmp.cleanup()

    def test_backup_endpoints_run_and_verify(self):
        config_payload = self.handler.dispatch(
            "PUT",
            "/api/tools/backup/config",
            payload={
                "enabled": True,
                "intervalMinutes": 60,
                "keepLast": 10,
                "verifyAfterBackup": True,
                "includeStateJson": True,
                "includeDbCopy": True,
            },
        )
        config = config_payload["config"]
        self.assertEqual(config["enabled"], True)
        self.assertEqual(config["intervalMinutes"], 60)
        self.assertEqual(config["keepLast"], 10)

        run_payload = self.handler.dispatch("POST", "/api/tools/backup/run", payload={})
        backup = run_payload["backup"]
        self.assertEqual(backup["status"], "success")
        self.assertTrue(bool(backup["stateFile"]))
        self.assertTrue(bool(backup["dbFile"]))
        self.assertTrue(Path(backup["stateFile"]).exists())
        self.assertTrue(Path(backup["dbFile"]).exists())

        verify_payload = self.handler.dispatch(
            "POST",
            "/api/tools/backup/verify",
            payload={"stateFile": backup["stateFile"]},
        )
        verify = verify_payload["verify"]
        self.assertEqual(verify["ok"], True)
        self.assertGreaterEqual(verify["portfolioCount"], 1)

        runs_payload = self.handler.dispatch("GET", "/api/tools/backup/runs", query={"limit": ["5"]})
        runs = runs_payload["runs"]
        self.assertGreaterEqual(len(runs), 2)  # backup + verify log

    def test_backup_scheduler_skips_until_interval(self):
        self.backup_service.set_config(
            {
                "enabled": True,
                "intervalMinutes": 1440,
                "keepLast": 5,
                "verifyAfterBackup": False,
                "includeStateJson": True,
                "includeDbCopy": False,
            }
        )

        first = self.backup_service.run_scheduled_if_due()
        second = self.backup_service.run_scheduled_if_due()

        self.assertEqual(first["ran"], True)
        self.assertEqual(second["ran"], False)
        self.assertEqual(second["reason"], "not-due")

    def test_monitoring_status_includes_quote_freshness_and_backup(self):
        self.database.upsert_quotes(
            [
                {
                    "ticker": "AAA",
                    "price": 1.0,
                    "currency": "PLN",
                    "provider": "test",
                    "fetched_at": now_iso(),
                },
                {
                    "ticker": "BBB",
                    "price": 2.0,
                    "currency": "PLN",
                    "provider": "test",
                    "fetched_at": "2000-01-01T00:00:00+00:00",
                },
            ]
        )
        self.backup_service.run_backup(trigger="manual", verify_after=False)

        payload = self.handler.dispatch("GET", "/api/tools/monitoring/status")
        self.assertEqual(payload["status"], "ok")
        self.assertIn("quotes", payload)
        self.assertEqual(payload["quotes"]["total"], 2)
        self.assertEqual(payload["quotes"]["fresh"], 1)
        self.assertEqual(payload["quotes"]["stale"], 1)
        self.assertIn("backup", payload)
        self.assertEqual(payload["backup"]["config"]["enabled"], False)
        self.assertEqual(payload["backup"]["lastRun"]["status"], "success")


if __name__ == "__main__":
    unittest.main()

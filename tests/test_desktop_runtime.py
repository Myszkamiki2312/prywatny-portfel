import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from backend.server import default_data_root, default_project_root, resolve_db_path, resolve_roots


class DesktopRuntimeTests(unittest.TestCase):
    def test_resolve_db_path_prefers_legacy_when_default_missing(self):
        with TemporaryDirectory() as tmpdir:
            data_root = Path(tmpdir)
            legacy_db = data_root / "myfund_solo.db"
            legacy_db.write_text("", encoding="utf-8")

            resolved = resolve_db_path("", data_root)

            self.assertEqual(resolved, legacy_db)

    def test_resolve_roots_accepts_explicit_values(self):
        with TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir) / "project"
            data_root = Path(tmpdir) / "data"

            resolved_project_root, resolved_data_root = resolve_roots(str(project_root), str(data_root))

            self.assertEqual(resolved_project_root, project_root.resolve())
            self.assertEqual(resolved_data_root, data_root.resolve())

    def test_default_roots_read_environment_overrides(self):
        with TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir) / "static"
            data_root = Path(tmpdir) / "storage"
            old_project = os.environ.get("PRYWATNY_PORTFEL_PROJECT_ROOT")
            old_data = os.environ.get("PRYWATNY_PORTFEL_DATA_ROOT")
            os.environ["PRYWATNY_PORTFEL_PROJECT_ROOT"] = str(project_root)
            os.environ["PRYWATNY_PORTFEL_DATA_ROOT"] = str(data_root)
            try:
                self.assertEqual(default_project_root(), project_root.resolve())
                self.assertEqual(default_data_root(project_root), data_root.resolve())
            finally:
                if old_project is None:
                    os.environ.pop("PRYWATNY_PORTFEL_PROJECT_ROOT", None)
                else:
                    os.environ["PRYWATNY_PORTFEL_PROJECT_ROOT"] = old_project
                if old_data is None:
                    os.environ.pop("PRYWATNY_PORTFEL_DATA_ROOT", None)
                else:
                    os.environ["PRYWATNY_PORTFEL_DATA_ROOT"] = old_data


if __name__ == "__main__":
    unittest.main()

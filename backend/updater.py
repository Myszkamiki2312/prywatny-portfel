import os
import shutil
import subprocess
import tempfile
from pathlib import Path

class AppUpdater:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.repo_url = "https://github.com/myszkamiki2312/prywatny-portfel-v0.7.2.git"

    def check_for_updates(self):
        # Wersja uproszczona: git fetch + git status
        try:
            subprocess.run(["git", "fetch"], cwd=self.project_root, check=True, capture_output=True)
            result = subprocess.run(
                ["git", "rev-list", "HEAD..origin/main", "--count"],
                cwd=self.project_root,
                check=True,
                capture_output=True,
                text=True
            )
            count = int(result.stdout.strip())
            return {"update_available": count > 0, "commits_behind": count}
        except Exception as e:
            return {"error": str(e)}

    def apply_update(self):
        try:
            # 1. Pobierz zmiany
            subprocess.run(["git", "pull", "origin", "main"], cwd=self.project_root, check=True, capture_output=True)
            return {"success": True, "message": "Zaktualizowano pomyślnie. Zrestartuj aplikację."}
        except Exception as e:
            return {"success": False, "error": str(e)}


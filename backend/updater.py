import os
import sys
import json
import urllib.request
import subprocess
from pathlib import Path

class AppUpdater:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.repo_url = "https://github.com/Myszkamiki2312/prywatny-portfel.git"
        self.api_url = "https://api.github.com/repos/Myszkamiki2312/prywatny-portfel/releases/latest"
        
        # Jeśli jesteśmy w pliku .exe (sys._MEIPASS) albo folder nie ma .git, uznajemy to za środowisko skompilowane.
        self.is_bundled = hasattr(sys, "_MEIPASS") or not (self.project_root / ".git").exists()

    def check_for_updates(self):
        if self.is_bundled:
            try:
                req = urllib.request.Request(self.api_url, headers={"User-Agent": "PrywatnyPortfel-App"})
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode())
                    latest_version = data.get("tag_name", "")
                    release_url = data.get("html_url", "")
                    
                    return {
                        "update_available": True, 
                        "is_bundled": True,
                        "latest_version": latest_version,
                        "release_url": release_url
                    }
            except Exception as e:
                return {"error": f"Brak połączenia z serwerem aktualizacji (GitHub API): {e}"}
        else:
            try:
                subprocess.run(["git", "remote", "set-url", "origin", self.repo_url], cwd=self.project_root, check=True)
                subprocess.run(["git", "fetch", "origin"], cwd=self.project_root, check=True, capture_output=True)
                
                result = subprocess.run(
                    ["git", "rev-list", "HEAD..origin/main", "--count"],
                    cwd=self.project_root,
                    check=True,
                    capture_output=True,
                    text=True
                )
                count = int(result.stdout.strip())
                return {"update_available": count > 0, "commits_behind": count, "is_bundled": False}
            except subprocess.CalledProcessError as e:
                return {"error": f"Git error: {e.stderr.decode() if e.stderr else str(e)}"}
            except Exception as e:
                return {"error": str(e)}

    def apply_update(self):
        if self.is_bundled:
            return {
                "success": False, 
                "error": "Aplikacja w systemie Windows nie może zaktualizować się sama w ten sposób. Pobierz nowy plik .msi i zainstaluj go."
            }
            
        try:
            subprocess.run(["git", "pull", "origin", "main"], cwd=self.project_root, check=True, capture_output=True)
            return {"success": True, "message": "Zaktualizowano pomyślnie. Odśwież stronę."}
        except Exception as e:
            return {"success": False, "error": str(e)}

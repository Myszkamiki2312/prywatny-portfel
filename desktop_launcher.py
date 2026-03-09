from __future__ import annotations

import os
from pathlib import Path
import socket
import sys
import threading
import time
import traceback
import webbrowser

import tkinter as tk
from tkinter import messagebox, ttk
from urllib.error import URLError
from urllib.request import urlopen


APP_NAME = "Prywatny Portfel"
HOST = "127.0.0.1"
STARTUP_TIMEOUT_SECONDS = 25


def resource_root() -> Path:
    if hasattr(sys, "_MEIPASS"):
        return Path(getattr(sys, "_MEIPASS")).resolve()
    return Path(__file__).resolve().parent


def data_root() -> Path:
    override = str(os.environ.get("PRYWATNY_PORTFEL_DATA_ROOT") or "").strip()
    if override:
        root = Path(override).expanduser().resolve()
    elif os.name == "nt" and os.environ.get("LOCALAPPDATA"):
        root = Path(os.environ["LOCALAPPDATA"]) / "PrywatnyPortfel"
    else:
        root = Path.home() / ".prywatny-portfel"
    root.mkdir(parents=True, exist_ok=True)
    return root


def log_path(root: Path) -> Path:
    logs_dir = root / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    return logs_dir / "desktop-launcher.log"


def append_log(path: Path, message: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"[{timestamp}] {message}\n")


def find_free_port(host: str) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


def wait_for_health(base_url: str, timeout_seconds: int = STARTUP_TIMEOUT_SECONDS) -> None:
    deadline = time.time() + max(1, timeout_seconds)
    last_error = ""
    while time.time() < deadline:
        try:
            with urlopen(f"{base_url}/api/health", timeout=2) as response:
                if int(getattr(response, "status", 0) or 0) == 200:
                    return
        except URLError as error:
            last_error = str(error.reason)
        except OSError as error:
            last_error = str(error)
        time.sleep(0.35)
    raise RuntimeError(f"Backend did not start in time. Last error: {last_error or 'unknown'}")


def start_runtime(static_root: Path, storage_root: Path, port: int):
    os.environ["PRYWATNY_PORTFEL_PROJECT_ROOT"] = str(static_root)
    os.environ["PRYWATNY_PORTFEL_DATA_ROOT"] = str(storage_root)

    from backend.server import create_runtime

    runtime = create_runtime(
        host=HOST,
        port=port,
        project_root=static_root,
        data_root=storage_root,
    )
    thread = threading.Thread(
        target=runtime.serve_forever,
        name="PrywatnyPortfelServer",
        daemon=True,
    )
    thread.start()
    return runtime, thread


def open_data_folder(root: Path) -> None:
    if os.name == "nt":
        os.startfile(str(root))


def run_fallback_window(url: str, storage_root: Path, runtime) -> None:
    root = tk.Tk()
    root.title(APP_NAME)
    root.geometry("440x230")
    root.minsize(380, 210)
    root.configure(padx=20, pady=20)

    ttk.Label(root, text=APP_NAME, font=("Segoe UI", 17, "bold")).pack(anchor="w")
    ttk.Label(
        root,
        text="Aplikacja dziala lokalnie. Jesli okno nie otworzylo sie samo, uzyj przycisku ponizej.",
        wraplength=390,
        justify="left",
    ).pack(anchor="w", pady=(12, 16))
    ttk.Button(root, text="Otworz aplikacje", command=lambda: webbrowser.open(url, new=1)).pack(fill="x")
    ttk.Button(root, text="Otworz folder danych", command=lambda: open_data_folder(storage_root)).pack(
        fill="x",
        pady=(8, 0),
    )
    ttk.Button(root, text="Zamknij", command=root.destroy).pack(fill="x", pady=(16, 0))

    def on_close() -> None:
        runtime.stop()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    webbrowser.open(url, new=1)
    try:
        root.mainloop()
    finally:
        runtime.stop()


def show_fatal_error(message: str) -> None:
    try:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(APP_NAME, message)
        root.destroy()
    except Exception:
        pass


def main() -> int:
    static_root = resource_root()
    storage_root = data_root()
    log_file = log_path(storage_root)

    try:
        port = find_free_port(HOST)
        runtime, _thread = start_runtime(static_root, storage_root, port)
        url = f"http://{HOST}:{port}"
        wait_for_health(url)

        try:
            import webview

            webview.create_window(APP_NAME, url, min_size=(1100, 760))
            webview.start()
            runtime.stop()
            return 0
        except Exception as error:  # noqa: BLE001
            append_log(log_file, f"WebView fallback: {error}")
            run_fallback_window(url, storage_root, runtime)
            return 0
    except Exception as error:  # noqa: BLE001
        stack = traceback.format_exc(limit=10)
        append_log(log_file, f"Fatal error: {error}\n{stack}")
        show_fatal_error(
            "Nie udalo sie uruchomic aplikacji.\n\n"
            f"Szczegoly: {error}\n\n"
            f"Log: {log_file}"
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

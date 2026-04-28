# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files, collect_submodules


backend_hiddenimports = collect_submodules("backend")
webview_hiddenimports = collect_submodules("webview")
webview_datas = collect_data_files("webview")

datas = webview_datas + [
    ("index.html", "."),
    ("styles.css", "."),
    ("app.js", "."),
    ("frontend", "frontend"),
]

a = Analysis(
    ["desktop_launcher.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=backend_hiddenimports + webview_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="PrywatnyPortfel",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
)

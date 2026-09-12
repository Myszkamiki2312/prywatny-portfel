"""Checks the deploy-time configuration that no other test touches.

CSP, the web manifest and the service worker precache list are only exercised by loading the real
page in a browser, so a mistake in them ships silently: a blocked font, an uninstallable PWA, or a
newly extracted module missing from the offline shell. These assertions catch that class without a
browser. They are not a substitute for looking at the deployed page — they check internal
consistency, not how it renders.
"""

import json
import re
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


def csp_directives():
    config = json.loads(read("vercel.json"))
    for rule in config.get("headers", []):
        for header in rule.get("headers", []):
            if header.get("key") == "Content-Security-Policy":
                directives = {}
                for part in header["value"].split(";"):
                    tokens = part.split()
                    if tokens:
                        directives[tokens[0]] = tokens[1:]
                return directives
    raise AssertionError("vercel.json declares no Content-Security-Policy header.")


def png_size(path):
    data = (ROOT / path).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path} is not a PNG."
    width, height = struct.unpack(">II", data[16:24])
    return width, height


class ContentSecurityPolicyTests(unittest.TestCase):
    def setUp(self):
        self.directives = csp_directives()
        self.html = read("index.html")

    def test_script_src_stays_strict(self):
        script_src = self.directives.get("script-src", [])
        self.assertEqual(script_src, ["'self'"])
        self.assertNotIn("'unsafe-inline'", script_src)
        self.assertNotIn("'unsafe-eval'", script_src)

    def test_page_has_no_inline_script_that_the_policy_would_block(self):
        inline = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", self.html, re.S)
        self.assertEqual(
            [block for block in inline if block.strip()],
            [],
            "An inline <script> would be blocked by script-src 'self'.",
        )

    def test_page_has_no_inline_event_handlers(self):
        handlers = re.findall(r"\son(?:click|change|submit|load|input|error)\s*=", self.html)
        self.assertEqual(handlers, [], "Inline event handlers are blocked by script-src 'self'.")

    def test_every_external_stylesheet_and_font_host_is_allowed(self):
        for url in re.findall(r'<link[^>]+href="(https://[^"]+)"', self.html):
            host = url.split("/")[2]
            with self.subTest(url=url):
                allowed = self.directives.get("style-src", []) + self.directives.get("font-src", [])
                self.assertTrue(
                    any(host in entry for entry in allowed),
                    f"{host} is loaded by index.html but allowed by no style-src/font-src entry.",
                )

    def test_supabase_project_is_reachable_under_connect_src(self):
        config = read("supabase-config.js")
        match = re.search(r'url:\s*"(https://[^"]+)"', config)
        self.assertIsNotNone(match, "supabase-config.js declares no url.")
        host = match.group(1).split("/")[2]
        self.assertTrue(
            any(host in entry for entry in self.directives.get("connect-src", [])),
            f"Supabase host {host} is missing from connect-src — sign-in would be blocked.",
        )

    def test_service_worker_and_manifest_are_permitted(self):
        self.assertIn("'self'", self.directives.get("worker-src", []))
        self.assertIn("'self'", self.directives.get("manifest-src", []))

    def test_clickjacking_and_injection_directives_are_present(self):
        self.assertEqual(self.directives.get("object-src"), ["'none'"])
        self.assertEqual(self.directives.get("base-uri"), ["'self'"])
        self.assertEqual(self.directives.get("form-action"), ["'self'"])
        self.assertIn("frame-ancestors", self.directives)


class WebManifestTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(read("manifest.json"))

    def test_declares_the_fields_an_install_prompt_requires(self):
        for field in ("name", "short_name", "start_url", "display", "icons"):
            self.assertIn(field, self.manifest)
        self.assertIn(self.manifest["display"], {"standalone", "fullscreen", "minimal-ui"})

    def test_icons_exist_and_match_their_declared_size(self):
        for icon in self.manifest["icons"]:
            with self.subTest(icon=icon["src"]):
                self.assertTrue((ROOT / icon["src"]).is_file(), f"{icon['src']} is missing.")
                declared = icon["sizes"].split("x")
                self.assertEqual(
                    png_size(icon["src"]),
                    (int(declared[0]), int(declared[1])),
                    "The manifest declares a size the file does not have.",
                )

    def test_has_the_sizes_and_purposes_installability_needs(self):
        sizes = {icon["sizes"] for icon in self.manifest["icons"]}
        self.assertIn("192x192", sizes)
        self.assertIn("512x512", sizes)
        purposes = {icon.get("purpose", "any") for icon in self.manifest["icons"]}
        self.assertIn("maskable", purposes, "Without a maskable icon Android crops the artwork.")

    def test_index_html_links_the_manifest(self):
        self.assertRegex(read("index.html"), r'<link[^>]+rel="manifest"')


class ServiceWorkerShellTests(unittest.TestCase):
    def setUp(self):
        self.sw = read("sw.js")
        block = re.search(r"const SHELL_ASSETS = \[(.*?)\];", self.sw, re.S)
        assert block, "sw.js has no SHELL_ASSETS list."
        self.assets = re.findall(r'"([^"]+)"', block.group(1))

    def normalized(self):
        return {asset.lstrip("./") for asset in self.assets}

    def test_every_precached_path_exists(self):
        for asset in self.assets:
            relative = asset.lstrip("./")
            if not relative:
                continue  # "./" is the navigation entry, not a file
            with self.subTest(asset=asset):
                self.assertTrue((ROOT / relative).is_file(), f"{asset} is precached but missing.")

    def test_every_frontend_module_is_precached(self):
        """The check that would have caught charts.js and metrics.js being left out."""
        precached = self.normalized()
        for module in sorted((ROOT / "frontend").glob("*.js")):
            relative = f"frontend/{module.name}"
            with self.subTest(module=relative):
                self.assertIn(
                    relative,
                    precached,
                    f"{relative} is loaded by the app but absent from the offline shell.",
                )

    def test_every_module_app_js_imports_is_precached(self):
        precached = self.normalized()
        for imported in re.findall(r'import\("\./([^"]+)"\)', read("app.js")):
            with self.subTest(module=imported):
                self.assertIn(imported, precached)

    def test_scripts_and_stylesheets_from_index_are_precached(self):
        html = read("index.html")
        referenced = re.findall(r'<script[^>]+src="(?!https?:)([^"]+)"', html)
        referenced += re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="(?!https?:)([^"]+)"', html)
        precached = self.normalized()
        for asset in referenced:
            with self.subTest(asset=asset):
                self.assertIn(asset, precached, f"{asset} is needed to boot but is not precached.")

    def test_live_data_paths_are_never_served_from_cache(self):
        self.assertIn("/api/", self.sw)
        self.assertRegex(
            self.sw,
            r"url\.pathname\.startsWith\(\"/api/\"\)",
            "The worker must refuse to cache API responses.",
        )

    def test_worker_is_network_first(self):
        fetch_handler = self.sw.split('addEventListener("fetch"', 1)[-1]
        network_at = fetch_handler.find("await fetch(")
        cache_at = fetch_handler.find("caches.match(")
        self.assertNotEqual(network_at, -1, "The worker never reaches the network.")
        self.assertTrue(
            network_at < cache_at,
            "Cache is consulted before the network — a stale app.js could outlive a deploy.",
        )


class GitHubPagesPublishTests(unittest.TestCase):
    """The Pages workflow copies an explicit file list, so anything new has to be added by hand.
    A stylesheet once missed that list and was silently absent from the deployment for months, which
    is the same failure shape as the precache list: the app boots, just wrong."""

    def setUp(self):
        self.workflow = read(".github/workflows/pages.yml")
        self.published = self._published()
        self.triggers = re.findall(r'^\s+- "([^"]+)"', self.workflow, re.M)

    def _published(self):
        published = set()
        for line in self.workflow.splitlines():
            stripped = line.strip()
            if not stripped.startswith("cp "):
                continue
            tokens = stripped.split()
            if tokens[1] == "-R":
                published.add(tokens[2].rstrip("/"))
            else:
                published.update(tokens[1:-1])
        return published

    def is_published(self, asset):
        return asset in self.published or asset.split("/", 1)[0] in self.published

    def test_every_asset_index_html_needs_is_published(self):
        html = read("index.html")
        referenced = re.findall(r'<script[^>]+src="(?!https?:)([^"?]+)"', html)
        referenced += re.findall(r'<link[^>]+href="(?!https?:|#)([^"?]+)"', html)
        for asset in sorted(set(referenced)):
            with self.subTest(asset=asset):
                self.assertTrue(
                    self.is_published(asset),
                    f"index.html loads {asset}, but the Pages workflow never copies it.",
                )

    def test_every_frontend_module_is_published(self):
        for module in sorted((ROOT / "frontend").glob("*.js")):
            with self.subTest(module=module.name):
                self.assertTrue(self.is_published(f"frontend/{module.name}"))

    def test_progressive_web_app_files_are_published(self):
        for asset in ("manifest.json", "sw.js"):
            with self.subTest(asset=asset):
                self.assertTrue(self.is_published(asset), f"{asset} would 404 on Pages.")
        for icon in json.loads(read("manifest.json"))["icons"]:
            with self.subTest(icon=icon["src"]):
                self.assertTrue(self.is_published(icon["src"]))

    def test_publishing_a_file_also_triggers_a_deploy(self):
        """A file copied by the job but absent from `paths:` ships only when something else changes."""
        for asset in sorted(self.published):
            if asset in {"public/"} or asset.endswith(".html"):
                continue  # the HTML entries are already listed individually
            with self.subTest(asset=asset):
                self.assertTrue(
                    asset in self.triggers or f"{asset}/**" in self.triggers,
                    f"{asset} is published but no path filter triggers a rebuild when it changes.",
                )


class ResponsiveCssTests(unittest.TestCase):
    def test_breakpoints_are_ordered_widest_first(self):
        """Both blocks match on a phone, so the narrower one has to come later in the file."""
        widths = [
            int(match)
            for match in re.findall(r"@media \(max-width: (\d+)px\)", read("styles.css"))
        ]
        self.assertEqual(widths, sorted(widths, reverse=True), f"Out of order: {widths}")

    def test_charts_cannot_force_the_page_to_scroll_sideways(self):
        css = read("styles.css")
        canvas_rule = re.search(r"\bcanvas\s*\{([^}]*)\}", css)
        self.assertIsNotNone(canvas_rule, "No canvas rule found.")
        self.assertIn(
            "width: 100%",
            canvas_rule.group(1),
            "The canvases carry a fixed width attribute and need a CSS cap.",
        )

    def test_wide_content_is_wrapped_in_a_scroll_container(self):
        self.assertRegex(read("styles.css"), r"\.table-wrap\s*\{[^}]*overflow-x:\s*auto")


class DesktopBundleTests(unittest.TestCase):
    """desktop_launcher.spec names every file PyInstaller bundles, one entry at a time.

    It was the third hand-maintained file list in the repository and the only one nothing checked,
    so removing a stylesheet left a dangling entry behind and the Windows build failed at package
    time — after the tests, the APK and Pages had all gone green. The precache list and the Pages
    copy list are covered above; this closes the last one.
    """

    def setUp(self):
        self.spec = read("desktop_launcher.spec")

    def bundled_paths(self):
        block = self.spec.split("datas = webview_datas + [", 1)[1].split("]", 1)[0]
        return re.findall(r'\("([^"]+)",\s*"[^"]*"\)', block)

    def test_every_bundled_path_exists(self):
        paths = self.bundled_paths()
        self.assertTrue(paths, "Could not read the bundle list out of the spec.")
        for path in paths:
            with self.subTest(path=path):
                self.assertTrue(
                    (ROOT / path).exists(),
                    f"desktop_launcher.spec bundles {path}, which is not in the repository.",
                )

    def test_every_stylesheet_index_html_loads_is_bundled(self):
        """The reverse direction: a new stylesheet that nobody adds here ships a desktop app
        without it, which boots and renders unstyled rather than failing."""
        referenced = re.findall(
            r'<link[^>]+rel="stylesheet"[^>]+href="(?!https?:)([^"]+)"', read("index.html")
        )
        bundled = set(self.bundled_paths())
        self.assertTrue(referenced, "index.html loads no local stylesheet at all.")
        for asset in referenced:
            with self.subTest(asset=asset):
                self.assertIn(
                    asset,
                    bundled,
                    f"index.html loads {asset}, but the desktop build never bundles it.",
                )


if __name__ == "__main__":
    unittest.main()

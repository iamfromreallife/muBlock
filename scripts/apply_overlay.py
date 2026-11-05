#!/usr/bin/env python3
"""Build muBlock UI on top of the upstream uBO Lite Chromium distribution.

Only UI entrypoints, localization, icon metadata and presentation resources are
modified. All original background, filter engine, storage and picker algorithms
remain unmodified.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = (
    "css/mu-design.css",
    "css/mu-popup.css",
    "css/mu-dashboard.css",
    "css/mu-picker.css",
    "js/mu-popup.js",
    "js/mu-dashboard.js",
    "js/mu-filters.js",
    "img/mu-logo.svg",
)

def insert_once(path: Path, anchor: str, addition: str) -> None:
    text = path.read_text("utf-8")
    if text.count(anchor) != 1:
        raise RuntimeError(f"Expected exactly one {anchor!r} in {path}")
    if addition in text:
        raise RuntimeError(f"Overlay already applied in {path}")
    path.write_text(text.replace(anchor, addition + "\n" + anchor), "utf-8")

def main(extension: Path) -> None:
    if not (extension / "manifest.json").is_file():
        raise RuntimeError(f"Missing upstream Chromium manifest: {extension}")
    for asset in ASSETS:
        src = ROOT / "overlay" / asset
        dst = extension / asset
        if not src.is_file() or dst.exists():
            raise RuntimeError(f"Invalid/missing or conflicting overlay: {asset}")
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    # Only replace Lite's legacy custom-filter presentation. The CodeMirror
    # engine, picker, and original filtering backend remain untouched.
    dashboard = extension / "dashboard.html"
    html = dashboard.read_text("utf-8")
    expression = re.compile(
        r'<section data-pane="filters">.*?</section>',
        re.DOTALL,
    )
    new_section = '''<section data-pane="filters" id="mu-filters">
    <aside id="sandboxEditor" class="mu-raw-editor">
        <div class="cm-container"></div>
    </aside>
</section>'''
    html, replacements = expression.subn(new_section, html, count=1)
    if replacements != 1:
        raise RuntimeError("Could not replace old Lite custom filter section")
    html = html.replace(
        '<script src="js/filter-manager-ui.js" type="module"></script>',
        '',
    )
    if 'js/filter-manager-ui.js' in html:
        raise RuntimeError("Original filter manager script still included")
    dashboard.write_text(html, "utf-8")

    for page, css, script in (
        ("popup.html", "mu-popup", "mu-popup"),
        ("dashboard.html", "mu-dashboard", "mu-dashboard"),
    ):
        p = extension / page
        insert_once(p, "</head>",
                    f'<link rel="stylesheet" href="css/mu-design.css">\n'
                    f'<link rel="stylesheet" href="css/{css}.css">')
        insert_once(p, "</body>",
                    f'<script src="js/{script}.js" type="module"></script>')
    insert_once(
        dashboard, "</body>",
        '<script src="js/mu-filters.js" type="module"></script>',
    )

    for page in ("picker-ui.html", "zapper-ui.html", "unpicker-ui.html"):
        p = extension / page
        insert_once(p, "</head>",
                    '<link rel="stylesheet" href="/css/mu-design.css">\n'
                    '<link rel="stylesheet" href="/css/mu-picker.css">')
        p.write_text(p.read_text("utf-8").replace(
            "<title>uBO Lite Zapper</title>", f"<title>muBlock — {page.split('-')[0]}</title>"
        ), "utf-8")

    # Lite's action.js changes toolbar icons at runtime for trusted sites.
    # Replace only its icon asset paths, leaving all filtering logic intact.
    toolbar_module = extension / "js" / "action.js"
    action_source = toolbar_module.read_text("utf-8")
    for size in (16, 32, 64, 128):
        for suffix, state in (("", ""), ("_off", "-off")):
            original_icon = f"/img/icon_{size}{suffix}.png"
            replacement_icon = f"/img/mu-toolbar{state}-{size}.png"
            if original_icon not in action_source:
                raise RuntimeError(f"Upstream action icon path changed: {original_icon}")
            action_source = action_source.replace(original_icon, replacement_icon)
    toolbar_module.write_text(action_source, "utf-8")

    # Replace the remaining page favicons and static brand artwork.
    dashboard_html = dashboard.read_text("utf-8")
    dashboard_html = dashboard_html.replace(
        'src="img/ublock.svg" alt="uBO Lite"',
        'src="img/mu-logo.svg" alt="muBlock"',
    )
    dashboard.write_text(dashboard_html, "utf-8")
    for name in ("dashboard.html", "matched-rules.html", "report.html", "strictblock.html"):
        page = extension / name
        html = page.read_text("utf-8")
        html = html.replace('href="img/icon_64.png"', 'href="img/mu-64.png"')
        if name != "dashboard.html":
            if "</head>" not in html:
                raise RuntimeError(f"Missing head close in {name}")
            html = html.replace("</head>", '<link rel="stylesheet" href="css/mu-design.css">\n</head>')
        page.write_text(html, "utf-8")

    manifest_path = extension / "manifest.json"
    manifest = json.loads(manifest_path.read_text("utf-8"))
    manifest["name"] = "muBlock"
    manifest["short_name"] = "muBlock"
    manifest["description"] = "muBlock — expressive, privacy-first filtering powered by uBlock Origin Lite."
    manifest["action"]["default_title"] = "muBlock"
    manifest["action"]["default_icon"] = {str(size): f"img/mu-toolbar-{size}.png"
                                         for size in (16,32,64,128)}
    manifest["icons"] = {str(size): f"img/mu-{size}.png" for size in (16,32,48,64,128)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")

    for localization in (extension / "_locales").glob("*/messages.json"):
        data = json.loads(localization.read_text("utf-8"))
        data["extName"]["message"] = "muBlock"
        localization.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")

    from generate_icons import generate
    generate(extension / "img")
    print(f"muBlock UI overlay applied: {extension}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("extension", type=Path)
    options = parser.parse_args()
    main(options.extension.resolve())

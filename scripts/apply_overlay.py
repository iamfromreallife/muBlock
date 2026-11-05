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
    "css/mu-select.css",
    "css/mu-slider.css",
    "css/mu-language.css",
    "js/mu-cosmetic-rules.js",
    "js/scripting/youtube-player.js",
    "js/mu-popup.js",
    "js/mu-dashboard.js",
    "js/mu-filters.js",
    "js/mu-list-info.js",
    "js/mu-select.js",
    "js/mu-slider.js",
    "js/mu-language.js",
    "js/mu-language-settings.js",
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

    # A minimal, fail-closed adapter integrates muBlock's persistent cosmetic
    # exceptions into Lite's existing cosmetic CSS registration and backup UI.
    from mu_cosmetic_patch import patch_cosmetic_filtering
    patch_cosmetic_filtering(extension)

    # Preserve the known YouTube playback fix across upstream rebuilds.
    # Register it alongside the stock MAIN-world scriptlets, preserving
    # filtering-mode permissions and the normal rule-list activation logic.
    insert_once(
        extension / "js/scripting-manager.js",
        "        js.unshift(`/rulesets/scripting/scriptlet/${world.toLowerCase()}/scriptlet-begin.js`);",
        "        if ( world === 'MAIN' && rulesetsDetails.some(({ id }) => id === 'ublock-filters') ) {\n"
        "            js.push('/js/scripting/youtube-player.js');\n"
        "        }",
    )

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
    # Supplement the original Lite filter-list UI with factual, optional
    # explanatory labels. Never replace list selection/storage code.
    insert_once(
        dashboard, "</body>",
        '<script src="js/mu-list-info.js" type="module"></script>',
    )

    for page in ("picker-ui.html", "zapper-ui.html", "unpicker-ui.html"):
        p = extension / page
        insert_once(p, "</head>",
                    '<link rel="stylesheet" href="/css/mu-design.css">\n'
                    '<link rel="stylesheet" href="/css/mu-picker.css">')
        p.write_text(p.read_text("utf-8").replace(
            "<title>uBO Lite Zapper</title>", f"<title>muBlock — {page.split('-')[0]}</title>"
        ), "utf-8")

    # Override the *UI* localization adapter only: the native filtering
    # engine, settings storage and Chrome's built-in locale are unchanged.
    # The adapter still uses Lite's existing sanitizing i18n.render() logic.
    core_i18n = extension / "js" / "i18n.js"
    i18n_code = core_i18n.read_text("utf-8")
    native_getter = "const i18n$ = (...args) => i18n.getMessage(...args);"
    if i18n_code.count(native_getter) != 1:
        raise RuntimeError("Lite i18n.js API changed; refuse an unsafe patch")
    i18n_code = (
        "import { muGetMessage } from './mu-language.js';\n"
        + i18n_code.replace(native_getter,
            "const i18n$ = (...args) => muGetMessage(...args);")
    )
    core_i18n.write_text(i18n_code, "utf-8")

    # Lite's Settings reset warning uses an imported i18n object directly
    # rather than i18n$. Route just that UI dialog through the same adapter.
    lite_settings = extension / "js" / "settings.js"
    settings_code = lite_settings.read_text("utf-8")
    direct_message = "i18n.getMessage('resetToDefaultConfirm')"
    if settings_code.count(direct_message) != 1:
        raise RuntimeError("Lite Settings localization API changed")
    settings_code = settings_code.replace(direct_message,
        "muGetMessage('resetToDefaultConfirm')")
    lite_settings.write_text(
        "import { muGetMessage } from './mu-language.js';\n" + settings_code,
        "utf-8",
    )

    insert_once(dashboard, "</head>",
                '<link rel="stylesheet" href="css/mu-language.css">')
    insert_once(dashboard, "</body>",
                '<script src="js/mu-language-settings.js" type="module"></script>')

    # Original Lite action.js is intentionally left unchanged. The icon
    # renderer writes the official UBO emblem under its stock filenames so
    # Lite's enabled/disabled runtime icon-switching works as designed.

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
        html = html.replace('href="img/mu-64.png"', 'href="img/icon_64.png"')
        if name != "dashboard.html":
            if "</head>" not in html:
                raise RuntimeError(f"Missing head close in {name}")
            html = html.replace("</head>", '<link rel="stylesheet" href="css/mu-design.css">\n</head>')
        page.write_text(html, "utf-8")

    # Style every dropdown in dashboard and report, but keep the native
    # <select> and its existing Lite event handlers as the source of truth.
    insert_once(dashboard, "</head>",
                '<link rel="stylesheet" href="css/mu-select.css">')
    insert_once(dashboard, "</body>",
                '<script src="js/mu-select.js" type="module"></script>')
    report = extension / "report.html"
    insert_once(report, "</head>",
                '<link rel="stylesheet" href="css/mu-select.css">')
    insert_once(report, "</body>",
                '<script src="js/mu-select.js" type="module"></script>')

    # Shared expressive slider styling is applied to every runtime UI, while
    # the original native input event handlers stay authoritative.
    for name in (
        "popup.html", "dashboard.html", "picker-ui.html",
        "unpicker-ui.html", "zapper-ui.html", "report.html",
        "matched-rules.html", "strictblock.html",
    ):
        page = extension / name
        if not page.exists():
            continue
        insert_once(page, "</head>",
                    '<link rel="stylesheet" href="css/mu-slider.css">')
        insert_once(page, "</body>",
                    '<script src="js/mu-slider.js" type="module"></script>')

    manifest_path = extension / "manifest.json"
    manifest = json.loads(manifest_path.read_text("utf-8"))
    manifest["name"] = "muBlock"
    manifest["short_name"] = "muBlock"
    manifest["description"] = "muBlock — expressive, privacy-first filtering powered by uBlock Origin Lite."
    manifest["action"]["default_title"] = "muBlock"
    manifest["action"]["default_icon"] = {str(size): f"img/icon_{size}.png"
                                         for size in (16,32,64,128)}
    manifest["icons"] = {str(size): f"img/icon_{size}.png" for size in (16,32,48,64,128,256,512)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")

    from mu_language_i18n import add_language_messages
    locales = sorted(path.parent.name for path in
        (extension / "_locales").glob("*/messages.json"))
    (extension / "js" / "mu-locales.json").write_text(
        json.dumps(locales, ensure_ascii=False) + "\n", "utf-8")
    for localization in (extension / "_locales").glob("*/messages.json"):
        data = json.loads(localization.read_text("utf-8"))
        data["extName"]["message"] = "muBlock"
        add_language_messages(data, localization.parent.name)
        localization.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")

    from generate_icons import generate
    generate(extension / "img")
    # Replace Lite's legacy vector with the original uBlock Origin logo.
    shutil.copy2(extension / "img/mu-logo.svg", extension / "img/ublock.svg")
    print(f"muBlock UI overlay applied: {extension}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("extension", type=Path)
    options = parser.parse_args()
    main(options.extension.resolve())

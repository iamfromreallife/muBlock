#!/usr/bin/env python3
"""Dependency-free static/integrity tests for an assembled Chromium extension."""
from __future__ import annotations
import json
import pathlib
import sys
import unittest

UPSTREAM = pathlib.Path(sys.argv[1]).resolve()
EXTENSION = pathlib.Path(sys.argv[2]).resolve()
sys.argv = [sys.argv[0]]
ALLOWED_CHANGES = {
    "popup.html",
    "dashboard.html",
}
OVERLAY_FILES = {
    "css/classic-popup.css",
    "css/classic-dashboard.css",
    "js/classic-popup.js",
    "js/classic-dashboard.js",
}


class ExtensionIntegrity(unittest.TestCase):
    def test_manifest_is_mv3_and_byte_identical(self):
        self.assertEqual((UPSTREAM / "manifest.json").read_bytes(),
                         (EXTENSION / "manifest.json").read_bytes())
        manifest = json.loads((EXTENSION / "manifest.json").read_text())
        self.assertEqual(manifest["manifest_version"], 3)
        self.assertEqual(manifest["action"]["default_popup"], "popup.html")
        self.assertTrue((EXTENSION / manifest["background"]["service_worker"].lstrip("/")).is_file())
        for entry in manifest.get("declarative_net_request", {}).get("rule_resources", []):
            self.assertTrue((EXTENSION / entry["path"].lstrip("/")).is_file(), entry["path"])

    def test_all_original_files_preserved(self):
        originals = {str(p.relative_to(UPSTREAM)) for p in UPSTREAM.rglob("*") if p.is_file()}
        actual = {str(p.relative_to(EXTENSION)) for p in EXTENSION.rglob("*") if p.is_file()}
        self.assertEqual(actual, originals | OVERLAY_FILES)
        for relative in sorted(originals - ALLOWED_CHANGES):
            self.assertEqual((UPSTREAM / relative).read_bytes(),
                             (EXTENSION / relative).read_bytes(), relative)

    def test_ui_entrypoints_keep_original_scripts(self):
        popup_original = (UPSTREAM / "popup.html").read_text()
        popup_changed = (EXTENSION / "popup.html").read_text()
        dash_original = (UPSTREAM / "dashboard.html").read_text()
        dash_changed = (EXTENSION / "dashboard.html").read_text()
        self.assertIn('js/popup.js', popup_changed)
        self.assertIn('js/filter-manager-ui.js', dash_changed)
        self.assertIn('js/settings.js', dash_changed)
        self.assertIn('js/classic-popup.js', popup_changed)
        self.assertIn('js/classic-dashboard.js', dash_changed)
        self.assertEqual(
            popup_changed.replace('<link rel="stylesheet" href="css/classic-popup.css">\n', '')
                         .replace('<script src="js/classic-popup.js" type="module"></script>\n', ''),
            popup_original
        )
        self.assertEqual(
            dash_changed.replace('<link rel="stylesheet" href="css/classic-dashboard.css">\n', '')
                        .replace('<script src="js/classic-dashboard.js" type="module"></script>\n', ''),
            dash_original
        )

    def test_original_picker_and_zapper_are_untouched(self):
        protected = [
            'picker-ui.html', 'unpicker-ui.html', 'zapper-ui.html',
            'js/picker-ui.js', 'js/unpicker-ui.js', 'js/zapper-ui.js',
            'css/picker-ui.css', 'css/unpicker-ui.css', 'css/zapper-ui.css',
        ]
        for path in protected:
            if (UPSTREAM / path).exists():
                self.assertEqual((UPSTREAM / path).read_bytes(),
                                 (EXTENSION / path).read_bytes(), path)


if __name__ == "__main__":
    unittest.main(verbosity=2)

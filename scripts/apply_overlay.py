#!/usr/bin/env python3
"""Apply UI-only overlays to an unmodified uBO Lite Chromium distribution."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_NAMES = (
    "css/classic-popup.css",
    "css/classic-dashboard.css",
    "js/classic-popup.js",
    "js/classic-dashboard.js",
)


def insert_once(path: Path, needle: str, value: str) -> None:
    content = path.read_text(encoding="utf-8")
    if content.count(needle) != 1:
        raise RuntimeError(f"Expected exactly one {needle!r} in {path}")
    if value in content:
        raise RuntimeError(f"Overlay already applied to {path}")
    path.write_text(content.replace(needle, value + "\n" + needle), encoding="utf-8")


def apply(extension: Path) -> None:
    if not (extension / "manifest.json").is_file():
        raise RuntimeError(f"Missing upstream manifest.json in {extension}")
    for name in ASSET_NAMES:
        source = ROOT / "overlay" / name
        if not source.is_file():
            raise RuntimeError(f"Missing overlay asset: {source}")
        dest = extension / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            raise RuntimeError(f"Refusing to overwrite upstream asset: {dest}")
        shutil.copy2(source, dest)
    insert_once(
        extension / "popup.html",
        "</head>",
        '<link rel="stylesheet" href="css/classic-popup.css">',
    )
    insert_once(
        extension / "popup.html",
        "</body>",
        '<script src="js/classic-popup.js" type="module"></script>',
    )
    insert_once(
        extension / "dashboard.html",
        "</head>",
        '<link rel="stylesheet" href="css/classic-dashboard.css">',
    )
    insert_once(
        extension / "dashboard.html",
        "</body>",
        '<script src="js/classic-dashboard.js" type="module"></script>',
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("extension", type=Path, help="Unpacked uBO Lite Chromium directory")
    args = parser.parse_args()
    apply(args.extension.resolve())
    print("Applied classic UI-only overlays to", args.extension)

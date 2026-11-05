"""Render the official uBlock Origin emblem in every extension icon size.

Emblem artwork: https://github.com/gorhill/uBlock/blob/master/src/img/ublock.svg
Copyright original uBlock Origin authors; GPL-3.0-or-later.
muBlock changes only its red shield fill to the user-selected #FF0000.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
import cairosvg
from PIL import Image

SIZES = (16, 32, 48, 64, 128, 256, 512)
ACTION_SIZES = (16, 32, 64, 128)


def render(source: str, size: int) -> bytes:
    scale = 4 if size <= 128 else 2
    png = cairosvg.svg2png(
        bytestring=source.encode("utf-8"),
        output_width=size * scale,
        output_height=size * scale,
    )
    image = Image.open(BytesIO(png)).convert("RGBA")
    image = image.resize((size, size), Image.Resampling.LANCZOS)
    out = BytesIO()
    image.save(out, "PNG", optimize=True)
    return out.getvalue()


def generate(folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    svg = (
        Path(__file__).resolve().parents[1] / "overlay/img/mu-logo.svg"
    ).read_text("utf-8")
    # Muted icon is also the original shield shape, in desaturated light grey.
    disabled_svg = svg.replace("#ff0000", "#bac0c9")
    for size in SIZES:
        artwork = render(svg, size)
        # Original Lite filename is deliberate: its original action.js
        # references icon_16, icon_32, icon_64 and icon_128 dynamically.
        (folder / f"icon_{size}.png").write_bytes(artwork)
        (folder / f"mu-{size}.png").write_bytes(artwork)
        if size in ACTION_SIZES:
            muted = render(disabled_svg, size)
            (folder / f"icon_{size}_off.png").write_bytes(muted)
            (folder / f"mu-toolbar-{size}.png").write_bytes(artwork)
            (folder / f"mu-toolbar-off-{size}.png").write_bytes(muted)


if __name__ == "__main__":
    import sys
    generate(Path(sys.argv[1] if len(sys.argv) > 1 else "img"))

#!/usr/bin/env python3
"""Restore the exact audited Fenix player script into muBlock's MV3 MAIN world.

The two small bz2 parts represent the uploaded MV2 YouTube script; only the
file header is reworded for MV3. No MV2 extension APIs are used by this code.
The resulting readable script is committed to overlay/ during release builds.
"""
from pathlib import Path
from hashlib import sha256
import bz2

ROOT = Path(__file__).resolve().parents[1]
parts = (
    ROOT / "scripts" / "fenix_youtube_source.bz2.part1",
    ROOT / "scripts" / "fenix_youtube_source.bz2.part2",
)
compressed = b"".join(p.read_bytes() for p in parts)
assert sha256(compressed).hexdigest() == (
    "a6fd391633a40a8bcc304e0afc4ad38f7247b7b837d70c7b525b8b643bee0699"
), "Fenix YouTube source archive differs from the audited ZIP"
source = bz2.decompress(compressed)
assert sha256(source).hexdigest() == (
    "e1bfb517861c38bfba9d1fd9a39093236f40e274f097df5d2098246125a5523e"
), "Fenix YouTube source does not match uploaded ZIP"
before = b"for MV2.\n"
after = b"for MV3 MAIN world (adapted from Fenix MV2).\n"
assert source.count(before) == 1, "Fenix script header has changed"
source = source.replace(before, after, 1)
assert sha256(source).hexdigest() == (
    "1c8c2351d19fe3ab21a428598f03100f105217d7b2edec1237bc22f8cc1d1236"
), "Unexpected MV3 port output"
destination = ROOT / "overlay" / "js" / "scripting" / "youtube-player.js"
destination.write_bytes(source)
print("Restored audited Fenix YouTube fixes for MV3 MAIN world:", destination)

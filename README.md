# muBlock — expressive content blocking for Chrome

**muBlock** is an independent, unofficial visual redesign of [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home). It keeps the upstream Manifest V3 filtering engine and ruleset architecture while introducing a cohesive Material 3 Expressive-inspired popup, settings dashboard, unified custom-filter manager and refreshed element-picker UI.

This is **not** the official uBlock Origin or uBlock Origin Lite distribution. It does not enable Manifest V2-only functionality. The original authors retain their copyright and licensing.

## Installation

The latest successful [Build muBlock Chrome extension](../../actions/workflows/build-chrome.yml) action provides a downloadable **muBlock-chrome-unpacked** artifact. Extract the ZIP and select the `chrome-unpacked` directory under `chrome://extensions` → Developer mode → Load unpacked.

The fully unpacked distribution is also generated at `dist/chrome-unpacked/` on `main` once the build workflow succeeds.

## Design

- **muBlock branding:** custom icon rendered locally at 16/32/48/64/128 px, purple-tonal surfaces, mint accents and bundled Inter fonts (the upstream package includes the OFL licence).
- **Popup:** Material-inspired power control and an accessible four-mode segmented control, using Lite's **existing permission-aware** filtering mode handlers.
- **Dashboard:** consistent tonal surfaces, rounded controls, semantic colors, icon-led navigation, dark mode, responsive layouts and reduced-motion support.
- **My filters:** **one** searchable list for sandbox custom lines and picker-generated site cosmetics. A toggle opens the original CodeMirror 6 raw editor within the same workspace; the old duplicated Lite `.hostnames` interface and its presentation script are removed. Supported site selectors are parsed with Lite's own parser, and stored through the original messaging API.
- **Element picker/zapper/unpicker:** refreshed overlay appearance and animations, while retaining original picker algorithms and event-handling modules unchanged.

Material 3 Expressive principles center on color, shape, size, motion and containment; this project borrows those principles rather than using official Google branding.

## Import/export and compatibility

The **Settings → Backup/Restore** controls remain the unmodified upstream uBlock Origin Lite backup/restore implementation (`js/backup-restore.js`), with original data structures for filtering modes, enabled lists, sandbox filters, picker-generated filters, and user-defined DNR rules. The My filters workspace also offers `Lite backup` and `Lite restore` shortcuts to those same controls.

`Import text` and `Export text` are convenient text-only filter operations; for **lossless full settings + filter backup**, use the upstream Lite-compatible JSON backup. Note that supported site cosmetics and raw sandbox filters use two separate internal storage models in Lite, even though they appear in a single list in muBlock. Unrecognized filter text is kept as raw sandbox text rather than discarded.

## Development

The source of the design is in `overlay/css/`, `overlay/js/` and `overlay/img/`. The build copies the official Chromium uBO Lite distribution and applies these assets via `scripts/apply_overlay.py`. The icon PNGs are generated with Python standard library tools from `scripts/generate_icons.py`. The selected upstream commit is recorded under `dist/UPSTREAM_COMMIT.txt`.

Filtering engine, permissions, service worker, rulesets and original picker/zapper/unpicker JavaScript remain unchanged.

Run GitHub Actions to fetch upstream, build, verify file integrity, exercise an isolated Chromium extension profile, screenshot the UI and publish a ready-to-load ZIP.

## License

GPL-3.0-or-later, consistent with the parent extension. See `LICENSE`, `THIRD_PARTY_NOTICES.md` and upstream bundled licenses. No remote executable code, telemetry or external font service is introduced.

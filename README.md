# muBlock

**muBlock** is an independent UI-focused fork of [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home). It preserves Lite's Manifest V3 filtering engine, rulesets, element-picker behavior, configuration storage, and backup/restore compatibility.

It is **not** an official uBlock Origin release. Credit for the original filtering functionality belongs to **Raymond Hill** and the upstream uBlock Origin Lite authors and contributors. The UI fork is maintained by **iamfromreallife**.

## Direct download and installation

<!-- MU_INSTALL_START -->
[Open the latest muBlock release and install ZIP](https://github.com/iamfromreallife/MV3uBlockOrigin/releases/latest)
<!-- MU_INSTALL_END -->

**The link above is replaced automatically with a direct ZIP download link after each completed build.** The file is named **muBlock_VERSION.zip**, where VERSION is read from the bundled upstream uBlock Origin Lite manifest.

1. Download and extract the ZIP.
2. Open **chrome://extensions** in Chrome or a compatible Chromium browser.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted **chrome-unpacked** folder.
5. On updates, replace the unpacked extension files, then reload the extension in Chrome. Back up your settings before updating.

Find previous packages under [GitHub Releases](https://github.com/iamfromreallife/MV3uBlockOrigin/releases).

## What's included

- Original uBlock Origin Lite filtering modes, rulesets, and MV3 filtering engine.
- A compact, localized popup with power controls alongside the site name.
- A clean red-and-neutral UI with the classic uBlock Origin shield.
- Rounded dashboard cards and subtle shadows shared by Settings, Filter Lists, Custom Filters, Developer Tools, and About.
- **Custom Filters:** a large editable area for cosmetic rules added by the element picker, shown newest first, with live search in an editable multiline filter view.
- A separate sandbox editor preserving Lite's CodeMirror and storage behavior.
- **Filter Lists:** a short grey description directly after each list's original home icon, with no misleading list-version numbers.
- A compact About tab with distinct titled groups for attribution, version, useful links, contributors, dependencies, and technical details.
- Original uBlock Origin Lite configuration backups and imports/exports.

muBlock adds no replacement filtering engine, telemetry, or remotely loaded code.

## Build and publish

The editable UI overlay lives in **overlay/**, the build helpers in **scripts/**, and the generated Chromium extension in **dist/chrome-unpacked/**.

Open **Actions → Build and publish muBlock → Run workflow** to build manually. A build also starts on the final release-trigger commit to **.github/RELEASE_TRIGGER** in main, after source changes have been merged.

**Every build run:**

1. Gets the current upstream uBlock Origin Lite Chromium extension.
2. Applies the muBlock interface overlay.
3. Produces **muBlock_VERSION.zip**, with VERSION taken from the actual bundled manifest.
4. Uploads the ZIP as an Actions artifact and publishes a [GitHub Release](https://github.com/iamfromreallife/MV3uBlockOrigin/releases).
5. Includes **all commits since the previous release** in the release description, with clickable commit links and the upstream Lite source commit.
6. Updates this README's direct download URL.
7. Keeps only main and the active task branch recorded in **.github/CURRENT_WORK_BRANCH**.

The workflow is **packaging-only: no automated tests and no screenshot reviews**, as requested by the project maintainer. A successful build does not imply browser QA has passed.

## Attribution and license

- [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home) — original extension by Raymond Hill and contributors.
- [uBlock Origin](https://github.com/gorhill/uBlock) — original project and classic icon artwork.
- [muBlock fork](https://github.com/iamfromreallife/MV3uBlockOrigin) — UI adaptation maintained by **iamfromreallife**.

GPL-3.0-or-later; see LICENSE and THIRD_PARTY_NOTICES.md for the applicable notices.

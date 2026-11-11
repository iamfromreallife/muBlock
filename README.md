# muBlock

**muBlock** is an independent UI-focused fork of [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home). It preserves Lite's Manifest V3 filtering engine, rulesets, element-picker behavior, configuration storage, and backup/restore compatibility.

It also resolves some outsanding issues of the original uBlock on youtube, specifically, videos lagging on starting playback.

It is **not** an official uBlock Origin release. Credit for the original filtering functionality belongs to **Raymond Hill** and the upstream uBlock Origin Lite authors and contributors. The UI fork is maintained by **iamfromreallife**.

## Direct download and installation

<!-- MU_INSTALL_START -->
[**Download muBlock_2026.1110.1816.zip directly**](https://github.com/iamfromreallife/muBlock/releases/download/v2026.1110.1816-build.60/muBlock_2026.1110.1816.zip)
<!-- MU_INSTALL_END -->

**The link above is replaced automatically with a direct ZIP download link after each completed build.** The file is named **muBlock_VERSION.zip**, where VERSION is read from the bundled upstream uBlock Origin Lite manifest.

1. Download and extract the ZIP.
2. Open **chrome://extensions** in Chrome or a compatible Chromium browser.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted **chrome-unpacked** folder.
5. On updates, replace the unpacked extension files, then reload the extension in Chrome. Back up your settings before updating.

Find previous packages under [GitHub Releases](https://github.com/iamfromreallife/muBlock/releases).

## What's included

- Original uBlock Origin Lite filtering modes, rulesets, and MV3 filtering engine.
- **Create for all websites:** a separate, translated element-picker action stores a global cosmetic selector (`*##selector`) in the existing My filters store. Global rules use Lite's registered cosmetic injection and honor available host permissions, filtering modes and per-site cosmetic exceptions; remove them in My filters.
- **Per-site Disable cosmetic filtering:** a persistent switch below Remove a custom filter in the popup. It adds a hostname rule (including subdomains) that suppresses Lite's stock, custom, sandbox and imported cosmetic CSS filters for that website while leaving network blocking, scriptlets, filtering modes and permissions unchanged. The rule is backed up and restored with Lite-compatible settings exports; a tab reload applies changes immediately.
- A compact, localized popup with power controls alongside the site name, and a separate bottom Settings footer showing the actual bundled Lite version in muted text.
- **Extension language:** the first Behaviour setting offers the browser default and the Lite UI languages bundled with the installed release. The selected locale is stored locally and takes effect in open extension pages immediately via reload; browser-owned Chrome menus and extension names remain controlled by Chrome. Missing muBlock-only translations fall back to English.
- **Popup labels:** the filtering-mode heading uses black text in light mode, and both that heading and the no-website message capitalize their first letter correctly for the selected language.
- The original full-size uBlock Origin Lite element-picker layout (including its normal height, spacing, controls, and candidate list), retaining muBlock's maroon colours and visual styling.
- A clean maroon (**#800000**) and neutral UI with the classic uBlock Origin shield, including matching toolbar and disabled-state icon variants.
- Rounded dashboard cards and subtle shadows shared by Settings, Filter Lists, Custom Filters, Developer Tools, and About.
- All dashboard tabs use a responsive **1,100px maximum width**. The muBlock logo and navigation tabs are **left-aligned to the outer edges of the dashboard cards**, with horizontal scrolling rather than wrapping on narrow windows. A shared header height and **28px panel gap** keep Filter Lists, Settings, Custom Filters, Developer Tools and About consistently aligned.
- **Custom Filters:** a large editable area for cosmetic rules added by the element picker, shown newest first, with live search in an editable multiline filter view.
- A separate sandbox editor preserving Lite's CodeMirror and storage behavior; the Save icon inherits the Save label's live foreground color.
- **Filter Lists:** one unified, full-width dashboard card containing the rule count, search field and filter groups, with a short grey description directly after each list's original home icon. No misleading list-version numbers.
- A compact About tab with distinct titled groups for attribution, version, useful links, contributors, dependencies, and technical details, without duplicate upstream headings. About links use **Crayola Blue (#1F75FE)**, while attribution lines have equal, compact spacing.
- Original uBlock Origin Lite configuration backups and imports/exports.

muBlock adds no replacement filtering engine, telemetry, or remotely loaded code.

## Build and publish

The editable UI overlay lives in **overlay/**, the build helpers in **scripts/**, and the generated Chromium extension in **dist/chrome-unpacked/**.

Open **Actions → Build and publish muBlock → Run workflow** to build manually. A build also starts on the final release-trigger commit to **.github/RELEASE_TRIGGER** in main, after source changes have been merged.

**Every build run:**

1. Gets the current upstream uBlock Origin Lite Chromium extension.
2. Applies the muBlock interface overlay.
3. Produces **muBlock_VERSION.zip**, with VERSION taken from the actual bundled manifest.
4. Uploads the ZIP as an Actions artifact and publishes a [GitHub Release](https://github.com/iamfromreallife/muBlock/releases).
5. Includes **only the new commits since the previous release** in the release description, with clickable commit links and the upstream Lite source commit.
6. Updates this README's direct download URL.
7. Keeps **only the main branch**, deleting all stale feature branches after successful publishing.

The workflow is **packaging-only: no automated tests and no screenshot reviews**, as requested by the project maintainer. A successful build does not imply browser QA has passed.

## Attribution and license

- [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home) — original extension by Raymond Hill and contributors.
- [uBlock Origin](https://github.com/gorhill/uBlock) — original project and classic icon artwork.
- [muBlock fork](https://github.com/iamfromreallife/muBlock) — UI adaptation maintained by **iamfromreallife**.

GPL-3.0-or-later; see LICENSE and THIRD_PARTY_NOTICES.md for the applicable notices.

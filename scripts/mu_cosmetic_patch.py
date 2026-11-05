"""Minimal, fail-closed uBO Lite adapter for persistent per-site cosmetic rules.

Cosmetic CSS content scripts (specific, generic and user-created) are
excluded for matching hostnames. Declarative network rules, filtering levels,
the picker, and unrelated scriptlets are never changed.
"""
from pathlib import Path


def replace_once(path: Path, before: str, after: str) -> None:
    source = path.read_text("utf-8")
    if source.count(before) != 1:
        raise RuntimeError(f"Upstream cosmetic adapter anchor changed: {path.name}: {before[:90]!r}")
    path.write_text(source.replace(before, after), "utf-8")


def patch_cosmetic_filtering(extension: Path) -> None:
    background = extension / "js" / "background.js"
    replace_once(
        background,
        "const UBOL_ORIGIN = runtime.getURL('').replace(/\\/$/, '').toLowerCase();",
        "import { isCosmeticDisabled, setCosmeticDisabled, "
        "restoreCosmeticDisabledHosts } from './mu-cosmetic-rules.js';\n\n"
        "const UBOL_ORIGIN = runtime.getURL('').replace(/\\/$/, '').toLowerCase();",
    )
    # A content script might be triggered on a page already loaded before
    # registration catches up. Avoid injecting custom CSS on exempt sites.
    replace_once(
        background,
        "    case 'injectCustomFilters':\n"
        "        if ( frameId === false ) { return; }\n"
        "        return injectCustomFilters(tabId, frameId, request.hostname);",
        "    case 'injectCustomFilters':\n"
        "        if ( frameId === false ) { return; }\n"
        "        if ( await isCosmeticDisabled(request.hostname) ) { return; }\n"
        "        return injectCustomFilters(tabId, frameId, request.hostname);",
    )
    # This switch is after Lite's extension-origin trust check. Untrusted
    # content scripts cannot set or enumerate user preferences.
    replace_once(
        background,
        "    switch ( request.what ) {\n\n    case 'applyRulesets': {",
        "    switch ( request.what ) {\n\n"
        "    case 'muGetCosmeticFiltering':\n"
        "        return isCosmeticDisabled(request.hostname);\n\n"
        "    case 'muSetCosmeticFiltering': {\n"
        "        const result = await setCosmeticDisabled(request.hostname, request.disabled);\n"
        "        await registerContentScripts();\n"
        "        return result;\n"
        "    }\n\n"
        "    case 'muRestoreCosmeticFiltering':\n"
        "        await restoreCosmeticDisabledHosts(request.hostnames);\n"
        "        await registerContentScripts();\n"
        "        return true;\n\n"
        "    case 'applyRulesets': {",
    )

    manager = extension / "js" / "scripting-manager.js"
    replace_once(
        manager,
        "const resourceDetailPromises = new Map();",
        "import { getCosmeticDisabledHosts } from './mu-cosmetic-rules.js';\n\n"
        "const resourceDetailPromises = new Map();",
    )
    # Chromium's registered CSS content scripts are the source of truth for
    # Lite generic/specific CSS and the cosmetic user filters. Apply an
    # excludeMatches entry to all three without touching network rules.
    replace_once(
        manager,
        "    ubolLog(\`Unregistered all content (css/js)\`);",
        "    const disabledCosmeticHosts = await getCosmeticDisabledHosts();\n"
        "    if ( disabledCosmeticHosts.length !== 0 ) {\n"
        "        const exceptions = ut.matchesFromHostnames(disabledCosmeticHosts);\n"
        "        for ( const script of toAdd ) {\n"
        "            if ( /^css-(generic|specific|user)/.test(script.id) === false ) { continue; }\n"
        "            script.excludeMatches = [\n"
        "                ...new Set([ ...(script.excludeMatches || []), ...exceptions ]),\n"
        "            ];\n"
        "        }\n"
        "    }\n\n"
        "    ubolLog(\`Unregistered all content (css/js)\`);",
    )

    # Optional additional field is backward-compatible: official Lite
    # ignores unknown fields, while muBlock restores it from its own backups.
    backup = extension / "js" / "backup-restore.js"
    replace_once(
        backup,
        "    return out;\n}",
        "    const cosmeticExceptions = await localRead('muBlockCosmeticDisabledHosts');\n"
        "    if ( Array.isArray(cosmeticExceptions) && cosmeticExceptions.length !== 0 ) {\n"
        "        out.muBlockCosmeticDisabledHosts = cosmeticExceptions;\n"
        "    }\n"
        "    return out;\n}",
    )
    replace_once(
        backup,
        "    await sendMessage({ what: 'updateUserDnrRules' });\n\n}",
        "    await sendMessage({ what: 'updateUserDnrRules' });\n"
        "    await sendMessage({\n"
        "        what: 'muRestoreCosmeticFiltering',\n"
        "        hostnames: targetConfig.muBlockCosmeticDisabledHosts ?? [],\n"
        "    });\n\n}",
    )

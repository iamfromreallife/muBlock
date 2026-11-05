/* muBlock per-site cosmetic filtering exceptions.
 * Adds no DNR rules: network filtering and site filtering modes are untouched.
 * Rules apply to the selected hostname and its subdomains.
 * Stored in extension-local storage and exported by Lite-compatible backups.
 */
export const MU_COSMETIC_KEY = 'muBlockCosmeticDisabledHosts';

function validHostname(value) {
  if (typeof value !== 'string') return '';
  const h = value.trim().toLowerCase().replace(/\.$/, '');
  if (!h || h.length > 253 || h.includes('..') ||
      !/^[a-z0-9.-]+$/.test(h) || h.startsWith('-') ||
      h.endsWith('-') || h.startsWith('.') || h.endsWith('.')) {
    return '';
  }
  return h;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(validHostname).filter(Boolean))).sort();
}

export async function getCosmeticDisabledHosts() {
  const result = await chrome.storage.local.get(MU_COSMETIC_KEY);
  return normalizeList(result?.[MU_COSMETIC_KEY]);
}

export async function isCosmeticDisabled(hostname) {
  const h = validHostname(hostname);
  if (!h) return false;
  const hosts = await getCosmeticDisabledHosts();
  return hosts.some(rule => h === rule || h.endsWith('.' + rule));
}

let pendingWrite = Promise.resolve();
export async function setCosmeticDisabled(hostname, disabled) {
  const h = validHostname(hostname);
  if (!h || typeof disabled !== 'boolean') {
    throw new TypeError('Invalid cosmetic-filtering rule');
  }
  const operation = pendingWrite.then(async () => {
    const before = await getCosmeticDisabledHosts();
    let next;
    if (disabled) {
      next = before.some(rule => h === rule || h.endsWith('.' + rule))
        ? before : [...before, h];
    } else {
      // A broader saved rule also disables cosmetic filtering here.
      // Clearing the active rule re-enables cosmetics on its scope.
      next = before.filter(rule => !(h === rule || h.endsWith('.' + rule)));
    }
    if (next.length > 500) throw new RangeError('Maximum of 500 site exceptions');
    await chrome.storage.local.set({[MU_COSMETIC_KEY]: normalizeList(next)});
    return {disabled: await isCosmeticDisabled(h)};
  });
  pendingWrite = operation.catch(() => {});
  return operation;
}

export async function restoreCosmeticDisabledHosts(value) {
  const next = normalizeList(value);
  if (next.length > 500) throw new RangeError('Maximum of 500 site exceptions');
  const operation = pendingWrite.then(async () => {
    await chrome.storage.local.set({[MU_COSMETIC_KEY]: next});
  });
  pendingWrite = operation.catch(() => {});
  return operation;
}

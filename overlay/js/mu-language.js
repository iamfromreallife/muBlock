/*
 * muBlock UI-only locale selection. This does not change Chrome's own locale,
 * the extension manifest, or Lite's filtering/service-worker configuration.
 * All messages are read from the upstream Lite bundles in _locales.
 */
export const LANGUAGE_KEY = 'muBlock.uiLanguage';
const nativeI18n = chrome.i18n;
const nativeGetMessage = nativeI18n.getMessage.bind(nativeI18n);
const browserLanguage = nativeI18n.getUILanguage();
const normalizeTag = value => String(value || '').replace(/-/g,'_');
const systemTag = normalizeTag(browserLanguage);
const fallbackTag = 'en';

async function loadJSON(path) {
  try {
    const response = await fetch(chrome.runtime.getURL(path));
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
const localeIndex = await loadJSON('js/mu-locales.json');
export const availableLocales = Array.isArray(localeIndex) ? localeIndex : ['en'];
const exists = tag => availableLocales.includes(tag);
function resolveLocale(tag) {
  const candidate = normalizeTag(tag);
  if (exists(candidate)) return candidate;
  const base = candidate.split('_')[0];
  if (exists(base)) return base;
  const sameBase = availableLocales.find(code => code.split('_')[0] === base);
  return sameBase || fallbackTag;
}
let stored = 'system';
try {
  const object = await chrome.storage.local.get(LANGUAGE_KEY);
  if (typeof object[LANGUAGE_KEY] === 'string') stored = object[LANGUAGE_KEY];
} catch { /* Stay with the browser locale when extension storage is blocked. */ }
if (stored !== 'system' && !exists(stored)) stored = 'system';
export const selectedLanguage = stored;
export const activeLocale = resolveLocale(stored === 'system' ? systemTag : stored);
// Expose the actual UI language for screen readers and language-aware text.
document.documentElement.lang = activeLocale.replace(/_/g, '-');
const primaryBundle = (await loadJSON('_locales/'+activeLocale+'/messages.json')) || {};
const englishBundle = activeLocale === fallbackTag
  ? primaryBundle : (await loadJSON('_locales/en/messages.json')) || {};

const params = substitution =>
  substitution === undefined ? [] : Array.isArray(substitution)
    ? substitution.map(String) : [String(substitution)];
function substitute(message, args) {
  let string = String(message?.message || '');
  const placeholders = message?.placeholders || {};
  for (const [name, definition] of Object.entries(placeholders)) {
    const value = String(definition?.content || '').replace(
      /\$(\d+)/g, (_,digit) => args[Number(digit)-1] ?? ''
    );
    string = string.replace(new RegExp('\\$'+name+'\\$', 'gi'), () => value);
  }
  // Chrome permits numbered substitutions directly in message text.
  string = string.replace(/\$(\d+)/g, (_,digit) => args[Number(digit)-1] ?? '');
  return string.replace(/\$\$/g,'$');
}
export function muGetMessage(key, substitutions) {
  if (key === '@@ui_locale') return activeLocale;
  if (key === '@@bidi_dir') return /^(ar|he|fa|ur)(_|$)/.test(activeLocale)
    ? 'rtl' : 'ltr';
  if (String(key).startsWith('@@')) return nativeGetMessage(key, substitutions);
  const message = primaryBundle[key] || englishBundle[key];
  return message ? substitute(message, params(substitutions))
    : nativeGetMessage(key, substitutions);
}
export function capitalizeFirstLetter(text) {
  const locale = activeLocale.replace(/_/g,'-');
  return String(text || '').replace(/\p{L}/u, char => {
    try { return char.toLocaleUpperCase(locale); }
    catch { return char.toUpperCase(); }
  });
}
// No dynamic monkey-patching of chrome.i18n. Reopen each extension page so
// upstream i18n.js can rerender native HTML safely with the new bundle.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !Object.hasOwn(changes, LANGUAGE_KEY)) return;
  const next = changes[LANGUAGE_KEY].newValue || 'system';
  if (next !== stored) location.reload();
});

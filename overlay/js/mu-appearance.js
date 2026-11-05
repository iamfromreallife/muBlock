/*
 * muBlock appearance preferences, shared by all extension UI pages.
 * Does not modify Lite filtering settings or its backup/restore format.
 */
const STORAGE_KEY = 'muBlock.appearance';
const fontNames = {
  inter: '"mu Inter", Inter, system-ui, sans-serif',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  segoe: '"Segoe UI", system-ui, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  tahoma: 'Tahoma, Geneva, sans-serif',
  trebuchet: '"Trebuchet MS", Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  monospace: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};
const fontLabels = {
  inter: 'Inter', system: null, segoe: 'Segoe UI',
  arial: 'Arial', verdana: 'Verdana', tahoma: 'Tahoma',
  trebuchet: 'Trebuchet MS', georgia: 'Georgia',
  times: 'Times New Roman', monospace: null,
};
const allowedThemes = new Set(['system', 'light', 'dark']);
const defaults = Object.freeze({font: 'inter', size: 13, theme: 'system'});
const tr = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
const root = document.documentElement;
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
let current = {...defaults};

function normalize(raw) {
  return {
    font: Object.hasOwn(fontNames, raw?.font) ? raw.font : defaults.font,
    size: Number.isInteger(raw?.size)
      ? Math.max(11, Math.min(18, raw.size)) : defaults.size,
    theme: allowedThemes.has(raw?.theme) ? raw.theme : defaults.theme,
  };
}
function apply() {
  const selectedTheme = current.theme === 'system'
    ? prefersDark.matches ? 'dark' : 'light'
    : current.theme;
  root.classList.toggle('dark', selectedTheme === 'dark');
  root.classList.toggle('light', selectedTheme === 'light');
  root.dataset.muAppearanceTheme = selectedTheme;
  root.style.colorScheme = selectedTheme;
  root.style.setProperty('--mu-family', fontNames[current.font]);
  root.style.setProperty('--font-family', fontNames[current.font]);
  root.style.setProperty('--mu-font-scale', String(current.size / 13));
  root.style.setProperty('--mu-font-px', String(current.size) + 'px');
}
function store() {
  chrome.storage.local.set({[STORAGE_KEY]: {...current}}).catch(console.error);
}
const settings = document.querySelector('section[data-pane="settings"]');
let fontSelect, fontSize, fontSizeValue, themeButtons = [];

function refreshInputs() {
  if (!fontSelect) return;
  fontSelect.value = current.font;
  fontSelect.dispatchEvent(new Event('change', {bubbles: false}));
  fontSize.value = String(current.size);
  fontSizeValue.textContent = current.size + ' px';
  fontSize.setAttribute('aria-valuetext', current.size + ' px');
  for (const [theme, button] of themeButtons) {
    button.setAttribute('aria-pressed', String(current.theme === theme));
  }
}
function row(labelText, className) {
  const line = document.createElement('div');
  line.className = 'mu-appearance-row ' + className;
  const label = document.createElement('label');
  label.className = 'mu-appearance-label';
  label.textContent = labelText;
  line.append(label);
  return {line, label};
}
function setupSettings() {
  if (!settings || settings.querySelector('#mu-appearance')) return;
  const heading = settings.querySelector('h3[data-i18n="behaviorSectionLabel"]');
  const behavior = heading?.closest('div');
  if (!behavior) return;

  const section = document.createElement('div');
  section.id = 'mu-appearance';
  section.className = 'mu-appearance-card';
  const title = document.createElement('h3');
  title.textContent = tr('muAppearanceTitle', 'Appearance');
  section.append(title);

  const fonts = row(tr('muAppearanceFont', 'Font'), 'mu-appearance-font-row');
  fontSelect = document.createElement('select');
  fontSelect.id = 'mu-appearance-font';
  fontSelect.name = 'muAppearanceFont';
  fonts.label.htmlFor = fontSelect.id;
  for (const [key] of Object.entries(fontNames)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = fontLabels[key] ||
      tr(key === 'system' ? 'muAppearanceSystemFont'
        : 'muAppearanceMonospace', key);
    fontSelect.append(option);
  }
  fonts.line.append(fontSelect);
  section.append(fonts.line);
  fontSelect.addEventListener('change', () => {
    if (!Object.hasOwn(fontNames, fontSelect.value)) return;
    current.font = fontSelect.value;
    apply(); store();
  });

  const sizeRow = row(tr('muAppearanceFontSize', 'Font size'), 'mu-appearance-size-row');
  const range = document.createElement('div');
  range.className = 'mu-appearance-size-controls';
  fontSize = document.createElement('input');
  fontSize.id = 'mu-appearance-size';
  fontSize.type = 'range';
  fontSize.min = '11';
  fontSize.max = '18';
  fontSize.step = '1';
  fontSize.name = 'muAppearanceFontSize';
  sizeRow.label.htmlFor = fontSize.id;
  fontSizeValue = document.createElement('output');
  fontSizeValue.htmlFor = fontSize.id;
  fontSizeValue.id = 'mu-appearance-size-value';
  range.append(fontSize, fontSizeValue);
  sizeRow.line.append(range);
  section.append(sizeRow.line);
  fontSize.addEventListener('input', () => {
    current.size = Math.max(11, Math.min(18, Number(fontSize.value)));
    fontSizeValue.textContent = current.size + ' px';
    apply(); store();
  });

  const themeRow = row(tr('muAppearanceTheme', 'Theme'), 'mu-appearance-theme-row');
  const group = document.createElement('div');
  group.className = 'mu-theme-options';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', themeRow.label.textContent);
  const themeKeys = [
    ['system', 'muAppearanceFollowSystem', 'Follow System'],
    ['light', 'muAppearanceLight', 'Light'],
    ['dark', 'muAppearanceDark', 'Dark'],
  ];
  for (const [value, key, fallback] of themeKeys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mu-theme-option';
    button.dataset.theme = value;
    button.textContent = tr(key, fallback);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      current.theme = value;
      apply(); refreshInputs(); store();
    });
    themeButtons.push([value, button]);
    group.append(button);
  }
  themeRow.line.append(group);
  section.append(themeRow.line);
  behavior.after(section);
  refreshInputs();
}
apply();
setupSettings();

prefersDark.addEventListener('change', () => {
  if (current.theme === 'system') apply();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !Object.hasOwn(changes, STORAGE_KEY)) return;
  current = normalize(changes[STORAGE_KEY].newValue);
  apply(); refreshInputs();
});
chrome.storage.local.get(STORAGE_KEY).then(data => {
  current = normalize(data[STORAGE_KEY]);
  apply(); refreshInputs();
}).catch(reason => console.error('muBlock appearance settings could not be loaded', reason));

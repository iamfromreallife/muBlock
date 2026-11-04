/* muBlock dashboard polish. The original Lite settings and list event
 * handlers remain the source of truth for all configuration changes.
 */
const nav = document.querySelector('#dashboard-nav');
if (nav && !nav.querySelector('.mu-brand-word')) {
  const logo = nav.querySelector('.logo');
  if (logo) {
    const img = logo.querySelector('img');
    if (img) {
      img.src = 'img/mu-logo.svg';
      img.alt = 'muBlock';
    }
    const name = document.createElement('span');
    name.className = 'mu-brand-word';
    name.textContent = 'muBlock';
    logo.append(name);
  }
  const icons = {
    settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>',
    rulesets: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    filters: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
    develop: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/>'
  };
  for (const btn of nav.querySelectorAll('.tabButton')) {
    const {pane} = btn.dataset;
    const i = document.createElement('span');
    i.className = 'mu-icon';
    i.setAttribute('aria-hidden','true');
    i.innerHTML = '<svg viewBox="0 0 24 24">' + (icons[pane] || icons.settings) + '</svg>';
    btn.prepend(i);
    btn.style.display = 'inline-flex';
    btn.style.gap = '8px';
    btn.style.alignItems = 'center';
    if (pane === 'filters' && chrome.i18n.getUILanguage().startsWith('en')) {
      const textNode = Array.from(btn.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = 'My filters';
    }
  }
}
document.title = 'muBlock — Settings';

const about = document.querySelector('#aboutNameVer');
if (about) {
  const observer = new MutationObserver(() => {
    if (about.textContent.includes('uBO Lite')) {
      about.textContent = about.textContent.replaceAll('uBO Lite','muBlock');
    }
  });
  observer.observe(about,{childList:true});
}

const settingsBackup = document.querySelector(
  'section[data-pane="settings"] button:has([data-i18n="backupButton"])'
);
if (settingsBackup) {
  const card = settingsBackup.closest('div');
  if (card && !card.querySelector('.mu-backup-note')) {
    const note = document.createElement('p');
    note.className = 'mu-backup-note';
    note.textContent = 'Backup files use uBlock Origin Lite’s original format and can be restored with its existing data importer.';
    note.style.cssText = 'font-size:12px;color:var(--mu-text-muted);margin:12px 0 0';
    card.append(note);
  }
}

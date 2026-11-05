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

/* The actual source of truth is the upstream Lite manifest copied by the
 * build. Its version is never hardcoded or changed by the muBlock overlay. */
const about = document.querySelector('#aboutNameVer');
if (about) {
  const manifest = chrome.runtime.getManifest();
  const expected = 'muBlock - based on uBlock Origin Lite ' + manifest.version;
  const syncVersion = () => {
    if (about.textContent !== expected) about.textContent = expected;
  };
  new MutationObserver(syncVersion).observe(about, {
    childList: true, characterData: true, subtree: true
  });
  syncVersion();
}

/* Attribution at the beginning of About; Lite authors receive full credit. */
const muAbout=document.querySelector('section[data-pane="about"] .body');
if(muAbout&&!muAbout.querySelector('.mu-about-fork')){
  const block=document.createElement('div');
  block.className='mu-about-fork';
  const pt=(chrome.i18n.getUILanguage()||'en').toLowerCase().startsWith('pt');
  const credit=document.createElement('p');
  credit.className='mu-about-upstream';
  credit.textContent=pt
    ? 'muBlock é uma versão com uma nova interface visual do uBlock Origin Lite. Todos os créditos pelo motor de filtragem e funcionalidades originais pertencem a Raymond Hill e aos restantes autores e colaboradores do uBlock Origin Lite.'
    : 'muBlock is a visual reskin of uBlock Origin Lite. All credit for the original filtering engine and functionality belongs to Raymond Hill and the other uBlock Origin Lite authors and contributors.';
  const upstream=document.createElement('a');
  upstream.href='https://github.com/uBlockOrigin/uBOL-home';
  upstream.target='_blank';upstream.rel='noopener noreferrer';
  upstream.textContent='uBlock Origin Lite';
  const author=document.createElement('p');
  author.className='mu-about-author';
  author.textContent=(pt?'Autor desta versão: ':'Fork author: ')+'iamfromreallife';
  const fork=document.createElement('a');
  fork.href='https://github.com/iamfromreallife/MV3uBlockOrigin';
  fork.target='_blank';fork.rel='noopener noreferrer';fork.textContent='muBlock · GitHub';
  block.append(credit,upstream,author,fork);
  muAbout.prepend(block);
}


/* Compact, clearly separated About groups. All original links/details are
 * moved, never recreated, so upstream destinations and handlers survive. */
if (muAbout && !muAbout.querySelector('.mu-about-grid')) {
  const pt = (chrome.i18n.getUILanguage() || 'en').toLowerCase().startsWith('pt');
  const labels = pt ? {
    intro: 'Sobre o muBlock', version: 'Versão e direitos',
    links: 'Ligações úteis', contributors: 'Contribuidores',
    dependencies: 'Dependências', technical: 'Informações adicionais',
  } : {
    intro: 'About muBlock', version: 'Version and copyright',
    links: 'Useful links', contributors: 'Contributors',
    dependencies: 'Dependencies', technical: 'More information',
  };
  const original = Array.from(muAbout.children);
  const claimed = new Set();
  const grid = document.createElement('div');
  grid.className = 'mu-about-grid';

  function card(key, nodes, extraClass = '') {
    const group = nodes.filter(node => node && !claimed.has(node));
    if (!group.length) return;
    const section = document.createElement('section');
    section.className = 'mu-about-group mu-about-' + key + (extraClass ? ' ' + extraClass : '');
    section.setAttribute('aria-label', labels[key]);
    const heading = document.createElement('h3');
    heading.textContent = labels[key];
    section.append(heading);
    for (const node of group) {
      claimed.add(node);
      section.append(node);
    }
    grid.append(section);
  }

  const fork = muAbout.querySelector(':scope > .mu-about-fork');
  const version = muAbout.querySelector(':scope > #aboutNameVer');
  const copyright = version?.nextElementSibling?.classList.contains('liul')
    ? version.nextElementSibling : null;
  const contributorsLabel = original.find(el =>
    el.querySelector('[data-i18n="aboutContributors"]'));
  const dependenciesLabel = original.find(el =>
    el.querySelector('[data-i18n="aboutDependencies"]'));
  const contributorLinks = contributorsLabel?.nextElementSibling?.classList.contains('liul')
    ? contributorsLabel.nextElementSibling : null;
  const dependencyLinks = dependenciesLabel?.nextElementSibling?.classList.contains('liul')
    ? dependenciesLabel.nextElementSibling : null;
  const standaloneLinks = original.filter(el =>
    el.classList.contains('li') && el.querySelector(':scope > a[href]'));

  card('intro', [fork], 'mu-about-wide');
  card('version', [version, copyright], 'mu-about-wide');
  card('links', standaloneLinks);
  card('contributors', [contributorLinks]);
  card('dependencies', [dependencyLinks]);
  // Retain Lite's support/diagnostics UI, including any upstream additions.
  card('technical', original.filter(el =>
    !claimed.has(el) && el !== contributorsLabel && el !== dependenciesLabel));

  // The original About labels were used only to identify/move the upstream
  // link groups. Their own content is now represented by our card headings;
  // leaving them in the source container caused two stray titles above the
  // redesigned About page and an unnecessary empty left column.
  contributorsLabel?.remove();
  dependenciesLabel?.remove();
  muAbout.replaceChildren(grid);
}

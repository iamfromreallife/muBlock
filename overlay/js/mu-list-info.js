/* Lightweight informational labels for uBO Lite filter-list entries.
 * The original filter-lists.js owns every list, checkbox and runtime action.
 * List-specific versions are intentionally not displayed. Descriptions
 * follow the original home icon in Lite's native iconbar.
 */
const container = document.querySelector('#lists');
const pt = (chrome.i18n.getUILanguage() || 'en').toLowerCase().startsWith('pt');
const es = (chrome.i18n.getUILanguage() || '').toLowerCase().startsWith('es');
const fr = (chrome.i18n.getUILanguage() || '').toLowerCase().startsWith('fr');

const infoById = {
  'ublock-filters': [
    'Bloqueia anúncios, rastreadores e elementos indesejados em páginas web.',
    'Blocks adverts, trackers and unwanted website elements.'
  ],
  'easylist': [
    'Bloqueia publicidade e espaços publicitários em muitos sites.',
    'Blocks advertising and ad placements on many websites.'
  ],
  'easyprivacy': [
    'Reduz rastreadores e pedidos usados para recolher dados de navegação.',
    'Reduces tracking and requests that collect browsing data.'
  ],
  'pgl': [
    'Bloqueia domínios conhecidos por fornecer anúncios e rastreio.',
    'Blocks domains known to serve advertising and tracking.'
  ],
  'ublock-badware': [
    'Proteção adicional contra domínios e recursos potencialmente maliciosos.',
    'Additional protection against potentially malicious domains and resources.'
  ],
  'urlhaus-full': [
    'Bloqueia endereços associados à distribuição de software malicioso.',
    'Blocks URLs associated with malicious software distribution.'
  ],
  'adguard-mobile': [
    'Filtros de publicidade especialmente orientados para sites móveis.',
    'Advertising filters tailored to mobile websites.'
  ],
  'block-lan': [
    'Ajuda a impedir tentativas de acesso de sites a dispositivos da rede local.',
    'Helps block website attempts to access devices on the local network.'
  ],
  'adguard-spyware-url': [
    'Remove ou bloqueia mecanismos de rastreio presentes em endereços URL.',
    'Removes or blocks tracking mechanisms embedded in URLs.'
  ],
  'annoyances-ai': [
    'Oculta elementos e widgets relacionados com funcionalidades de IA.',
    'Hides AI-related interface widgets and prompts.'
  ],
  'annoyances-cookies': [
    'Oculta avisos e caixas de consentimento de cookies, quando suportado.',
    'Hides cookie notices and consent overlays where supported.'
  ],
  'annoyances-overlays': [
    'Oculta sobreposições e painéis intrusivos das páginas.',
    'Hides intrusive website overlays and panels.'
  ],
  'annoyances-social': [
    'Oculta botões e widgets de partilha nas redes sociais.',
    'Hides social sharing buttons and widgets.'
  ],
  'annoyances-widgets': [
    'Oculta widgets de conversação e apoio ao cliente.',
    'Hides chat and customer-support widgets.'
  ],
  'annoyances-others': [
    'Reduz outros elementos incómodos, avisos e promoções.',
    'Reduces other intrusive widgets, notices and promotions.'
  ],
  'annoyances-notifications': [
    'Oculta convites e avisos relacionados com notificações.',
    'Hides prompts and notices concerning notifications.'
  ],
  'ublock-experimental': [
    'Regras experimentais; podem afetar a apresentação de alguns sites.',
    'Experimental rules; may affect how some websites are displayed.'
  ],
  'ubol-tests': [
    'Filtros de teste destinados ao desenvolvimento do uBlock Origin Lite.',
    'Test filters used for uBlock Origin Lite development.'
  ],
};

const generalInfo = {
  'ads': [
    'Filtros complementares para anúncios e elementos publicitários.',
    'Supplementary blocking for advertising and promotional content.'
  ],
  'privacy': [
    'Filtros complementares de privacidade e proteção contra rastreio.',
    'Supplementary privacy and anti-tracking protection.'
  ],
  'malware': [
    'Proteção adicional contra endereços e recursos potencialmente maliciosos.',
    'Additional blocking of potentially malicious addresses and resources.'
  ],
  'annoyances': [
    'Oculta elementos intrusivos ou incómodos durante a navegação.',
    'Hides intrusive or distracting website elements.'
  ],
  'regions': [
    'Filtros regionais adaptados à língua e aos sites da região indicada.',
    'Regional filtering tailored to the indicated language and websites.'
  ],
  'default': [
    'Filtros gerais de publicidade, rastreadores e conteúdo indesejado.',
    'General filtering for advertising, tracking and unwanted content.'
  ],
  'imported': [
    'Lista externa importada pelo utilizador; consulte a respetiva origem.',
    'External list imported by the user; consult its original source.'
  ],
  'misc': [
    'Filtros suplementares para os conteúdos identificados no nome da lista.',
    'Additional filters for the content identified by the list name.'
  ],
};

function purpose(rule) {
  const tailored = infoById[rule.id];
  if (tailored) return tailored[pt ? 0 : 1];
  const category = rule.group || 'misc';
  const translation = generalInfo[category] || generalInfo.misc;
  if (es && !tailored) {
    if (category === 'regions') return 'Filtros regionales para sitios e idiomas de la región indicada.';
    if (category === 'privacy') return 'Filtros adicionales contra el rastreo y para mejorar la privacidad.';
    if (category === 'ads') return 'Filtros complementarios para anuncios y contenido publicitario.';
  }
  if (fr && !tailored) {
    if (category === 'regions') return 'Filtres régionaux adaptés aux sites et langues de la région.';
    if (category === 'privacy') return 'Filtres complémentaires pour la confidentialité et contre le suivi.';
    if (category === 'ads') return 'Filtres supplémentaires contre les publicités.';
  }
  return translation[pt ? 0 : 1];
}

function addInformation() {
  const details = self.cachedRulesetData?.rulesetDetails;
  if (!Array.isArray(details)) return;
  const byId = new Map(details.map(rule => [rule.id, rule]));

  for (const entry of container.querySelectorAll('.listEntry[data-role="leaf"][data-rulesetid]')) {
    const rule = byId.get(entry.dataset.rulesetid);
    if (!rule) continue;
    const info = purpose(rule);
    // Keep the description in the original Lite iconbar directly after the
    // small home link. Never move or recreate the native checkbox/name/icon.
    const bar = entry.querySelector(':scope > .detailbar > .iconbar');
    if (!bar) continue;
    let note = bar.querySelector(':scope > .mu-list-info-inline');
    if (!note) {
      note = document.createElement('span');
      note.className = 'mu-list-info-inline';
      note.setAttribute('aria-label', pt ? 'Descrição da lista' : 'Filter list description');
      bar.append(note);
    }
    if (note.textContent !== info) note.textContent = info;
  }
}

if (container) {
  addInformation();

  // Lite builds and updates its list tree asynchronously. Only listen for
  // additions of list entries; ignore our own informational paragraphs.
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const added of record.addedNodes) {
        if (added.nodeType !== Node.ELEMENT_NODE) continue;
        if (added.matches?.('.listEntry, .listEntries') ||
            added.querySelector?.('.listEntry[data-role="leaf"]')) {
          addInformation();
          return;
        }
      }
    }
  });
  observer.observe(container, {childList: true, subtree: true});
}

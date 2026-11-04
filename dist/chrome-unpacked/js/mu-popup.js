/* muBlock Material Expressive popup presentation.
 * Original uBO Lite popup.js handles permission requests, site modes,
 * action buttons and actual filtering. We delegate to its controls.
 */
const root = document.querySelector('main');
const slider = document.querySelector('.filteringModeSlider');
const hostname = document.querySelector('#hostname');

const glyphs = {
  power: '<circle cx="12" cy="12" r="9"/><path d="M12 2v11"/>',
  off: '<circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/>',
  basic: '<path d="M12 3 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/>',
  optimal: '<path d="M12 2 21 6v6c0 5-4 8.5-9 10-5-1.5-9-5-9-10V6z"/><path d="m8.3 12 2.5 2.5 5-5.3"/>',
  complete: '<path d="m12 2 9 4v6c0 5-4 8.5-9 10-5-1.5-9-5-9-10V6z"/><path d="m9 12 2 2 4.5-4.5"/><path d="M8 17h8"/>'
};
const icon = name => {
  const holder = document.createElement('span');
  holder.className = 'mu-icon';
  holder.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + glyphs[name] + '</svg>';
  return holder;
};
if (root && slider && hostname && !document.querySelector('#mu-popup-header')) {
  const head = document.createElement('header');
  head.id = 'mu-popup-header';
  const logo = document.createElement('span');
  logo.className = 'mu-pop-brand';
  logo.innerHTML = '<img src="img/mu-logo.svg" alt="" aria-hidden="true"><span>muBlock</span>';
  const caption = document.createElement('span');
  caption.className = 'mu-pop-caption';
  caption.textContent = 'Privacy controls';
  head.append(logo, caption);
  root.prepend(head);

  const hero = document.createElement('section');
  hero.id = 'mu-hero';
  const power = document.createElement('button');
  power.id = 'mu-power';
  power.type = 'button';
  power.append(icon('power'));
  const state = document.createElement('div');
  state.id = 'mu-filtering-state';
  state.setAttribute('aria-live', 'polite');
  state.textContent = 'Checking protection';
  const substate = document.createElement('div');
  substate.className = 'mu-substate';
  substate.textContent = 'Protection for this website';
  hero.append(power, state, substate);

  const modePanel = document.createElement('section');
  modePanel.id = 'mu-modes-wrap';
  const title = document.createElement('h2');
  title.className = 'mu-section-title';
  title.textContent = 'Filtering strength';
  const modes = document.createElement('div');
  modes.id = 'mu-mode-buttons';
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Filtering strength for current website');
  const explanations = [
    'Filtering disabled for this website',
    'Basic protection',
    'Optimal protection with supported cosmetic filtering',
    'Complete protection with supported enhanced filtering',
  ];
  const labels = ['Off','Basic','Optimal','Complete'];
  const buttons = labels.map((label, index) => {
    const b = document.createElement('button');
    b.className = 'mu-mode-btn';
    b.type = 'button';
    b.setAttribute('data-level', String(index));
    b.setAttribute('aria-pressed','false');
    b.setAttribute('aria-label',
      chrome.i18n.getMessage('filteringMode' + index + 'Name') || label);
    b.append(icon(['off','basic','optimal','complete'][index]));
    const span = document.createElement('span');
    span.textContent = label;
    b.append(span);
    b.addEventListener('click', () => selectLevel(index));
    modes.append(b);
    return b;
  });
  const help = document.createElement('p');
  help.className = 'mu-mode-help';
  help.setAttribute('aria-live','polite');
  modePanel.append(title,modes,help);

  slider.before(hero,modePanel);
  let lastEnabled = 2;
  let level = null;

  function selectLevel(n) {
    if (document.body.classList.contains('busy') || document.body.classList.contains('nodata')) return;
    const original = slider.querySelector('span[data-level="' + n + '"]');
    if (original) original.click(); // same permission-aware original Lite event path
  }
  function sync() {
    const next = Number.parseInt(slider.dataset.level,10);
    const noSite = document.body.classList.contains('nodata');
    if (!Number.isInteger(next) || next < 0 || next > 3) {
      power.disabled = true;
      power.classList.add('off');
      state.textContent = noSite ? 'Not a website' : 'Checking protection';
      substate.textContent = noSite
        ? 'Open a website to configure protection'
        : 'Protection for this website';
      help.textContent = noSite ? 'Filtering controls are available on websites.' : '';
      buttons.forEach(button => { button.disabled = true; });
      return;
    }
    level = next;
    if (next > 0) lastEnabled = next;
    power.disabled = noSite;
    power.classList.toggle('off',next === 0);
    power.setAttribute('aria-pressed', String(next !== 0));
    power.setAttribute('aria-label',
      next === 0 ? 'Enable site protection' : 'Disable site protection');
    state.textContent = noSite ? 'Not a website' : next === 0 ? 'Protection paused' : labels[next] + ' protection';
    substate.textContent = noSite ? 'Open a website to configure protection' : 'Protection for this website';
    help.textContent = explanations[next];
    buttons.forEach((button,i) => {
      button.disabled = noSite;
      button.setAttribute('aria-pressed',String(i === next));
    });
  }
  power.addEventListener('click', () => {
    if (!power.disabled && level !== null) selectLevel(level === 0 ? lastEnabled : 0);
  });
  new MutationObserver(sync).observe(slider, {attributes:true, attributeFilter:['data-level']});
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  sync();
}

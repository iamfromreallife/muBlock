/*
 * muBlock unified custom filter workspace.
 * Both Lite storage models are presented in one list:
 *   - sandboxFilters (raw lines; CodeMirror 6 native editor)
 *   - site.<hostname> compiled cosmetic selectors (element picker)
 *
 * The old .hostnames UI / filter-manager-ui.js is intentionally not loaded.
 * We use Lite's own runtime messages and syntax parser for edits.
 */
import { sendMessage, browser } from './ext.js';
import { FilterEditor } from './filter-editor.js';
import * as sfp from './static-filtering-parser.js';
import punycode from './punycode.js';

const pane = document.querySelector('#mu-filters');
const originalEditor = pane?.querySelector('#sandboxEditor');

if (pane && originalEditor && !pane.querySelector('#mu-filter-list')) {
  let editor = null;
  let started = false;
  let currentRows = [];
  let renderToken = 0;
  let renderTimer = 0;
  const iconPaths = {
    add: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="m5 19 4-.9 10-10-3.1-3.1-10 10L5 19z"/><path d="m14 7 3 3"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a16 16 0 0 1 0 18M12 3a16 16 0 0 0 0 18"/>'
  };
  const icon = type => {
    const el = document.createElement('span');
    el.className = 'mu-icon';
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + iconPaths[type] + '</svg>';
    return el;
  };
  const button = (label, classname='mu-button', handler) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classname;
    b.textContent = label;
    if (handler) b.addEventListener('click',handler);
    return b;
  };
  const showToast = (text,error=false) => {
    const old = document.querySelector('#mu-toast');
    old?.remove();
    const el = document.createElement('div');
    el.id = 'mu-toast';
    el.className = 'mu-toast';
    el.setAttribute('role','status');
    el.textContent = text;
    if (error) {
      el.style.background = 'var(--mu-error)';
      el.style.color = 'var(--mu-surface)';
    }
    document.body.append(el);
    window.setTimeout(() => el.remove(), 3800);
  };
  const header = document.createElement('div');
  header.className = 'mu-filters-title';
  const intro = document.createElement('div');
  intro.innerHTML = '<h2>My filters</h2><p>One place for custom rules and element-picker filters.</p>';
  const actions = document.createElement('div');
  actions.className = 'mu-filters-actions';

  const editorToggle = button('Raw editor', 'mu-button mu-button-quiet');
  const add = button('Add filter', 'mu-button mu-button-primary');
  const importText = button('Import text');
  const exportText = button('Export text');
  const backup = button('Lite backup','mu-button mu-button-quiet');
  const restore = button('Lite restore','mu-button mu-button-quiet');
  actions.append(add, importText, exportText, backup, restore, editorToggle);
  header.append(intro, actions);

  const controls = document.createElement('div');
  controls.className = 'mu-filter-toolbar';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'mu-filter-search';
  search.placeholder = 'Search by domain, selector or filter';
  search.setAttribute('aria-label','Search filters');
  const source = document.createElement('select');
  source.id = 'mu-filter-source';
  source.setAttribute('aria-label','Filter source');
  for (const [value,label] of [['all','All filters'],['sandbox','Custom rules'],['site','Element picker']]) {
    const opt = document.createElement('option');
    opt.value = value; opt.textContent = label; source.add(opt);
  }
  const count = document.createElement('span');
  count.id = 'mu-filter-count';
  controls.append(search, source, count);

  const list = document.createElement('ul');
  list.id = 'mu-filter-list';
  list.setAttribute('aria-label','Saved custom filters');
  const empty = document.createElement('div');
  empty.id = 'mu-filter-empty';
  empty.textContent = 'No filters found. Add a rule or use the element picker on a webpage.';

  const rawDrawer = document.createElement('details');
  rawDrawer.className = 'mu-raw-drawer';
  rawDrawer.id = 'mu-raw-drawer';
  const summary = document.createElement('summary');
  summary.textContent = 'Advanced raw editor · uses the original Lite filtering engine';
  rawDrawer.append(summary, originalEditor);
  pane.prepend(header,controls,list,empty,rawDrawer);

  editorToggle.addEventListener('click', () => {
    rawDrawer.open = !rawDrawer.open;
    if (rawDrawer.open) originalEditor.querySelector('.cm-content')?.focus();
  });

  const dialog = document.createElement('dialog');
  dialog.className = 'mu-filter-editor-dialog';
  dialog.innerHTML = '<h3 id="mu-dialog-heading">Edit filter</h3>'
    + '<label for="mu-dialog-type">Filter type</label>'
    + '<select id="mu-dialog-type"><option value="sandbox">Custom filter line</option>'
    + '<option value="site">Element-picker style rule</option></select>'
    + '<label for="mu-dialog-value">Filter text</label>'
    + '<textarea id="mu-dialog-value" spellcheck="false" placeholder="example.org##.ad-banner"></textarea>'
    + '<p class="mu-filter-message" role="alert"></p>'
    + '<div class="mu-dialog-actions">'
    + '<button class="mu-button mu-button-quiet" type="button" data-action="cancel">Cancel</button>'
    + '<button class="mu-button mu-button-primary" type="button" data-action="save">Save filter</button>'
    + '</div>';
  document.body.append(dialog);
  const dialogInput = dialog.querySelector('#mu-dialog-value');
  const dialogType = dialog.querySelector('#mu-dialog-type');
  const dialogTitle = dialog.querySelector('#mu-dialog-heading');
  const dialogError = dialog.querySelector('.mu-filter-message');
  let dialogRow = null;

  const confirmDialog = document.createElement('dialog');
  confirmDialog.className = 'mu-filter-editor-dialog';
  confirmDialog.innerHTML = '<h3>Delete filter?</h3>'
    + '<p class="mu-muted">This removes the filter from Lite storage. You can export a backup before continuing.</p>'
    + '<div class="mu-dialog-actions">'
    + '<button type="button" class="mu-button mu-button-quiet" data-action="cancel">Keep filter</button>'
    + '<button type="button" class="mu-button mu-button-danger" data-action="confirm">Delete</button>'
    + '</div>';
  document.body.append(confirmDialog);
  const confirmDelete = () => new Promise(resolve => {
    const cancel = confirmDialog.querySelector('[data-action="cancel"]');
    const yes = confirmDialog.querySelector('[data-action="confirm"]');
    const finish = accepted => {
      cancel.removeEventListener('click',onCancel);
      yes.removeEventListener('click',onYes);
      confirmDialog.removeEventListener('close',onClose);
      confirmDialog.close();
      resolve(accepted);
    };
    const onCancel = () => finish(false);
    const onYes = () => finish(true);
    const onClose = () => {
      cancel.removeEventListener('click',onCancel);
      yes.removeEventListener('click',onYes);
      resolve(false);
    };
    cancel.addEventListener('click',onCancel);
    yes.addEventListener('click',onYes);
    confirmDialog.addEventListener('close',onClose,{once:true});
    confirmDialog.showModal();
  });

  function normalizeSandboxLines() {
    if (!editor) return [];
    const content = editor.getContent().replace(/\n$/, '');
    return content ? content.split('\n') : [];
  }
  function printableSelector(selector) {
    if (!selector.startsWith('{')) return selector;
    try {
      const decoded = JSON.parse(selector);
      return typeof decoded.raw === 'string' ? decoded.raw : selector;
    } catch { return selector; }
  }
  function parseSiteLine(value) {
    const i = value.indexOf('##');
    if (i < 1) throw new Error('Enter a rule in the format domain.example##selector');
    const prettyHostname = value.slice(0,i).trim();
    const selector = value.slice(i+2).trim();
    if (!selector || !prettyHostname) throw new Error('A website and a selector are required.');
    const hostname = punycode.toASCII(prettyHostname);
    let url;
    try { url = new URL('https://' + hostname + '/'); } catch {}
    if (!url || url.hostname !== hostname || !hostname.includes('.') || hostname.includes('*')) {
      throw new Error('Enter a valid website hostname without a protocol.');
    }
    const parser = new sfp.AstFilterParser({ nativeCssHas: true, trustedSource: true });
    parser.parse('##' + selector);
    if (parser.hasError() || !parser.isCosmeticFilter() ||
        typeof parser.result.compiled !== 'string' || !parser.result.compiled) {
      throw new Error('This selector is not supported as a site cosmetic filter by Lite.');
    }
    return { hostname, selector: parser.result.compiled };
  }
  async function updateSandboxLine(index, value) {
    const lines = normalizeSandboxLines();
    if (index !== null && (index < 0 || index >= lines.length)) {
      throw new Error('That filter was changed in another window. Refresh and try again.');
    }
    if (index === null) lines.push(value);
    else if (value === null) lines.splice(index,1);
    else lines[index] = value;
    editor.setContent(lines.join('\n'));
    await editor.saveContent();
    scheduleRender();
  }
  async function updateSiteRow(old, value) {
    const replacement = parseSiteLine(value);
    if (old && old.hostname === replacement.hostname && old.selector === replacement.selector) return;
    // Add first: a failed add must not delete the original stored filter.
    const result = await sendMessage({
      what: 'addCustomFilters', hostname: replacement.hostname,
      selectors: [replacement.selector]
    });
    if (result === undefined || result === null) {
      // Lite may return false for an already-existing duplicate, which is okay.
    }
    if (old) {
      await sendMessage({what:'removeCustomFilters',hostname:old.hostname,selectors:[old.selector]});
    }
    await render();
  }

  async function saveDialog() {
    const value = dialogInput.value.trim();
    dialogError.textContent = '';
    if (!value) {
      dialogError.textContent = 'Enter a filter first.';
      return;
    }
    const saveButton = dialog.querySelector('[data-action="save"]');
    saveButton.disabled = true;
    try {
      if (dialogType.value === 'site') {
        await updateSiteRow(dialogRow?.source === 'site' ? dialogRow : null,value);
        if (dialogRow?.source === 'sandbox') {
          await updateSandboxLine(dialogRow.index,null);
        }
      } else {
        await updateSandboxLine(dialogRow?.source === 'sandbox' ? dialogRow.index : null,value);
        if (dialogRow?.source === 'site') {
          await sendMessage({what:'removeCustomFilters',
            hostname:dialogRow.hostname, selectors:[dialogRow.selector]});
        }
      }
      dialog.close();
      showToast('Filter saved');
      await render();
    } catch(error) {
      dialogError.textContent = String(error?.message || error);
    } finally {
      saveButton.disabled = false;
    }
  }
  dialog.querySelector('[data-action="save"]').addEventListener('click',saveDialog);
  dialog.querySelector('[data-action="cancel"]').addEventListener('click',()=>dialog.close());
  dialogInput.addEventListener('keydown',e=>{
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); saveDialog();
    }
  });
  const openEditor = row => {
    dialogRow = row || null;
    dialogError.textContent = '';
    dialogTitle.textContent = row ? 'Edit filter' : 'Add filter';
    dialogType.value = row?.source || 'sandbox';
    dialogInput.value = row
      ? row.source === 'site'
        ? punycode.toUnicode(row.hostname) + '##' + printableSelector(row.selector)
        : row.value
      : '';
    dialog.showModal();
    dialogInput.focus();
  };
  add.addEventListener('click',()=>openEditor(null));

  function actionButton(type,label,handler) {
    const el = document.createElement('button');
    el.className = 'mu-filter-action' + (type === 'trash' ? ' danger' : '');
    el.type = 'button';
    el.title = label;
    el.setAttribute('aria-label',label);
    el.append(icon(type));
    el.addEventListener('click',handler);
    return el;
  }
  async function removeRow(row) {
    if (!(await confirmDelete())) return;
    try {
      if (row.source === 'sandbox') {
        await updateSandboxLine(row.index,null);
      } else {
        await sendMessage({what:'removeCustomFilters',
          hostname:row.hostname,selectors:[row.selector]});
      }
      showToast('Filter removed');
      await render();
    } catch (error) { showToast(String(error),true); }
  }
  function makeRow(row) {
    const li = document.createElement('li');
    const body = document.createElement('div');
    body.className = 'mu-filter-row';
    const badge = document.createElement('div');
    badge.className = 'mu-filter-swatch ' + (row.source === 'site' ? 'site' : '');
    badge.append(icon(row.source === 'site' ? 'site' : 'filter'));
    const content = document.createElement('div');
    content.className = 'mu-filter-content';
    const primary = document.createElement('div');
    primary.className = 'mu-filter-primary';
    const display = row.source === 'site'
      ? punycode.toUnicode(row.hostname) + '##' + printableSelector(row.selector)
      : row.value;
    primary.textContent = display;
    const meta = document.createElement('div');
    meta.className = 'mu-filter-meta';
    meta.textContent = row.source === 'site' ? 'Element picker · ' + row.hostname : 'Custom rule';
    content.append(primary,meta);
    const copy = actionButton('copy','Copy filter',async()=>{
      try { await navigator.clipboard.writeText(display); showToast('Filter copied'); }
      catch { showToast('Clipboard unavailable',true); }
    });
    const edit = actionButton('edit','Edit filter',()=>openEditor(row));
    const del = actionButton('trash','Delete filter',()=>removeRow(row));
    body.append(badge,content,copy,edit,del);
    li.append(body);
    return li;
  }

  async function render() {
    const token = ++renderToken;
    const raw = normalizeSandboxLines();
    let sites = [];
    try {
      sites = await sendMessage({what:'getAllCustomFilters'}) || [];
    } catch(error) {
      showToast('Unable to load site filters: '+String(error),true);
    }
    if (token !== renderToken) return;
    const rawRows = raw.map((value,index)=>({source:'sandbox',index,value}))
      .filter(row=>row.value.trim() !== '');
    const siteRows = [];
    for (const entry of sites) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [hostname,selectors] = entry;
      if (typeof hostname !== 'string' || !Array.isArray(selectors)) continue;
      for (const selector of selectors) {
        if (typeof selector === 'string') siteRows.push({source:'site',hostname,selector});
      }
    }
    currentRows = [...rawRows,...siteRows];
    const q = search.value.trim().toLowerCase();
    const selected = source.value;
    const shown = currentRows.filter(row=>
      (selected === 'all' || row.source === selected) &&
      (!q || (row.source === 'site'
        ? row.hostname + '##' + printableSelector(row.selector) : row.value).toLowerCase().includes(q))
    );
    count.textContent = shown.length + ' of ' + currentRows.length;
    list.replaceChildren(...shown.map(makeRow));
    empty.hidden = shown.length !== 0;
  }
  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = window.setTimeout(()=>{renderTimer=0;render();},120);
  }
  search.addEventListener('input',scheduleRender);
  source.addEventListener('change',scheduleRender);

  class SandboxEditor extends FilterEditor {
    async loadContent() {
      const text = await sendMessage({what:'getSandboxFilters'});
      await super.loadContent(typeof text === 'string' ? text : '');
      scheduleRender();
    }
    async saveContent() {
      if (!this.contentChanged()) return;
      await sendMessage({what:'setSandboxFilters',text:this.getContent()});
      await super.saveContent();
      scheduleRender();
    }
    updateListener(info) {
      super.updateListener(info);
      if (info.docChanged) scheduleRender();
    }
  }
  async function init() {
    if (started) return;
    started = true;
    try {
      editor = new SandboxEditor(originalEditor.querySelector('.cm-container'));
      await editor.loadContent();
      await render();
    } catch(error) { showToast('Failed to initialize filter editor: '+String(error),true); }
  }

  const watchPane = () => {
    if (document.body.dataset.pane === 'filters') init();
  };
  new MutationObserver(watchPane).observe(document.body,{
    attributes:true,attributeFilter:['data-pane']
  });
  if (document.body.dataset.pane === 'filters') init();

  browser.storage.local.onChanged.addListener((changes,area) => {
    if (area !== undefined && area !== 'local') return;
    const keys = Object.keys(changes);
    if (keys.some(x=>x.startsWith('site.'))) scheduleRender();
    if (keys.includes('sandboxFilters') && editor && !editor.contentChanged()) {
      editor.loadContent().catch(console.error);
    }
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,text/plain';
  fileInput.hidden = true;
  pane.append(fileInput);
  importText.addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];
    fileInput.value='';
    if (!file) return;
    if (!editor) return showToast('Open My filters before importing',true);
    if (file.size>8*1024*1024) return showToast('File exceeds 8 MiB limit',true);
    try {
      const lines=(await file.text()).split(/\r?\n/);
      const sandboxToAppend=[];
      let importedSite=0;
      for (const line of lines) {
        if (!line.trim()) continue;
        // Preserve unknown and unsupported lines as sandbox text.
        if (line.includes('##') && !line.trimStart().startsWith('!')) {
          try {
            const parsed=parseSiteLine(line);
            await sendMessage({what:'addCustomFilters',
              hostname:parsed.hostname,selectors:[parsed.selector]});
            importedSite++;
            continue;
          } catch {}
        }
        sandboxToAppend.push(line);
      }
      if (sandboxToAppend.length) {
        const existing=editor.getContent().trimEnd();
        editor.setContent([existing,...sandboxToAppend].filter(Boolean).join('\n'));
        await editor.saveContent();
      }
      await render();
      showToast('Imported filter text · ' + importedSite + ' site rules');
    } catch(error) { showToast('Import failed: '+String(error),true); }
  });
  exportText.addEventListener('click',async()=>{
    if (!editor) return showToast('Open My filters before exporting',true);
    try {
      const sites=await sendMessage({what:'getAllCustomFilters'}) || [];
      const lines=[editor.getContent().trimEnd()];
      for (const [hostname,selectors] of sites) {
        for (const s of selectors) lines.push(hostname+'##'+printableSelector(s));
      }
      const blob=new Blob([lines.filter(Boolean).join('\n')+'\n'],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download='muBlock-filters.txt'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      showToast('Filter text exported');
    } catch(error) { showToast('Export failed: '+String(error),true); }
  });

  // Full backup and restore are implemented by Lite's unmodified
  // backup-restore.js module through its existing Settings controls.
  backup.addEventListener('click',()=>{
    document.querySelector('#dashboard-nav [data-pane="settings"]')?.click();
    const el=document.querySelector('section[data-pane="settings"] button:has([data-i18n="backupButton"])');
    el?.click();
  });
  restore.addEventListener('click',()=>{
    document.querySelector('#dashboard-nav [data-pane="settings"]')?.click();
    const el=document.querySelector('section[data-pane="settings"] button:has([data-i18n="restoreButton"])');
    el?.click();
  });
}

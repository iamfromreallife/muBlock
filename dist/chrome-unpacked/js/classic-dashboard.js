/*
 * Classic "My filters" dashboard presentation on top of uBO Lite's
 * original CodeMirror 6 sandbox editor and picker-generated cosmetic filters.
 * GPL-3.0-or-later. No changes to filtering algorithms or storage schemas.
 */
import { sendMessage } from './ext.js';

const pane = document.querySelector('section[data-pane="filters"]');
const sandbox = pane?.querySelector('#sandboxEditor');
const hostnames = pane?.querySelector('.hostnames');
const originalImport = pane?.querySelector('.importFromText')?.closest('aside');

if (pane && sandbox && hostnames && originalImport && !pane.querySelector('.classicFiltersHeader')) {
    const localized = id => chrome.i18n.getMessage(id) || id;
    const inEnglish = chrome.i18n.getUILanguage().toLowerCase().startsWith('en');

    const head = document.createElement('div');
    head.className = 'classicFiltersHeader';

    const h = document.createElement('h2');
    h.textContent = inEnglish ? 'My filters' : localized('customFiltersPageName');

    const toolbar = document.createElement('div');
    toolbar.className = 'classicFiltersToolbar';

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.textContent = localized('importAndAppendButton') || 'Import';
    importButton.title = 'Append filter lines from a text file';

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = localized('exportButton') || 'Export';
    exportButton.title = 'Export sandbox filters to a UTF-8 text file';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'text/plain,.txt';
    fileInput.hidden = true;
    fileInput.setAttribute('aria-label', 'Import sandbox filter text file');

    const status = document.createElement('p');
    status.id = 'classicFiltersStatus';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const sectionNote = document.createElement('p');
    sectionNote.className = 'classicFiltersNote';
    sectionNote.textContent = inEnglish
        ? 'Custom sandbox filters (supported syntax only). Apply and revert using the editor toolbar.'
        : localized('sandboxEditorLabel');

    toolbar.append(importButton, exportButton, fileInput);
    head.append(h, toolbar);

    const pickerSection = document.createElement('details');
    pickerSection.id = 'classicPickerFilters';
    const pickerSummary = document.createElement('summary');
    pickerSummary.textContent = inEnglish
        ? 'Picker-generated site filters'
        : localized('customFiltersPageName');
    pickerSection.append(pickerSummary, hostnames, originalImport);
    pane.prepend(head, sectionNote, status);
    pane.append(pickerSection);

    // Keep the original sandbox editor and its unmodified save/revert logic.
    // The original hostnames node remains live, so original Lite event
    // delegation, add/remove operations, and browser storage listeners survive.
    const nav = document.querySelector('#dashboard-nav [data-pane="filters"]');
    if (nav && inEnglish) {
        nav.removeAttribute('data-i18n');
        nav.textContent = 'My filters';
    }

    const message = text => { status.textContent = text; };
    const hasUnsavedChanges = () => {
        const saveButton = pane.querySelector('#sandboxSave');
        return !!saveButton && !saveButton.disabled;
    };

    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        try {
            if (file.size > 8 * 1024 * 1024) {
                message('Import rejected: the file is larger than 8 MiB.');
                return;
            }
            if (hasUnsavedChanges() &&
                !confirm('Unsaved editor changes will be discarded. Continue?')) return;
            const incoming = await file.text();
            const existing = await sendMessage({ what: 'getSandboxFilters' });
            if (typeof existing !== 'string') throw new Error('Unable to read sandbox filters');
            const combined = [existing.trimEnd(), incoming.trim()].filter(Boolean).join('\n') + '\n';
            const result = await sendMessage({ what: 'setSandboxFilters', text: combined });
            if (result === false) throw new Error('Lite rejected the imported filters');
            message('Imported into sandbox filters. Review unsupported lines in the editor.');
        } catch (error) {
            message('Import error: ' + String(error));
        }
    });

    exportButton.addEventListener('click', async () => {
        try {
            const content = await sendMessage({ what: 'getSandboxFilters' });
            if (typeof content !== 'string') throw new Error('Unable to read sandbox filters');
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my-filters.txt';
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            message('Saved filters exported.');
        } catch (error) {
            message('Export error: ' + String(error));
        }
    });
}

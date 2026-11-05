#!/usr/bin/env python3
"""Static regression tests: muBlock may restyle UI but not alter Lite's engine."""
from __future__ import annotations

import copy
import json
import pathlib
import sys
import unittest

UPSTREAM = pathlib.Path(sys.argv[1]).resolve()
EXTENSION = pathlib.Path(sys.argv[2]).resolve()
sys.argv = [sys.argv[0]]

UI_PAGES = {
    'popup.html','dashboard.html','picker-ui.html','unpicker-ui.html','zapper-ui.html',
    'matched-rules.html','report.html','strictblock.html'
}
UI_ASSETS = {
    'css/mu-design.css','css/mu-popup.css','css/mu-dashboard.css',
    'css/mu-picker.css','css/mu-select.css',
    'js/mu-popup.js','js/mu-dashboard.js','js/mu-filters.js','js/mu-select.js',
    'img/mu-logo.svg'
}
ICONS = {'img/mu-%d.png' % size for size in (16,32,48,64,128,256,512)}
TOOLBAR_ICONS = {f'img/mu-toolbar{state}-{size}.png'
    for state in ('', '-off') for size in (16,32,64,128)}
NEW_FILES = UI_ASSETS | ICONS | TOOLBAR_ICONS

class PackageIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.originals = {str(p.relative_to(UPSTREAM)) for p in UPSTREAM.rglob('*') if p.is_file()}
        cls.actual = {str(p.relative_to(EXTENSION)) for p in EXTENSION.rglob('*') if p.is_file()}

    def test_all_files_and_filtering_engine_preserved(self):
        self.assertEqual(self.actual,self.originals | NEW_FILES)
        exempt = (UI_PAGES | {'manifest.json','js/action.js','img/ublock.svg'} |
            {f'img/icon_{size}.png' for size in (16,32,64,128,512)} |
            {f'img/icon_{size}_off.png' for size in (16,32,64,128)})
        for rel in self.originals:
            if rel in exempt or (rel.startswith('_locales/') and rel.endswith('/messages.json')):
                continue
            self.assertEqual((UPSTREAM/rel).read_bytes(),(EXTENSION/rel).read_bytes(),rel)

    def test_manifest_preserves_permissions_engine_and_rule_resources(self):
        old = json.loads((UPSTREAM/'manifest.json').read_text())
        new = json.loads((EXTENSION/'manifest.json').read_text())
        self.assertEqual(new['manifest_version'],3)
        self.assertEqual(new['name'],'muBlock')
        self.assertEqual(new['short_name'],'muBlock')
        self.assertEqual(new['action']['default_popup'],'popup.html')
        self.assertEqual(new['options_page'],'dashboard.html')
        for name in ('background','permissions','optional_permissions','host_permissions',
                     'optional_host_permissions','declarative_net_request','web_accessible_resources',
                     'commands','storage','incognito','version','minimum_chrome_version'):
            self.assertEqual(old.get(name),new.get(name),name)
        for item in new['declarative_net_request']['rule_resources']:
            self.assertTrue((EXTENSION/item['path'].lstrip('/')).is_file(),item['path'])
        for size in (16,32,48,64,128,256,512):
            self.assertTrue((EXTENSION/new['icons'][str(size)]).is_file())
        # Branding is the only allowed change to these metadata fields.
        old.pop('name');old.pop('short_name');old.pop('description');
        new.pop('name');new.pop('short_name');new.pop('description');
        old.pop('icons');new.pop('icons')
        old['action'].pop('default_icon',None);new['action'].pop('default_icon',None)
        new['action'].pop('default_title',None);old['action'].pop('default_title',None)
        self.assertEqual(old,new)

    def test_localizations_only_rename_product(self):
        for original in sorted((UPSTREAM/'_locales').glob('*/messages.json')):
            rel = original.relative_to(UPSTREAM)
            old = json.loads(original.read_text())
            new = json.loads((EXTENSION/rel).read_text())
            self.assertEqual(new['extName']['message'],'muBlock',str(rel))
            old['extName']['message']='muBlock'
            self.assertEqual(old,new,str(rel))

    def test_original_picker_and_filter_engine_js_unchanged(self):
        protected = [
            'js/background.js','js/filter-manager.js','js/filter-editor.js','js/settings.js',
            'js/backup-restore.js','js/popup.js','js/picker-ui.js',
            'js/unpicker-ui.js','js/zapper-ui.js','js/scripting-manager.js'
        ]
        for relative in protected:
            self.assertEqual((UPSTREAM/relative).read_bytes(),
                             (EXTENSION/relative).read_bytes(),relative)

    def test_toolbar_icon_metadata_and_runtime_switching(self):
        manifest=json.loads((EXTENSION/'manifest.json').read_text())
        for size in (16,32,64,128):
            self.assertEqual(manifest['action']['default_icon'][str(size)],
                             f'img/mu-toolbar-{size}.png')
            for suffix in ('','-off'):
                self.assertTrue((EXTENSION/f'img/mu-toolbar{suffix}-{size}.png').is_file())
        original=(UPSTREAM/'js/action.js').read_text()
        modified=(EXTENSION/'js/action.js').read_text()
        for size in (16,32,64,128):
            for old,new in (
                (f'/img/icon_{size}.png',f'/img/mu-toolbar-{size}.png'),
                (f'/img/icon_{size}_off.png',f'/img/mu-toolbar-off-{size}.png'),
            ):
                self.assertIn(old,original)
                self.assertIn(new,modified)
                original=original.replace(old,new)
        self.assertEqual(original,modified,
                         'Only icon asset filenames may differ in action.js')

    def test_search_and_no_motion_assets(self):
        source=(EXTENSION/'js/mu-filters.js').read_text()
        css=(EXTENSION/'css/mu-dashboard.css').read_text()
        picker=(EXTENSION/'css/mu-picker.css').read_text()
        assert 'mu-site-search' in source and 'renderSearch' in source
        assert 'mu-site-search-results' in source
        self.assertIn('mu-search-match mark',css)
        self.assertIn('#mu-site-textarea',css)
        self.assertIn('span.on',picker)
        self.assertIn('animation:none!important',
                      (EXTENSION/'css/mu-design.css').read_text())
        for page in ('dashboard.html','matched-rules.html','report.html','strictblock.html'):
            html=(EXTENSION/page).read_text()
            self.assertIn('img/mu-64.png',html)

    def test_rebranded_legacy_icon_fallbacks(self):
        from struct import unpack
        for size in (16,32,64,128,512):
            brand=(EXTENSION/f'img/mu-{size}.png').read_bytes()
            legacy=(EXTENSION/f'img/icon_{size}.png').read_bytes()
            self.assertEqual(brand,legacy,'Old toolbar icon remains at %dpx'%size)
            self.assertEqual(unpack('>II',brand[16:24]),(size,size))
        for size in (16,32,64,128):
            self.assertEqual((EXTENSION/f'img/icon_{size}_off.png').read_bytes(),
                             (EXTENSION/f'img/mu-toolbar-off-{size}.png').read_bytes())
        self.assertEqual((EXTENSION/'img/ublock.svg').read_bytes(),
                         (EXTENSION/'img/mu-logo.svg').read_bytes())

    def test_dropdown_and_inline_search_sources(self):
        dashboard=(EXTENSION/'dashboard.html').read_text()
        report=(EXTENSION/'report.html').read_text()
        for html in (dashboard,report):
            self.assertIn('mu-select.js',html)
            self.assertIn('mu-select.css',html)
        selector=(EXTENSION/'js/mu-select.js').read_text()
        self.assertIn("role','combobox'",selector)
        self.assertIn("new Event('change'",selector)
        search=(EXTENSION/'js/mu-filters.js').read_text()
        self.assertIn('mu-search-inline-editor',search)
        self.assertIn('replaceEditableLine',search)
        self.assertIn('renderSearch',search)
        self.assertIn('mu-search-match',search)
        css=(EXTENSION/'css/mu-dashboard.css').read_text()
        self.assertIn('text-align:left!important',css)
        self.assertIn('--mu-editor-neutral',css)

    def test_unified_my_filters_without_duplicate_legacy_editor(self):
        dash = (EXTENSION/'dashboard.html').read_text()
        self.assertNotIn('js/filter-manager-ui.js',dash)
        self.assertNotIn('class="hostnames"',dash)
        self.assertNotIn('class="importFromText"',dash)
        self.assertIn('id="mu-filters"',dash)
        self.assertIn('id="sandboxEditor"',dash)
        self.assertIn('js/mu-filters.js',dash)
        self.assertIn('js/settings.js',dash)
        self.assertIn('lib/codemirror/cm6.bundle.ubol.min.js',dash)

    def test_all_restyled_pages_load_original_runtime_scripts(self):
        for page,script,asset in (
            ('popup.html','js/popup.js','mu-popup.css'),
            ('dashboard.html','js/settings.js','mu-dashboard.css'),
            ('picker-ui.html','js/picker-ui.js','mu-picker.css'),
            ('unpicker-ui.html','js/unpicker-ui.js','mu-picker.css'),
            ('zapper-ui.html','js/zapper-ui.js','mu-picker.css'),
        ):
            html = (EXTENSION/page).read_text()
            self.assertIn(script,html)
            self.assertIn(asset,html)
            self.assertIn('mu-design.css',html)

if __name__=='__main__':
    unittest.main(verbosity=2)

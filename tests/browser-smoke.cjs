/*
 * Real Chromium MV3 integration tests for muBlock's UI and Lite data model.
 * Uses an isolated browser profile; no user browser data is touched.
 */
const {chromium} = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const extensionPath = path.resolve('dist/chrome-unpacked');
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath,'manifest.json'),'utf8'));
  assert.equal(manifest.name,'muBlock');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(),'mublock-smoke-'));
  const context = await chromium.launchPersistentContext(dataDir,{
    channel:'chromium',headless:true,
    ignoreDefaultArgs:['--disable-extensions'],
    args:['--no-sandbox','--disable-extensions-except='+extensionPath,
      '--load-extension='+extensionPath]
  });
  try {
    const sw = context.serviceWorkers()[0] ||
      await context.waitForEvent('serviceworker',{timeout:25000});
    const id=new URL(sw.url()).hostname;
    assert.match(id,/^[a-p]{32}$/);
    console.log('muBlock service worker:',id);
    async function check(name,verify) {
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(String(error)));
      page.setDefaultTimeout(15000);
      await page.setViewportSize(name==='popup'?{width:350,height:750}:{width:1120,height:900});
      await page.goto('chrome-extension://'+id+'/'+name+'.html');
      await page.waitForTimeout(800);
      await verify(page);
      assert.deepEqual(errors,[],name+' uncaught errors');
      fs.mkdirSync('test-artifacts',{recursive:true});
      await page.screenshot({path:'test-artifacts/'+name+'.png',fullPage:true});
      await page.close();
    }
    await check('dashboard',async page=>{
      await page.waitForSelector('body:not(.loading)');
      await page.locator('#dashboard-nav [data-pane="filters"]').click();
      await page.waitForSelector('#mu-filter-list');
      await page.waitForSelector('#mu-filter-count:not(:empty)');
      assert.equal(await page.locator('.hostnames').count(),0,'Legacy Lite picker list must not exist');
      assert.equal(await page.locator('#classicPickerFilters').count(),0);
      assert.equal(await page.locator('#mu-filter-list').count(),1);
      await page.locator('#mu-raw-drawer summary').click();
      await page.waitForSelector('#sandboxEditor .cm-editor');
      const marker='example.test##.mublock-smoke-filter';
      await page.locator('#sandboxEditor .cm-content').click();
      await page.keyboard.insertText(marker+'\n');
      await page.locator('#sandboxSave:not([disabled])').waitFor();
      await page.locator('#sandboxSave').click();
      await page.waitForTimeout(250);
      const data=await page.evaluate(async()=>{
        const {sendMessage}=await import('./js/ext.js');
        return sendMessage({what:'getSandboxFilters'});
      });
      assert(data && data.includes(marker),'Sandbox save did not persist');
      await page.evaluate(async()=>{
        const {sendMessage}=await import('./js/ext.js');
        return sendMessage({what:'addCustomFilters',
          hostname:'example.test',selectors:['.mublock-picker-smoke']});
      });
      await page.waitForTimeout(300);
      await page.locator('#mu-filter-search').fill('mublock-picker-smoke');
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#mu-filter-list > li').count(),1);
      await page.locator('#mu-filter-search').fill('');
      // Exercise the new Material dialog, real Lite cosmetic parser and deletion.
      await page.getByRole('button',{name:'Add filter'}).click();
      await page.locator('#mu-dialog-type').selectOption('site');
      await page.locator('#mu-dialog-value').fill('example.test##.mublock-dialog-test');
      await page.locator('dialog[open] [data-action="save"]').click();
      await page.waitForTimeout(250);
      await page.locator('#mu-filter-search').fill('mublock-dialog-test');
      await page.waitForTimeout(250);
      assert.equal(await page.locator('#mu-filter-list > li').count(),1);
      await page.locator('#mu-filter-list .mu-filter-action.danger').click();
      await page.locator('dialog[open] [data-action="confirm"]').click();
      await page.waitForTimeout(250);
      assert.equal(await page.locator('#mu-filter-list > li').count(),0);
      await page.locator('#mu-filter-search').fill('');
      // This is the actual native Lite backup/restore module, not an imitation.
      const backupCheck=await page.evaluate(async()=>{
        const {backupToObject,restoreFromObject}=await import('./js/backup-restore.js');
        const {sendMessage}=await import('./js/ext.js');
        const config=self.cachedRulesetData;
        if(!config) throw new Error('Lite settings not loaded');
        const backup=await backupToObject(config);
        if(!Array.isArray(backup.sandboxFilters) ||
           !backup.sandboxFilters.some(x=>x.includes('mublock-smoke-filter'))) {
          throw new Error('Lite backup missing sandbox filters');
        }
        if(!Array.isArray(backup.customFilters) ||
           !backup.customFilters.some(x=>x[0]==='example.test')) {
          throw new Error('Lite backup missing picker filters');
        }
        await restoreFromObject(backup);
        const raw=await sendMessage({what:'getSandboxFilters'});
        const sites=await sendMessage({what:'getAllCustomFilters'});
        return !!raw?.includes('mublock-smoke-filter') &&
          sites.some(x=>x[0]==='example.test' && x[1].includes('.mublock-picker-smoke'));
      });
      assert(backupCheck,'Lite backup/restore round-trip lost filter data');
      console.log('Unified list, sandbox save, picker filter and native Lite backup/restore passed');
      await page.screenshot({path:'test-artifacts/my-filters.png',fullPage:true});
      await page.reload();
      await page.waitForSelector('body:not(.loading)');
      await page.locator('#dashboard-nav [data-pane="filters"]').click();
      await page.locator('#mu-filter-search').fill('mublock-smoke-filter');
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#mu-filter-list > li').count(),1);
    });
    await check('popup',async page=>{
      await page.waitForSelector('#mu-power');
      assert.equal(await page.locator('#mu-mode-buttons > button').count(),4);
      assert.equal(await page.locator('.filteringModeSlider').count(),1);
      assert.equal(await page.locator('#gotoPicker').count(),1);
      assert.equal(await page.locator('.mu-pop-brand').innerText(),'muBlock');
      console.log('New popup with original Lite mode and picker controls passed');
    });
  } finally {
    await context.close();
    fs.rmSync(dataDir,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});

/* Real Chromium MV3 smoke tests. Runs with an isolated profile. */
const { chromium }=require('playwright');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');

async function main(){
 const extension=path.resolve('dist/chrome-unpacked');
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json')));
 assert.equal(manifest.name,'muBlock');
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mublock-test-'));
 const browser=await chromium.launchPersistentContext(profile,{
   channel:'chromium',headless:true,ignoreDefaultArgs:['--disable-extensions'],
   args:['--no-sandbox','--disable-extensions-except='+extension,
         '--load-extension='+extension]
 });
 try{
   const worker=browser.serviceWorkers()[0] ||
     await browser.waitForEvent('serviceworker',{timeout:25000});
   const id=new URL(worker.url()).hostname;
   assert.match(id,/^[a-p]{32}$/);
   console.log('muBlock service worker started:',id);
   const visit=async(file,fn)=>{
     const page=await browser.newPage();page.setDefaultTimeout(20000);
     const errors=[];page.on('pageerror',error=>errors.push(String(error)));
     await page.setViewportSize(file==='popup'?{width:340,height:780}:{width:1120,height:900});
     await page.goto('chrome-extension://'+id+'/'+file+'.html');
     await fn(page);
     assert.deepEqual(errors,[],file+' runtime exceptions');
     fs.mkdirSync('test-artifacts',{recursive:true});
     await page.screenshot({path:'test-artifacts/'+file+'.png',fullPage:true});
     await page.close();
   };
   await visit('dashboard',async page=>{
     await page.waitForSelector('body:not(.loading)');
     await page.locator('#dashboard-nav [data-pane="filters"]').click();
     await page.waitForSelector('#mu-site-textarea');
     await page.waitForSelector('#sandboxEditor .cm-editor');
     assert.equal(await page.locator('#mu-site-search').count(),1);
     assert.equal(await page.locator('#mu-site-search-results').count(),1);
     assert.equal(await page.locator('#mu-filter-list').count(),0,'Old row-list UI should not return');
     assert.equal(await page.locator('.hostnames').count(),0,'Old Lite tree UI should not return');
     const sizes=await page.evaluate(()=>{
       const site=document.querySelector('#mu-site-textarea').getBoundingClientRect();
       const sandbox=document.querySelector('#sandboxEditor .cm-container').getBoundingClientRect();
       return {site:site.height,sandbox:sandbox.height};
     });
     assert(sizes.site>=450 && sizes.sandbox<=270,
       'Picker list should be much taller than sandbox: '+JSON.stringify(sizes));
     const addFilter=(host,selector)=>page.evaluate(async([hn,s])=>{
       const {sendMessage}=await import('./js/ext.js');
       return sendMessage({what:'addCustomFilters',hostname:hn,selectors:[s]});
     },[host,selector]);
     await addFilter('example.test','.older');
     await page.waitForFunction(()=>document.querySelector('#mu-site-textarea')?.value.includes('.older'));
     await addFilter('example.test','.newest');
     await page.waitForFunction(()=>document.querySelector('#mu-site-textarea')?.value
       .split('\n')[0]?.endsWith('.newest'));
     console.log('New picker filter correctly appears first');
     const search=page.locator('#mu-site-search');
     await search.fill('newest');
     await page.waitForSelector('#mu-site-search-results .mu-search-match mark');
     assert.equal(await page.locator('#mu-site-search-results .mu-search-match').count(),1);
     assert.equal(await page.locator('#mu-site-textarea').isVisible(),false);
     const align=await page.locator('.mu-search-text').first().evaluate(el=>
       getComputedStyle(el).textAlign);
     assert(['left','start'].includes(align),'Search results are not left aligned');
     const surface=await page.locator('#mu-site-textarea').evaluate(el=>
       getComputedStyle(el).backgroundColor);
     assert(surface.includes('245')||surface.includes('246'),
       'Editor should have very subtle grey background: '+surface);
     const highlight=await page.locator('#mu-site-search-results mark').evaluate(el=>({
       fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor
     }));
     assert.equal(highlight.fg,'rgb(255, 255, 255)');
     assert.equal(highlight.bg,'rgb(31, 117, 254)');
     // Edit directly inside the filtered search result. The complete
     // textarea remains the backing source so other filters are not lost.
     await page.locator('#mu-site-search-results .mu-search-edit-button').first().click();
     const inline=page.locator('.mu-search-inline-editor');
     await inline.waitFor({state:'visible'});
     await inline.fill('example.test##.newest-edited');
     await inline.press('Enter');
     assert((await page.locator('#mu-site-textarea').inputValue()).includes('.newest-edited'));
     await search.fill('newest-edited');
     assert.equal(await page.locator('.mu-search-match').count(),1);
     await page.locator('#mu-site-save:not([disabled])').click();
     const edited=await page.evaluate(async()=>{
       const {sendMessage}=await import('./js/ext.js');
       const data=await sendMessage({what:'getAllCustomFilters'});
       return data.some(([h,selectors])=>h==='example.test' &&
          selectors.includes('.newest-edited') && !selectors.includes('.newest'));
     });
     assert(edited,'Inline edits must persist in Lite storage');
     await search.fill('not-present-anywhere');
     assert.equal(await page.locator('#mu-site-search-results .mu-search-match').count(),0);
     await search.fill('');
     assert.equal(await page.locator('#mu-site-textarea').isVisible(),true);
     // Save sandbox rules through Lite's original CodeMirror and backend.
     await page.locator('#sandboxEditor .cm-content').click();
     await page.keyboard.insertText('example.test##.sandbox-smoke\n');
     await page.locator('#sandboxSave:not([disabled])').click();
     const preserved=await page.evaluate(async()=>{
       const {backupToObject,restoreFromObject}=await import('./js/backup-restore.js');
       const {sendMessage}=await import('./js/ext.js');
       const config=self.cachedRulesetData;
       if(!config)throw Error('Missing Lite configuration');
       const backup=await backupToObject(config);
       if(!Array.isArray(backup.customFilters) ||
          !backup.customFilters.some(([h])=>h==='example.test'))throw Error('Picker filters lost');
       if(!Array.isArray(backup.sandboxFilters) ||
          !backup.sandboxFilters.some(x=>x.includes('.sandbox-smoke')))throw Error('Sandbox lost');
       await restoreFromObject(backup);
       const sites=await sendMessage({what:'getAllCustomFilters'});
       const raw=await sendMessage({what:'getSandboxFilters'});
       return sites.some(([h,s])=>h==='example.test' && s.includes('.newest-edited')) &&
              raw.includes('.sandbox-smoke');
     });
     assert(preserved,'Native Lite backup/restore roundtrip lost data');
     await page.reload();
     await page.waitForSelector('body:not(.loading)');
     await page.locator('#dashboard-nav [data-pane="filters"]').click();
     await page.waitForFunction(()=>document.querySelector('#mu-site-textarea')?.value
       .split('\n')[0]?.endsWith('.newest-edited'));
     await page.screenshot({path:'test-artifacts/my-filters.png',fullPage:true});
     await page.locator('#dashboard-nav [data-pane="about"]').click();
     await page.waitForSelector('.mu-about-fork');
     const about=page.locator('section[data-pane="about"] .body');
     assert((await about.locator(':scope > :first-child').getAttribute('class'))
        .includes('mu-about-fork'));
     const first=await about.locator('.mu-about-upstream').innerText();
     assert(first.includes('uBlock Origin Lite') && first.includes('Raymond Hill'));
     assert((await about.innerText()).includes('iamfromreallife'));
     // The developer dropdown is a fully styled accessible listbox. Lite's
     // existing <select> remains connected to its own onChange listeners.
     await page.locator('#dashboard-nav [data-pane="develop"]').click();
     const trigger=page.locator('#editors + .mu-select-trigger');
     await trigger.waitFor({state:'visible'});
     await trigger.click();
     const menu=page.locator('.mu-select-menu:not([hidden])');
     await menu.waitFor({state:'visible'});
     const menuStyle=await menu.evaluate(el=>{
       const cs=getComputedStyle(el);
       return {radius:parseFloat(cs.borderTopLeftRadius),shadow:cs.boxShadow};
     });
     assert(menuStyle.radius>=14 && menuStyle.shadow!=='none',
       'Dropdown needs rounded corners and a soft shadow');
     await menu.locator('[role="option"]').nth(1).click();
     assert.equal(await page.locator('#editors').inputValue(),'dnr.rw.user');
     assert.equal(await trigger.getAttribute('aria-expanded'),'false');
     console.log('Inline filter editing, native Lite backup, accessible dropdown passed');
     console.log('Two editors, search highlighting, newest-first, no loss, About attribution passed');
   });
   await visit('popup',async page=>{
     await page.waitForSelector('#mu-sitebar');
     assert.equal(await page.locator('#mu-hero').count(),0);
     assert.equal(await page.locator('#mu-power').count(),1);
     assert.equal(await page.locator('#mu-mode-buttons button').count(),4);
     assert.equal(await page.locator('#gotoDashboard').count(),1);
     const modes=await page.evaluate(()=>Array.from(
       document.querySelectorAll('#mu-mode-buttons button'),
       (b,i)=>b.querySelector('.mu-mode-name')?.textContent===
         chrome.i18n.getMessage('filteringMode'+i+'Name')
     ).every(Boolean));
     assert(modes,'Popup filtering-mode labels not localized');
     const noMotion=await page.locator('#mu-power').evaluate(el=>
       getComputedStyle(el).animationName==='none' &&
       getComputedStyle(el).transitionDuration.split(',').every(x=>parseFloat(x)===0));
     assert(noMotion,'Animations still enabled');
     console.log('Static compact popup, native Lite controls and translations passed');
   });
 } finally {
   await browser.close();
   fs.rmSync(profile,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});

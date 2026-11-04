/*
 * Playwright browser smoke test for the complete unpacked Chrome extension.
 * This runs only in CI where installing unpacked extensions is permitted.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

async function main() {
    const extensionPath = path.resolve('dist/chrome-unpacked');
    assert(fs.existsSync(path.join(extensionPath, 'manifest.json')));
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ubol-chrome-smoke-'));
    const context = await chromium.launchPersistentContext(dataDir, {
        channel: 'chromium',
        headless: true,
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
            '--no-sandbox',
            '--disable-extensions-except=' + extensionPath,
            '--load-extension=' + extensionPath
        ]
    });
    try {
        const serviceWorker = context.serviceWorkers()[0] ||
            await context.waitForEvent('serviceworker', {timeout: 20000});
        const extId = new URL(serviceWorker.url()).hostname;
        assert.match(extId, /^[a-p]{32}$/);
        console.log('Extension service worker running:', extId);

        const check = async (pageName, checks) => {
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(String(error)));
            await page.setViewportSize(pageName === 'popup' ? {width: 340, height: 700} : {width: 1120, height: 900});
            await page.goto('chrome-extension://' + extId + '/' + pageName + '.html');
            await page.waitForTimeout(1200);
            await checks(page);
            assert.deepEqual(errors, [], pageName + ' runtime errors');
            fs.mkdirSync('test-artifacts', {recursive: true});
            await page.screenshot({path: 'test-artifacts/' + pageName + '.png', fullPage: true});
            await page.close();
        };
        await check('dashboard', async page => {
            await page.waitForSelector('body:not(.loading)', { timeout: 20000 });
            assert.equal(await page.locator('.classicFiltersHeader').count(), 1);
            assert.equal(await page.locator('#classicPickerFilters').count(), 1);
            await page.locator('#dashboard-nav .tabButton[data-pane="filters"]').click();
            await page.waitForSelector('#sandboxEditor .cm-editor', {timeout: 20000});
            assert.equal(await page.locator('#sandboxSave').count(), 1);
            const getFilters = () => page.evaluate(async () => {
                const { sendMessage } = await import('./js/ext.js');
                return sendMessage({ what: 'getSandboxFilters' });
            });
            const before = await getFilters();
            assert.equal(typeof before, 'string');
            const testFilter = 'example.test##.playwright-smoke-test';
            await page.locator('#sandboxEditor .cm-content').click();
            await page.keyboard.insertText(testFilter + '\n');
            await page.locator('#sandboxSave:not([disabled])').waitFor({timeout: 8000});
            await page.locator('#sandboxSave').click();
            await page.waitForTimeout(800);
            const after = await getFilters();
            assert(after.includes(testFilter), 'Sandbox editor save was not persisted');
            await page.reload();
            await page.waitForSelector('body:not(.loading)', {timeout: 20000});
            await page.locator('#dashboard-nav .tabButton[data-pane="filters"]').click();
            await page.waitForSelector('#sandboxEditor .cm-editor', {timeout: 20000});
            assert((await page.locator('#sandboxEditor .cm-content').innerText()).includes(testFilter),
                'Persisted filter did not reload into editor');
            console.log('Dashboard, sandbox filter save/reload, and original CodeMirror passed.');
        });
        await check('popup', async page => {
            await page.waitForSelector('#classicPower', {timeout: 20000});
            assert.equal(await page.locator('.filteringModeSlider').count(), 1);
            assert.equal(await page.locator('#gotoPicker').count(), 1);
            console.log('Popup power control, original mode slider and picker entrypoint present.');
        });
    } finally {
        await context.close();
        fs.rmSync(dataDir, {recursive: true, force: true});
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

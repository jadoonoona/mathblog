/** Start Astro on 4321 and a Chromium CDP instance on 9224. No additional packages required. */
import assert from 'node:assert/strict';
import { websites } from '../src/data/websites.ts';
const total = websites.length;
import { mkdir, writeFile } from 'node:fs/promises';
const origin = 'http://127.0.0.1:4321';
const url = `${origin}/mathblog/blog/websites/`;
const output = '/private/tmp/mathblog-websites-qa';
await mkdir(output, { recursive: true });
const target = await (await fetch('http://127.0.0.1:9224/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0;
const pending = new Map(), errors = [];
ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
    if (data.id) { const p = pending.get(data.id); pending.delete(data.id); data.error ? p.reject(Error(JSON.stringify(data.error))) : p.resolve(data.result); }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
};
async function waitFor(expression) {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 50)); }
    throw Error(`Timed out: ${expression}`);
}
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const set = (selector, value, event = 'input') => evaluate(`(()=>{const x=document.querySelector(${JSON.stringify(selector)});x.value=${JSON.stringify(value)};x.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));})()`);
const visible = () => evaluate(`[...document.querySelectorAll('[data-site-id]:not([hidden])')].map(x=>x.dataset.siteId)`);
const count = () => evaluate(`document.querySelector('[data-result-count]').textContent`);
const reset = () => click('[data-reset]');
const screenshot = async name => { await evaluate(`document.querySelector('astro-dev-toolbar')?.remove();window.scrollTo(0,0)`); return writeFile(`${output}/${name}.png`, Buffer.from((await send('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64')); };
const resize = async (width, height = 1000) => { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 }); await new Promise(r=>setTimeout(r,400)); };
let original;
try {
    await send('Runtime.enable'); await send('Page.enable');
    await resize(1440);
    await send('Page.navigate', { url });
    await waitFor(`document.querySelector('[data-controls]')?.hidden===false`);
    original = await evaluate(`localStorage.getItem('mathblog.website-favorites.v1')`);
    await evaluate(`localStorage.removeItem('mathblog.website-favorites.v1')`);
    await evaluate(`document.querySelector('[data-catalog]').dataset.beforeReload='true'`);
    await send('Page.reload'); await waitFor(`document.querySelector('[data-catalog]') && !document.querySelector('[data-catalog]').dataset.beforeReload && document.querySelector('[data-controls]')?.hidden===false`);
    assert.equal((await visible()).length, total); assert.equal(await count(), `검색 결과 ${total}개`);
    await waitFor(`[...document.querySelectorAll('.website-preview img')].every(x=>x.complete)`);
    assert.equal(await evaluate(`[...document.querySelectorAll('.website-preview img')].filter(x=>x.naturalWidth>0).length`), total);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-grid]')).gridTemplateColumns.split(' ').length`), 3);
    await screenshot('desktop');
    await set('#website-search', 'DESMOS.COM 그래프');
    await click('input[name="website-category"][value="수학·통계"]');
    await click('input[name="website-tag"][value="시각화"]');
    await click('input[name="website-tag"][value="학습"]');
    assert.deepEqual(await visible(), ['desmos']); assert.equal(await count(), '검색 결과 1개');
    assert.equal(await evaluate(`document.querySelector('[data-chips]').children.length`), 4);
    await click('[data-favorite="desmos"]'); await click('#website-favorites');
    assert.deepEqual(await visible(), ['desmos']);
    await evaluate(`document.querySelector('[data-catalog]').dataset.beforeReload='true'`);
    await send('Page.reload'); await waitFor(`document.querySelector('[data-catalog]') && !document.querySelector('[data-catalog]').dataset.beforeReload && document.querySelector('[data-controls]')?.hidden===false`);
    assert.equal(await evaluate(`document.querySelector('[data-favorite="desmos"]').getAttribute('aria-pressed')`), 'true');
    await click('#website-favorites'); assert.deepEqual(await visible(), ['desmos']);
    await click('[data-favorite="desmos"]'); assert.deepEqual(await visible(), []);
    assert.equal(await evaluate(`document.querySelector('[data-empty]').hidden`), false);
    assert.equal(await evaluate(`document.activeElement.id`), 'website-favorites');
    await click('[data-empty] [data-reset]'); assert.equal((await visible()).length, total);
    await set('#website-sort', 'name', 'change'); assert.ok((await visible()).indexOf('astro') < (await visible()).indexOf('github'));
    await set('#website-search', '웹 개발'); assert.deepEqual((await visible()).sort(), ['astro', 'mdn']);
    await click('[data-chips] button'); assert.equal((await visible()).length, total);
    await set('#website-search', 'no-such-website-123'); assert.deepEqual(await visible(), []);
    await reset();
    // Exercise keyboard text entry and the next tab stop, not just programmatic input events.
    await evaluate(`document.querySelector('#website-search').focus()`);
    await send('Input.insertText', { text: 'MDN' }); assert.deepEqual(await visible(), ['mdn']);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate(`document.activeElement.id`), 'website-sort');
    await reset();
    await evaluate(`document.querySelector('[data-site-id="mdn"] img').src='/mathblog/images/websites/missing-preview.jpg'`);
    await waitFor(`document.querySelector('[data-site-id="mdn"] img').hidden`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-site-id="mdn"] .website-preview')).aspectRatio`), '16 / 10');
    assert.match(await evaluate(`document.querySelector('[data-site-id="mdn"] .website-placeholder').innerText`), /MDN Web Docs/);
    await resize(900);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-grid]')).gridTemplateColumns.split(' ').length`), 2);
    await screenshot('tablet');
    await resize(390, 844);
    await waitFor(`document.querySelector('.catalog-filters').open===false`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-grid]')).gridTemplateColumns.split(' ').length`), 1);
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), true);
    await screenshot('mobile');
    await evaluate(`document.querySelector('.catalog-filters summary').focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await waitFor(`document.querySelector('.catalog-filters').open===true`);
    await click('input[name="website-category"][value="개발"]'); assert.equal((await visible()).length, 3);
    await reset();
    await evaluate(`document.documentElement.setAttribute('data-theme','dark')`);
    await screenshot('mobile-dark');
    const ax = (await send('Accessibility.getFullAXTree')).nodes;
    assert.ok(ax.some(node => node.role?.value === 'searchbox' && node.name?.value === '사이트 검색'));
    assert.equal(ax.filter(node => node.role?.value === 'button' && node.name?.value?.endsWith('즐겨찾기')).length, total);
    assert.equal(await evaluate(`[...document.querySelectorAll('.website-card a')].every(x=>x.target==='_blank'&&x.rel.includes('noopener'))`), true);
    // Simulate blocked writes without breaking the site's unrelated theme storage.
    await evaluate(`window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mathblog.website-favorites.v1')throw new DOMException('Blocked');return window.originalSetItem.call(this,k,v);}`);
    await click('[data-favorite="fred"]');
    assert.match(await evaluate(`document.querySelector('[data-storage-status]').textContent`), /저장하지 못했습니다/);
    assert.equal(await evaluate(`document.querySelector('[data-favorite="fred"]').getAttribute('aria-pressed')`), 'true');
    await evaluate(`Storage.prototype.setItem=window.originalSetItem`);
    assert.deepEqual(errors, []);
    console.log('PASS: local thumbnails; search/category/all-tags/favorites combinations; chips, reset, sort, empty state; persistence; keyboard and accessibility names; image failure; 3/2/1 columns, mobile filters and dark mode; blocked storage. Screenshots: '+output);
} finally {
    if (original !== undefined) await evaluate(original === null ? `localStorage.removeItem('mathblog.website-favorites.v1')` : `localStorage.setItem('mathblog.website-favorites.v1',${JSON.stringify(original)})`);
    ws.close(); await fetch(`http://127.0.0.1:9224/json/close/${target.id}`);
}

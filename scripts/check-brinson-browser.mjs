/** Local QA: start Astro and Chromium with --remote-debugging-port=9223 first. */
import assert from 'node:assert/strict';
import { writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const out='/private/tmp/brinson-qa';
await mkdir(out,{recursive:true});
const target=await (await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let seq=0;
const pending=new Map(),errors=[];
ws.onmessage=event=>{
    const data=JSON.parse(event.data);
    if(data.method==='Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
    if(data.id){ const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(new Error(JSON.stringify(data.error))):p.resolve(data.result); }
};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function waitFor(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw new Error('Timed out: '+expression);}
const set=async(selector,value)=>evaluate(`(()=>{const x=document.querySelector(${JSON.stringify(selector)});x.value=${JSON.stringify(String(value))};x.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const metric=()=>evaluate(`[...document.querySelectorAll('[data-metrics] dd')].map(x=>x.textContent.replace(' pp','%p'))`);
try {
    await send('Runtime.enable');await send('Page.enable');
    await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});
    for (const lang of ['en','ko']) {
    const local=(en,ko)=>lang==='en'?en:ko;
    for(const name of ['brinson-attribution.py','brinson-attribution.csv']) await rm(out+'/'+name,{force:true});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:`http://127.0.0.1:4321/mathblog/${lang==='ko'?'ko/':''}projects/brinson-attribution/`});
    await waitFor(`document.querySelector('[data-check]')?.textContent.includes(${JSON.stringify(local('Residual','잔차'))})`);
    assert.equal(await evaluate(`document.documentElement.lang`),lang);
    assert.equal(await evaluate(`document.querySelector('.language-active').textContent`),local('EN','한국어'));
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.language-switcher a')].map(a=>a.getAttribute('href'))`),['/mathblog/projects/brinson-attribution/','/mathblog/ko/projects/brinson-attribution/']);
    assert.deepEqual(await metric(),['10.10%','8.20%','+1.90%p','-1.40%p','+3.20%p','+0.10%p']);
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
    await writeFile(out+'/'+lang+'-desktop.png',Buffer.from((await send('Page.captureScreenshot',{captureBeyondViewport:true})).data,'base64'));
    await set('input[data-field="wp"][data-index="0"]',100);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('input[data-field="wp"]')].map(x=>Number(x.value))`),[100,0,0]);
    await set('input[data-field="wp"][data-index="0"]',0);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('input[data-field="wp"]')].map(x=>Number(x.value))`),[0,50,50]);
    await set('#ba-rp-0','');
    assert.equal(await evaluate(`document.querySelector('[data-valid-output]').hidden`),true);
    assert.equal(await evaluate(`document.querySelector('#ba-rp-0').getAttribute('aria-invalid')`),'true');
    assert.match(await evaluate(`document.querySelector('[data-input-status]').textContent`),new RegExp(local('Check your inputs','입력')));
    await set('#ba-rp-0',1001);assert.match(await evaluate(`document.querySelector('[data-error="0-rp"]').textContent`),/1,000/);
    await click('[data-scenario="allocation"]');assert.deepEqual((await metric()).slice(4),['0.00%p','0.00%p']);
    await click('[data-scenario="selection"]');assert.equal((await metric())[3],'0.00%p');assert.equal((await metric())[5],'0.00%p');
    await click('[data-scenario="identical"]');assert.deepEqual((await metric()).slice(2),['0.00%p','0.00%p','0.00%p','0.00%p']);
    // Zero-return, all-zero-effect chart must still have finite coordinates.
    for(let i=0;i<3;i++){await set(`#ba-rp-${i}`,0);await set(`#ba-rb-${i}`,0);}
    assert.equal(await evaluate(`document.querySelector('[data-waterfall]').innerHTML.includes('NaN')`),false);
    for(let i=0;i<3;i++){await set(`#ba-rp-${i}`,-20);await set(`#ba-rb-${i}`,-10);}
    assert.deepEqual((await metric()).slice(0,3),['-20.00%','-10.00%','-10.00%p']);
    assert.equal(await evaluate(`[...document.querySelectorAll('[data-waterfall] rect')].every(x=>Number(x.getAttribute('height'))>=0)`),true);
    await click('[data-reset]');
    await evaluate(`document.querySelector('#ba-model').value='BF';document.querySelector('#ba-model').dispatchEvent(new Event('change'))`);
    assert.deepEqual(await metric(),['10.10%','8.20%','+1.90%p','-1.40%p','+3.20%p','+0.10%p']);
    await evaluate(`document.querySelector('#ba-sector').value='1';document.querySelector('#ba-sector').dispatchEvent(new Event('change'))`);
    assert.match(await evaluate(`document.querySelector('[data-microscope]').textContent.replaceAll(' pp','%p')`),/-1.0200%p/);
    assert.match(await evaluate(`document.querySelector('[data-python]').textContent`),/MODEL = "BF"/);
    await set('#ba-rp-1',7);
    await send('Browser.grantPermissions',{origin:'http://127.0.0.1:4321',permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
    await click('[data-copy]');await waitFor(`document.querySelector('[data-export-status]').textContent.includes(${JSON.stringify(local('Copied','복사했습니다'))})`);
    assert.match(await evaluate(`navigator.clipboard.readText()`),/MODEL = "BF"/);
    await click('[data-python-download]');await click('[data-csv-download]');
    await new Promise(r=>setTimeout(r,500));
    const py=await readFile(out+'/brinson-attribution.py','utf8');
    const run=spawnSync('.venv/bin/python',['-c',py],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const result=JSON.parse(run.stdout.split('RESULT_JSON=')[1]);assert.ok(Math.abs(result.portfolio-.131)<1e-12);
    const data=await readFile(out+'/brinson-attribution.csv','utf8');assert.match(data,/"Healthcare","30","20","7","-2"/);
    // Keyboard controls and accessible names.
    await evaluate(`document.querySelector('#ba-w-0').focus()`);
    const before=await evaluate(`Number(document.querySelector('#ba-w-0').value)`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    assert.ok(await evaluate(`Number(document.querySelector('#ba-w-0').value)>${before}`));
    const ax=(await send('Accessibility.getFullAXTree')).nodes;
    assert.equal(ax.filter(n=>n.role?.value==='slider'&&n.name?.value).length,3);
    assert.ok(ax.some(n=>['img','image'].includes(n.role?.value)&&n.name?.value.includes(local('Benchmark','벤치마크'))));
    await click('[data-reset]');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
    assert.equal(await evaluate(`innerWidth`),390);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.ba-workspace')).gridTemplateColumns.split(' ').length`),1);
    await writeFile(out+'/'+lang+'-mobile.png',Buffer.from((await send('Page.captureScreenshot',{captureBeyondViewport:true})).data,'base64'));
    await evaluate(`document.querySelector('#ba-lab').scrollIntoView()`);
    await writeFile(out+'/'+lang+'-mobile-lab.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
    if(lang==='en') assert.equal(await evaluate(`/[가-힣]/.test(document.querySelector('[data-brinson]').textContent)`),false);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: browser inputs, scenarios, BF, error states, zero/negative chart, clipboard, Python/CSV downloads, keyboard, accessible names, mobile layout; '+out);
} finally { await send('Page.close');ws.close(); }

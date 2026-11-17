import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, scenario, rebalance, validate, initial, pythonCode, csv } from '../src/lib/brinson.ts';
import { spawnSync } from 'node:child_process';
const near = (a: number, b: number) => assert.ok(Math.abs(a-b) < 1e-11, `${a} != ${b}`);
test('initial BHB example reconciles to all six required results', () => {
    const r = calculate(initial);
    for (const [key, expected] of Object.entries({portfolio:.101,benchmark:.082,active:.019,allocation:-.014,selection:.032,interaction:.001})) near(r[key as 'active'], expected);
    near(r.residual, 0);
});
test('identical, equal-weight and equal-return scenarios isolate the effects', () => {
    const identical = calculate(scenario('identical'));
    for (const s of identical.sectors) for (const k of ['allocation','selection','interaction'] as const) near(s[k], 0);
    const selection = calculate(scenario('selection'));
    for (const s of selection.sectors) { near(s.allocation,0); near(s.interaction,0); }
    const allocation = calculate(scenario('allocation'));
    for (const s of allocation.sectors) { near(s.selection,0); near(s.interaction,0); }
});
test('rebalance preserves ratios, sums and original inputs at 0% and 100%', () => {
    const a = rebalance(initial,0,75); near(a[1].wp/a[2].wp,1.5);
    const all = rebalance(initial,0,100); assert.deepEqual(all.map(s=>s.wp),[100,0,0]);
    assert.deepEqual(rebalance(all,0,0).map(s=>s.wp),[0,50,50]);
    for (const w of [0,100,33.33333]) near(calculate(rebalance(initial,1,w)).residual,0);
    assert.equal(initial[0].wp,50);
});
let seed=1234;
const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
function sample() {
    const wp=[random(),random(),random()], wb=[random(),random(),random()];
    return initial.map((s,i)=>({...s,wp:wp[i]/wp.reduce((a,b)=>a+b)*100,wb:wb[i]/wb.reduce((a,b)=>a+b)*100,rp:random()*1100-100,rb:random()*1100-100}));
}
test('1000 valid random portfolios reconcile; BHB and BF have identical total effects', () => {
    for(let n=0;n<1000;n++) {
        const rows=sample(), a=calculate(rows), b=calculate(rows,'BF');
        near(a.residual,0); near(b.residual,0);
        for (const k of ['allocation','selection','interaction','active'] as const) near(a[k],b[k]);
        for(let i=0;i<rows.length;i++) near(b.sectors[i].allocation-a.sectors[i].allocation,-(rows[i].wp-rows[i].wb)/100*a.benchmark);
    }
    assert.notEqual(calculate(initial).sectors[1].allocation,calculate(initial,'BF').sectors[1].allocation);
});
test('invalid inputs are rejected; CSV retains inputs and effect units',()=>{
    for(const value of [NaN,Infinity,-101,1001]) assert.throws(()=>calculate(initial.map((s,i)=>({...s,rp:i===0?value:s.rp}))));
    assert.ok(validate(initial.map(s=>({...s,wp:0}))).length);
    assert.throws(()=>rebalance(initial,0,NaN));
    assert.match(csv(initial,'BF'),/allocation_pp/);
    assert.match(csv(initial,'BF'),/"BF","Energy","50"/);
});
test('generated pandas code reproduces browser calculations, including each sector, in real Python',()=>{
    const python = process.env.BRINSON_PYTHON || '.venv/bin/python';
    const datasets=[...(['original','allocation','selection','identical'] as const).map(scenario),rebalance(initial,0,100),sample()];
    for(const rows of datasets) for(const model of ['BHB','BF'] as const) {
        const run=spawnSync(python,['-c',pythonCode(rows,model,model==='BF'?'en':'ko')],{encoding:'utf8'});
        assert.equal(run.status,0,run.error?.message || run.stderr);
        const actual=JSON.parse(run.stdout.split('RESULT_JSON=')[1]), expected=calculate(rows,model);
        for(const key of ['portfolio','benchmark','active','allocation','selection','interaction','residual'] as const) near(actual[key],expected[key]);
        expected.sectors.forEach((s,i)=>{for(const key of ['allocation','selection','interaction','total','contribution','benchmarkContribution'] as const) near(actual.sectors[i][key],s[key]);});
    }
});

// Shared calculations must produce fully localized presentation in both routes.
import { metrics, interpretation, sectorTable, waterfall, microscope, comparison, preview, format } from '../src/lib/brinson-view.ts';
test('English views localize labels, interpretations, formulas and percentage-point units',()=>{
    const r=calculate(initial);
    const outputs=[metrics(r,'en'),interpretation(r,'en'),sectorTable(r,'en'),waterfall(r,'en'),microscope(r,1,'en'),comparison(initial,'BF','en'),preview(r,'en')];
    for(const output of outputs) { assert.doesNotMatch(output,/[가-힣]/); assert.doesNotMatch(output,/%p/); }
    assert.equal(format('en',.019,true),'+1.90 pp');
    assert.equal(format('ko',.019,true),'+1.90%p');
    assert.match(metrics(r,'en'),/Portfolio return/);
    assert.doesNotMatch(pythonCode(initial,'BHB','en'),/%p/);
    assert.match(metrics(r),/포트폴리오 수익률/);
});

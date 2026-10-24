import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CURRENT, DEFAULT_PROJECTED } from '../src/lib/hotel-model.ts';
import { DEFAULT_INVESTMENT, forecastInvestment } from '../src/lib/hotel-investment.ts';
import { DEFAULT_SCENARIOS, SCENARIO_IDS, SENSITIVITY_PAIRS, resolveScenario, compareScenarios, calculateHeatmap, calculateTornado, calculateBreakEvens, findBoundedRoot, runModel, withVariable, BREAK_EVEN_TOLERANCE, type ModelSettings, type ScenarioId, type ScenarioOverrides, type SensitivityPair } from '../src/lib/hotel-scenarios.ts';
const shared=():ModelSettings=>({current:{...DEFAULT_CURRENT},projected:{...DEFAULT_PROJECTED},investment:{...DEFAULT_INVESTMENT}});
const scenarios=()=>Object.fromEntries(SCENARIO_IDS.map(id=>[id,{...DEFAULT_SCENARIOS[id]}])) as Record<ScenarioId,ScenarioOverrides>;
const close=(actual:number,expected:number,tolerance=1e-6)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('base scenario reconciles with the complete Phase 2 model when inputs match',()=>{
 const s=shared(),cases=compareScenarios(s,scenarios());
 const base=cases.find(c=>c.id==='base')!;
 assert.deepEqual(base.result,forecastInvestment(s.current,s.projected,s.investment));
 assert.deepEqual(cases.map(c=>c.settings.projected.occupancy),[.7,.78,.85]);
 assert.deepEqual(cases.map(c=>c.settings.investment.capex),[6000000,5000000,4500000]);
});
test('all non-overridden shared assumptions propagate without mutating inputs or resetting overrides',()=>{
 const s=shared(),o=scenarios(),original=structuredClone({s,o});
 o.base.adr=151;
 const initial=compareScenarios(s,o);
 s.current.adr=130;s.projected.margin=.35;s.projected.ancillaryRate=.3;
 Object.assign(s.investment,{discountRate:.12,horizon:8,maintenance:70000,residual:100000,renovationMonths:9,unavailableRooms:.3,adrGrowth:.03,fixedCostShare:.7});
 const before=structuredClone({s,o});
 const cases=compareScenarios(s,o);
 assert.deepEqual({s,o},before);
 for(const c of cases){assert.equal(c.settings.current.adr,130);assert.equal(c.settings.projected.margin,.35);assert.equal(c.settings.projected.ancillaryRate,.3);for(const key of ['discountRate','horizon','maintenance','residual','renovationMonths','unavailableRooms','adrGrowth','fixedCostShare'] as const) assert.equal(c.settings.investment[key],s.investment[key]);assert.equal(c.settings.projected.adr,o[c.id].adr);assert.equal(c.result.flows.length,9);}
 assert.equal(cases[1].settings.projected.adr,151);
 assert.notEqual(cases[1].result.npv,initial[1].result.npv);
 assert.equal(DEFAULT_SCENARIOS.base.adr,original.o.base.adr);
});
test('explicit scenario defaults continue to override the corresponding shared inputs',()=>{
 const s=shared();s.projected.occupancy=.5;s.projected.adr=200;s.investment.capex=8000000;s.investment.costInflation=.04;
 const base=resolveScenario(s,DEFAULT_SCENARIOS.base);
 assert.equal(base.projected.occupancy,.78);assert.equal(base.projected.adr,145);assert.equal(base.investment.capex,5000000);assert.equal(base.investment.costInflation,.02);
});
test('every heatmap cell in every pair reconciles to a direct Phase 2 rerun',()=>{
 const s=shared(),original=structuredClone(s);
 for(const pair of Object.keys(SENSITIVITY_PAIRS) as SensitivityPair[]){
  const h=calculateHeatmap(s,pair);
  for(const row of h.cells)for(const cell of row){const test=structuredClone(s);if(h.x==='adr'||h.x==='occupancy')test.projected[h.x]=cell.x;else test.investment[h.x]=cell.x;if(h.y==='adr'||h.y==='occupancy')test.projected[h.y]=cell.y;else test.investment[h.y]=cell.y;close(cell.npv,forecastInvestment(test.current,test.projected,test.investment).npv);}
 }
 assert.deepEqual(s,original);
});
test('heatmap reference is highlighted only at exact coordinates; zero capex ranges stay distinct',()=>{
 const s=shared();assert.equal(calculateHeatmap(s,'adr-occupancy').cells.flat().filter(c=>c.isReference).length,0);
 s.projected.occupancy=.8;const h=calculateHeatmap(s,'adr-occupancy');const ref=h.cells.flat().filter(c=>c.isReference);assert.equal(ref.length,1);close(ref[0].npv,runModel(s).npv);
 s.investment.capex=0;assert.deepEqual(calculateHeatmap(s,'capex-adr').xValues,[0,250000,500000,750000,1000000]);
 s.investment.capex=100000000;assert.ok(calculateHeatmap(s,'capex-adr').xValues.every(x=>x<=100000000));
});
test('tornado values, impacts and rank exactly match standalone reruns',()=>{
 const s=shared(),npv=runModel(s).npv,rows=calculateTornado(s);
 assert.equal(rows.length,7);
 for(let i=0;i<rows.length;i++){const r=rows[i];close(r.lowNPV,runModel(withVariable(s,r.key,r.low)).npv);close(r.highNPV,runModel(withVariable(s,r.key,r.high)).npv);close(r.lowImpact,r.lowNPV-npv);close(r.highImpact,r.highNPV-npv);close(r.maxImpact,Math.max(Math.abs(r.lowImpact),Math.abs(r.highImpact)));if(i)assert.ok(rows[i-1].maxImpact>=r.maxImpact);}
});
test('tornado caps occupancy, costs, discount and construction intervals at feasible limits',()=>{
 const s=shared();s.projected.occupancy=1;s.projected.adr=5000;s.investment.discountRate=0;s.investment.costInflation=.2;s.investment.unavailableRooms=1;s.investment.horizon=1;s.investment.renovationMonths=12;
 const rows=calculateTornado(s);
 assert.equal(rows.find(r=>r.key==='occupancy')!.high,1);assert.equal(rows.find(r=>r.key==='renovationMonths')!.high,12);assert.equal(rows.find(r=>r.key==='discountRate')!.low,0);assert.equal(rows.find(r=>r.key==='costInflation')!.high,.2);
});
test('all default break-even solutions rerun to within £1 of zero NPV',()=>{
 const s=shared(),roots=calculateBreakEvens(s);
 for(const row of roots){assert.equal(row.result.status,'found');if(row.result.status==='found'){assert.ok(row.result.value>=row.low&&row.result.value<=row.high);close(runModel(withVariable(s,row.key,row.result.value)).npv,0,BREAK_EVEN_TOLERANCE);}}
 const max=roots.find(r=>r.key==='capex')!;if(max.result.status==='found')assert.ok(runModel(withVariable(s,'capex',max.result.value+1000)).npv<0);
});
test('no false roots for unviable, flat or out-of-range cases',()=>{
 const s=shared();s.investment.capex=100000000;s.projected.adr=0;
 const occupancy=calculateBreakEvens(s).find(r=>r.key==='occupancy')!;assert.equal(occupancy.result.status,'no-solution');assert.equal(occupancy.result.value,null);
 s.investment.renovationMonths=120;
 const flat=calculateBreakEvens(s).find(r=>r.key==='adr')!;assert.equal(flat.direction,'flat');assert.equal(flat.result.value,null);
});
test('bounded root solver handles endpoints, descending slopes and no bracket',()=>{
 close((findBoundedRoot(x=>x*100-250,0,10) as {value:number}).value,2.5);
 assert.equal(findBoundedRoot(x=>x*100,0,10).status,'found');
 const descending=findBoundedRoot(x=>250-x*100,0,10);assert.equal(descending.status,'found');if(descending.status==='found')close(descending.value,2.5);
 assert.equal(findBoundedRoot(x=>x*x+10,0,1).status,'no-solution');assert.equal(findBoundedRoot(()=>Infinity,0,1).status,'non-finite');
 assert.throws(()=>findBoundedRoot(x=>x,2,1));assert.throws(()=>findBoundedRoot(x=>x,0,1,0));
});
test('scenario engine rejects invalid numerical assumptions',()=>{
 for(const value of [NaN,Infinity,-1,1.01])assert.throws(()=>resolveScenario(shared(),{...DEFAULT_SCENARIOS.base,occupancy:value}));
 assert.throws(()=>withVariable(shared(),'capex',-1));assert.throws(()=>withVariable(shared(),'adr',5001));assert.throws(()=>withVariable(shared(),'discountRate',NaN));
 const s=shared();s.investment.horizon=0;assert.throws(()=>runModel(s));s.investment.horizon=1;s.investment.renovationMonths=13;assert.throws(()=>runModel(s));
});
test('zero capacity handles unavailable IRR/payback and generates finite sensitivity values',()=>{
 const s=shared();s.current.rooms=0;s.projected.rooms=0;
 const cases=compareScenarios(s,scenarios());
 for(const c of cases){assert.equal(c.result.irr.value,null);assert.equal(c.result.payback,null);assert.equal(c.result.discountedPayback,null);assert.ok(Number.isFinite(c.result.npv));}
 assert.ok(calculateHeatmap(s,'adr-occupancy').cells.flat().every(c=>Number.isFinite(c.npv)));
 assert.ok(calculateTornado(s).every(c=>Number.isFinite(c.lowNPV)&&Number.isFinite(c.highNPV)));
});

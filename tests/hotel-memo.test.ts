import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateInvestmentMemo,assessInvestment,DEFAULT_APPROVAL_POLICY,EVIDENCE_ITEMS,memoFinancialRows,isMemoCurrent,assertMemoExportable,type MemoInput,type DecisionMetrics,type EvidenceRecord} from '../src/lib/hotel-memo.ts';
import {DEFAULT_CURRENT,DEFAULT_PROJECTED} from '../src/lib/hotel-model.ts';
import {DEFAULT_INVESTMENT,forecastInvestment} from '../src/lib/hotel-investment.ts';
import {DEFAULT_SCENARIOS,compareScenarios} from '../src/lib/hotel-scenarios.ts';
import {renderInvestmentMemo} from '../src/scripts/memo-renderer.ts';
const makeInput=():MemoInput=>({shared:{current:{...DEFAULT_CURRENT},projected:{...DEFAULT_PROJECTED},investment:{...DEFAULT_INVESTMENT}},scenarios:structuredClone(DEFAULT_SCENARIOS),config:{caseId:'base',analysisDate:'2026-10-24',policy:{...DEFAULT_APPROVAL_POLICY},evidence:EVIDENCE_ITEMS.map(item=>({id:item.id,status:'unknown',reference:''})),riskState:'unknown',riskReference:'',analystComments:'',additionalConditions:[],charts:{npv:true,cashFlow:true,cumulative:true}}});
const metrics:DecisionMetrics={npv:1000000,irr:.15,payback:6,capex:5000000,downsideNPV:100000};
const supported=():EvidenceRecord[]=>EVIDENCE_ITEMS.map(e=>({id:e.id,status:'supported' as const,reference:'Illustrative analyst review record R1'}));
const decision=(m=metrics,policy={...DEFAULT_APPROVAL_POLICY})=>assessInvestment(m,policy,supported(),'clear','Illustrative referenced risk review',[]);
const finiteTree=(value:unknown)=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finiteTree);};

test('memo NPV, IRR and every cash flow equal the unchanged Phase 2 forecast',()=>{
 for(const caseId of ['base','custom'] as const){const input=makeInput();input.config.caseId=caseId;const memo=generateInvestmentMemo(input),expected=forecastInvestment(input.shared.current,input.shared.projected,input.shared.investment);assert.deepEqual(memo.selected.result,expected);assert.equal(memo.selected.result.npv,expected.npv);assert.equal(memo.selected.result.irr.value,expected.irr.value);}
});
test('memo scenario comparison exactly matches Phase 3, including edited assumptions',()=>{
 const input=makeInput();input.scenarios.downside.adr=131;input.scenarios.base.costInflation=.027;input.shared.projected.margin=.34;input.shared.investment.horizon=8;
 const memo=generateInvestmentMemo(input);assert.deepEqual(memo.scenarios,compareScenarios(input.shared,input.scenarios));
 for(const id of ['downside','base','upside'] as const){input.config.caseId=id;const selected=generateInvestmentMemo(input);assert.deepEqual(selected.selected,memo.scenarios.find(s=>s.id===id));}
});
test('custom case uses current Phase 2 inputs without silently changing scenario overrides',()=>{
 const input=makeInput();input.config.caseId='custom';input.shared.projected.adr=171;input.shared.projected.occupancy=.82;input.shared.investment.capex=4200000;
 const memo=generateInvestmentMemo(input);assert.equal(memo.selected.settings.projected.adr,171);assert.equal(memo.scenarios[1].settings.projected.adr,145);assert.deepEqual(memo.selected.result,forecastInvestment(input.shared.current,input.shared.projected,input.shared.investment));assert.deepEqual(input.scenarios,DEFAULT_SCENARIOS);
});
test('default recommendation is conditional with execution Review and no fabricated EAC',()=>{
 const memo=generateInvestmentMemo(makeInput());assert.equal(memo.decision.recommendation,'CONDITIONAL APPROVAL');assert.equal(memo.decision.matrix.find(c=>c.id==='execution')!.status,'Review');assert.equal(memo.projectEAC,null);assert.equal(memo.portfolioLink.linked,false);assert.equal(memo.maximumModelledScenarioCapex,6000000);assert.ok(memo.decision.conditions.length>=6);
});
test('threshold changes change the decision; all core financial failures prevent approval',()=>{
 assert.equal(decision().recommendation,'APPROVE');
 for(const override of [{minIRR:.2},{minNPV:2000000},{maxPayback:5},{maxCapex:4500000}])assert.equal(decision(metrics,{...DEFAULT_APPROVAL_POLICY,...override}).recommendation,'DO NOT APPROVE');
 const strict=decision({...metrics,downsideNPV:-1});assert.equal(strict.recommendation,'CONDITIONAL APPROVAL');assert.equal(strict.matrix.find(c=>c.id==='downside')!.status,'Fail');
 assert.equal(decision({...metrics,downsideNPV:-1},{...DEFAULT_APPROVAL_POLICY,allowNegativeDownside:true}).recommendation,'APPROVE');
});
test('negative NPV is never approved even with a negative configured hurdle',()=>{
 const d=decision({...metrics,npv:-100},{...DEFAULT_APPROVAL_POLICY,minNPV:-1000000});assert.equal(d.recommendation,'DO NOT APPROVE');assert.equal(d.matrix.find(c=>c.id==='npv')!.requirement,0);
});
test('missing, ambiguous or non-finite returns cannot pass criteria',()=>{
 for(const bad of [{irr:null},{payback:null},{irr:NaN},{npv:Infinity},{capex:NaN},{payback:Infinity}]){const d=decision({...metrics,...bad});assert.equal(d.recommendation,'DO NOT APPROVE');finiteTree(d);}
 const input=makeInput();input.shared.current.occupancy=0;input.shared.projected.occupancy=0;input.config.caseId='custom';const memo=generateInvestmentMemo(input);assert.equal(memo.selected.result.irr.value,null);assert.equal(memo.decision.recommendation,'DO NOT APPROVE');finiteTree(memoFinancialRows(memo));
});
test('unknown, missing or unreferenced execution evidence is never a Pass',()=>{
 for(const evidence of [[],supported().slice(1),supported().map(e=>({...e,reference:''})),supported().map(e=>({...e,status:'unknown' as const}))]){
  const d=assessInvestment(metrics,DEFAULT_APPROVAL_POLICY,evidence,'clear','Review note',[]);assert.equal(d.recommendation,'CONDITIONAL APPROVAL');assert.equal(d.matrix.find(c=>c.id==='execution')!.status,'Review');
 }
 assert.equal(assessInvestment(metrics,DEFAULT_APPROVAL_POLICY,supported(),'unknown','',[]).recommendation,'CONDITIONAL APPROVAL');
});
test('material or adverse findings follow the blocking policy and never yield unconditional approval',()=>{
 for(const riskState of ['unknown','material'] as const){const d=assessInvestment(metrics,DEFAULT_APPROVAL_POLICY,supported(),riskState,'Review note',[]);assert.notEqual(d.recommendation,'APPROVE');}
 assert.equal(assessInvestment(metrics,DEFAULT_APPROVAL_POLICY,supported(),'material','Review note',[]).recommendation,'DO NOT APPROVE');
 assert.equal(assessInvestment(metrics,{...DEFAULT_APPROVAL_POLICY,materialFlagsBlock:false},supported(),'material','Review note',[]).recommendation,'CONDITIONAL APPROVAL');
 const evidence=supported();evidence[0].status='adverse';assert.equal(assessInvestment(metrics,DEFAULT_APPROVAL_POLICY,evidence,'clear','Review note',[]).recommendation,'DO NOT APPROVE');
 assert.equal(assessInvestment(metrics,DEFAULT_APPROVAL_POLICY,supported(),'clear','Review note',['Open contractor diligence']).recommendation,'CONDITIONAL APPROVAL');
});
test('frozen snapshots stay consistent and stale exports are rejected after any relevant edit',()=>{
 const input=makeInput(),original=structuredClone(input),memo=generateInvestmentMemo(input);assert.deepEqual(input,original);assert.ok(Object.isFrozen(memo.selected.result.years));assert.ok(isMemoCurrent(memo,input));assert.doesNotThrow(()=>assertMemoExportable(memo,input));
 for(const mutate of [(i:MemoInput)=>i.shared.current.adr++,(i:MemoInput)=>i.scenarios.base.adr++,(i:MemoInput)=>i.config.caseId='upside',(i:MemoInput)=>i.config.policy.minIRR=.2,(i:MemoInput)=>i.config.analystComments='New note',(i:MemoInput)=>i.config.charts.npv=false]){
  const changed=structuredClone(input);mutate(changed);assert.ok(!isMemoCurrent(memo,changed));assert.throws(()=>assertMemoExportable(memo,changed));
 }
 input.scenarios.base.adr=170;const updated=generateInvestmentMemo(input);assert.notEqual(updated.selected.result.npv,memo.selected.result.npv);assert.notEqual(updated.version,memo.version);assert.equal(memo.selected.settings.projected.adr,145);
});
test('memo CSV cash flows and scenario rows reconcile to the selected snapshot',()=>{
 for(const caseId of ['base','downside','upside','custom'] as const){
  const input=makeInput();input.config.caseId=caseId;input.shared.investment.horizon=7;const memo=generateInvestmentMemo(input),rows=memoFinancialRows(memo),annual=rows.filter(row=>typeof row[0]==='number');
  assert.equal(annual.length,8);assert.deepEqual(annual.map(row=>row[7]),memo.selected.result.flows);assert.equal(rows.find(row=>row[0]==='NPV GBP')![1],memo.selected.result.npv);assert.equal(rows.find(row=>row[0]==='IRR decimal')![1],memo.selected.result.irr.value);assert.ok(rows.some(row=>row.includes(memo.version)&&row.includes(caseId)));
  for(const [i,y] of memo.selected.result.years.entries()){assert.equal(annual[i+1][1],y.without.ebitda);assert.equal(annual[i+1][2],y.withRenovation.ebitda);assert.equal(annual[i+1][9],y.pv);assert.equal(annual[i+1][10],y.cumulative);}
 }
});
test('memo narrative numerical claims use actual model results; executive summary is concise',()=>{
 const memo=generateInvestmentMemo(makeInput()),r=memo.selected.result,money=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
 assert.ok(memo.summary.includes(money(r.npv)));assert.ok(memo.summary.includes((r.irr.value!*100).toFixed(2)+'%'));assert.ok(memo.summary.includes(money(memo.scenarios[0].result.npv)));assert.ok(memo.summary.includes(money(memo.tornado[0].maxImpact)));const words=memo.summary.split(/\s+/).length;assert.ok(words>=150&&words<=200,`Summary is ${words} words`);
 const html=renderInvestmentMemo(memo,'/portfolio/');assert.ok(html.includes(money(r.npv)));for(const flow of r.flows)assert.ok(html.includes(money(flow)));assert.ok(html.includes(memo.version));assert.ok(html.includes(memo.decision.recommendation));
});
test('print uses the same rendered snapshot; chart configuration and safe analyst text are respected',()=>{
 const input=makeInput();input.config.analystComments='<script>alert("x")</script>';input.config.additionalConditions=['Validate <budget>'];input.config.charts={npv:false,cashFlow:false,cumulative:false};const memo=generateInvestmentMemo(input),screen=renderInvestmentMemo(memo,'/portfolio/');
 assert.equal(renderInvestmentMemo(memo,'/portfolio/'),screen);assert.ok(screen.includes('data-memo-version="'+memo.version+'"'));assert.ok(screen.includes('data-memo-case="base"'));assert.ok(!screen.includes('<svg'));assert.ok(!screen.includes('<script>'));assert.ok(screen.includes('&lt;script&gt;'));assert.ok(screen.includes('Validate &lt;budget&gt;'));
});
test('input validation rejects invalid dates, thresholds and evidence states',()=>{
 for(const change of [(i:MemoInput)=>i.config.analysisDate='2026-02-30',(i:MemoInput)=>i.config.policy.minIRR=NaN,(i:MemoInput)=>i.config.policy.maxPayback=-1,(i:MemoInput)=>i.config.policy.maxCapex=Infinity,(i:MemoInput)=>i.config.evidence.push({...i.config.evidence[0]})]){const input=makeInput();change(input);assert.throws(()=>generateInvestmentMemo(input));}
});

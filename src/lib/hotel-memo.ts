import { calculateOperatingMetrics } from './hotel-model.ts';
import { compareScenarios, runModel, calculateTornado, calculateBreakEvens, type ModelSettings, type ScenarioId, type ScenarioOverrides } from './hotel-scenarios.ts';
export type MemoCase = ScenarioId | 'custom';
export interface ApprovalPolicy { minIRR:number; minNPV:number; maxPayback:number; maxCapex:number; allowNegativeDownside:boolean; materialFlagsBlock:boolean }
export const DEFAULT_APPROVAL_POLICY:Readonly<ApprovalPolicy>=Object.freeze({minIRR:.1,minNPV:0,maxPayback:8,maxCapex:5500000,allowNegativeDownside:false,materialFlagsBlock:true});
export const EVIDENCE_ITEMS = [
 {id:'cost',label:'Contractor scope and cost confirmation',action:'Obtain a documented contractor cost estimate and reconcile exclusions.'},
 {id:'commercial',label:'Projected ADR and occupancy validation',action:'Validate rate and occupancy targets using independently sourced comparable evidence.'},
 {id:'schedule',label:'Implementation schedule and room closures',action:'Confirm the works sequence, duration and temporary room closures.'},
 {id:'operating',label:'Operating cost and disruption review',action:'Review operating cost calibration and the disruption cash-flow assumptions.'},
 {id:'contingency',label:'Contingency and capital scope review',action:'Confirm a quantified contingency and reconcile it to the proposed capital scope.'},
 {id:'risk',label:'Execution risk register and mitigation review',action:'Review and document execution risks, mitigations and accountable owners.'},
] as const;
export interface EvidenceRecord {id:string;status:'unknown'|'supported'|'adverse';reference:string}
export interface MemoConfig {caseId:MemoCase;analysisDate:string;policy:ApprovalPolicy;evidence:EvidenceRecord[];riskState:'unknown'|'clear'|'material';riskReference:string;analystComments:string;additionalConditions:string[];charts:{npv:boolean;cashFlow:boolean;cumulative:boolean}}
export interface MemoSource {shared:ModelSettings;scenarios:Record<ScenarioId,ScenarioOverrides>}
export interface MemoInput extends MemoSource {config:MemoConfig}
export type Recommendation='APPROVE'|'CONDITIONAL APPROVAL'|'DO NOT APPROVE';
export interface DecisionCriterion {id:string;actual:number|null;requirement:number|boolean|null;status:'Pass'|'Fail'|'Review';reason:string}
export interface DecisionMetrics {npv:number;irr:number|null;payback:number|null;capex:number;downsideNPV:number}
export function validateMemoConfig(c:MemoConfig) {
 if(!['base','downside','upside','custom'].includes(c.caseId))throw new RangeError('Invalid investment case');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(c.analysisDate)||!Number.isFinite(Date.parse(c.analysisDate))||new Date(c.analysisDate).toISOString().slice(0,10)!==c.analysisDate)throw new RangeError('Invalid analysis date');
 const p=c.policy;
 if(!Number.isFinite(p.minIRR)||p.minIRR<0||p.minIRR>1||!Number.isFinite(p.minNPV)||Math.abs(p.minNPV)>100000000||!Number.isFinite(p.maxPayback)||p.maxPayback<0||p.maxPayback>30||!Number.isFinite(p.maxCapex)||p.maxCapex<0||p.maxCapex>100000000||typeof p.allowNegativeDownside!=='boolean'||typeof p.materialFlagsBlock!=='boolean')throw new RangeError('Invalid decision thresholds');
 if(!['unknown','clear','material'].includes(c.riskState)||c.evidence.some(e=>!['unknown','supported','adverse'].includes(e.status)))throw new RangeError('Invalid evidence status');
 if(new Set(c.evidence.map(e=>e.id)).size!==c.evidence.length)throw new RangeError('Duplicate evidence records');
 if(c.analystComments.length>10000||c.additionalConditions.some(v=>v.length>2000)||c.riskReference.length>1000||c.evidence.some(e=>e.reference.length>1000))throw new RangeError('Comment exceeds limit');
}
export function assessInvestment(metrics:DecisionMetrics,policy:ApprovalPolicy,evidence:readonly EvidenceRecord[],riskState:MemoConfig['riskState'],riskReference:string,additionalConditions:readonly string[]) {
 const known=(value:number|null):value is number=>value!==null&&Number.isFinite(value);
 const criterion=(id:string,actual:number|null,requirement:number,pass:boolean,reason:string):DecisionCriterion=>({id,actual:known(actual)?actual:null,requirement,status:pass?'Pass':'Fail',reason});
 const matrix:DecisionCriterion[]=[
  criterion('npv',known(metrics.npv)?metrics.npv:null,Math.max(0,policy.minNPV),known(metrics.npv)&&metrics.npv>=Math.max(0,policy.minNPV),'NPV must meet the selected hurdle and the nonnegative-value safeguard.'),
  criterion('irr',metrics.irr,policy.minIRR,known(metrics.irr)&&metrics.irr>=policy.minIRR,'Unavailable or ambiguous IRR is not a passing return.'),
  criterion('payback',metrics.payback,policy.maxPayback,known(metrics.payback)&&metrics.payback>=0&&metrics.payback<=policy.maxPayback,'Simple payback must be achieved and within the selected limit.'),
  criterion('capex',known(metrics.capex)?metrics.capex:null,policy.maxCapex,known(metrics.capex)&&metrics.capex>=0&&metrics.capex<=policy.maxCapex,'Proposed initial model capex must be within the capital limit.'),
  {id:'downside',actual:known(metrics.downsideNPV)?metrics.downsideNPV:null,requirement:policy.allowNegativeDownside,status:known(metrics.downsideNPV)&&(metrics.downsideNPV>=0||policy.allowNegativeDownside)?'Pass':'Fail',reason:policy.allowNegativeDownside?'The policy explicitly permits negative downside NPV; this is risk acceptance, not a probability statement.':'Negative or missing downside NPV requires revised assumptions or explicit risk acceptance.'},
 ];
 const incomplete=EVIDENCE_ITEMS.filter(item=>{const e=evidence.find(r=>r.id===item.id);return !e||e.status!=='supported'||!e.reference.trim();});
 const adverse=evidence.some(e=>e.status==='adverse'),riskKnown=riskState==='clear'&&riskReference.trim().length>0;
 const readiness:DecisionCriterion={id:'execution',actual:null,requirement:policy.materialFlagsBlock,status:adverse||riskState==='material'?'Fail':incomplete.length||!riskKnown?'Review':'Pass',reason:adverse?'Adverse analyst evidence is unresolved.':riskState==='material'?'Material execution risk is identified; proposed mitigations do not resolve it.':incomplete.length||!riskKnown?'Execution evidence or a referenced risk review is missing. Unknown is not Pass.':'All required illustrative analyst evidence records and a clear risk review have references; no independent verification is claimed.'};
 matrix.push(readiness);
 const financialFailure=matrix.slice(0,4).some(c=>c.status!=='Pass');
 const blockingExecution=policy.materialFlagsBlock&&(riskState==='material'||adverse);
 const conditions=[...(financialFailure?['Revise the underwriting to address failed core financial criteria before resubmission.']:[]),...incomplete.map(item=>item.action),...(!riskKnown?['Resolve execution risk findings and document the residual risk review.']:[]),...(matrix[4].status!=='Pass'?['Address the negative or unavailable downside case, or explicitly revise downside risk acceptance.']:[]),...additionalConditions.filter(v=>v.trim())];
 const recommendation:Recommendation=financialFailure||blockingExecution?'DO NOT APPROVE':matrix.every(c=>c.status==='Pass')&&conditions.length===0?'APPROVE':'CONDITIONAL APPROVAL';
 return {recommendation,matrix,conditions,financialFailure,executionReady:readiness.status==='Pass',blockingExecution};
}
const gbp=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
const percent=(n:number)=>`${(n*100).toFixed(2)}%`;
const number=(n:number)=>n.toFixed(2);
export function memoInputSignature(input:MemoInput) {return JSON.stringify(input);}
function versionId(text:string){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return `IC-${(hash>>>0).toString(16).padStart(8,'0')}`;}
function freezeDeep<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value);}return value;}
export function generateInvestmentMemo(input:MemoInput) {
 const frozen=structuredClone(input);validateMemoConfig(frozen.config);
 const scenarios=compareScenarios(frozen.shared,frozen.scenarios);
 const selected=frozen.config.caseId==='custom'?{id:'custom' as const,settings:structuredClone(frozen.shared),result:runModel(frozen.shared)}:scenarios.find(c=>c.id===frozen.config.caseId)!;
 const result=selected.result,settings=selected.settings,downside=scenarios.find(s=>s.id==='downside')!;
 const current=calculateOperatingMetrics(settings.current),projected=calculateOperatingMetrics({...settings.projected,rooms:settings.current.rooms,days:settings.current.days});
 const decision=assessInvestment({npv:result.npv,irr:result.irr.value,payback:result.payback,capex:settings.investment.capex,downsideNPV:downside.result.npv},frozen.config.policy,frozen.config.evidence,frozen.config.riskState,frozen.config.riskReference,frozen.config.additionalConditions);
 const tornado=calculateTornado(settings),breakEvens=calculateBreakEvens(settings);
 const signature=memoInputSignature(frozen),version=versionId(signature);
 const summary=[
  `The committee is asked to consider a hypothetical ${gbp(settings.investment.capex)} refurbishment of a ${settings.current.rooms}-room upscale hotel under the ${selected.id} appraisal case.`,
  `The strategic hypothesis is that improved guest experience supports projected occupancy of ${percent(settings.projected.occupancy)} and ADR of ${gbp(settings.projected.adr)}; neither market demand nor the renovation scope has been independently verified.`,
  `The ${settings.investment.horizon}-year, pre-tax unlevered model produces NPV of ${gbp(result.npv)} at a ${percent(settings.investment.discountRate)} discount rate and IRR of ${result.irr.value===null?'unavailable':percent(result.irr.value)}.`,
  `Simple payback is ${result.payback===null?'not achieved within the horizon':number(result.payback)+' years'}, and downside-scenario NPV is ${gbp(downside.result.npv)}.`,
  `The largest tested one-way sensitivity is ${tornado[0].key}, with maximum absolute NPV impact of ${gbp(tornado[0].maxImpact)} within its stated test range.`,
  `The recommendation is ${decision.recommendation}; ${decision.matrix.filter(c=>c.status==='Pass').length} of ${decision.matrix.length} decision criteria pass, while execution readiness is ${decision.matrix.find(c=>c.id==='execution')!.status.toLowerCase()}.`,
  `Contractor pricing, commercial assumptions, delivery timing and contingency require evidence-based review; proposed mitigations are future diligence rather than completed checks.`,
  `The separate capex oversight portfolio has no consistently linked project record, so it supplies neither a project EAC nor verified execution evidence. These results support discussion and do not replace professional investment judgement.`,
 ].join(' ');
 const risks=[
  {id:'commercial',description:'Projected occupancy and ADR may not be achievable.',consequence:'Incremental operating benefits may not cover investment outflows.',evidence:`Current occupancy ${percent(current.occupancy)}, ADR ${gbp(current.adr)}; target ${percent(projected.occupancy)}, ${gbp(projected.adr)}. Downside NPV ${gbp(downside.result.npv)}.`,mitigation:'Commission independent comparable analysis and validate commercial targets.',residual:'Demand, price elasticity and scenario likelihoods are unverified.'},
  {id:'cost',description:'Capital cost escalation or omitted scope.',consequence:'Additional initial outflows reduce project NPV.',evidence:`Modelled initial capex ${gbp(settings.investment.capex)}. Contractor EAC unavailable; no linked portfolio record.`,mitigation:'Obtain a contractor estimate, scope exclusions and contingency schedule.',residual:'A model input is not a contracted or approved expenditure forecast.'},
  {id:'schedule',description:'Renovation duration and room disruption.',consequence:'Reduced room supply and continuing fixed costs lower operating cash flow.',evidence:`${settings.investment.renovationMonths} months works; ${percent(settings.investment.unavailableRooms)} rooms unavailable during works; modelled disruption loss ${gbp(result.disruptionLoss)}.`,mitigation:'Validate phasing with Operations and Architecture & Design.',residual:'The model uses annual time-weighting and excludes monthly seasonality.'},
  {id:'operating',description:'Operating costs and margin calibration may differ from actual delivery.',consequence:'EBITDA and incremental cash flow may fall below the appraisal.',evidence:`Annual cost inflation ${percent(settings.investment.costInflation)}; projected starting EBITDA margin ${percent(projected.margin)}.`,mitigation:'Review staffing, distribution costs, department budgets and fixed-cost assumptions.',residual:'Phase 2 recalibrates starting costs from margin; sensitivities are not a fixed-cost demand model.'},
  {id:'forecast',description:'Forecast uncertainty and residual benefit assumptions.',consequence:'Long-horizon cash flows and end-of-horizon receipts may not occur.',evidence:`${settings.investment.horizon}-year horizon; final-year residual investment benefit ${gbp(settings.investment.residual)}.`,mitigation:'Monitor realised room rates, occupancy, EBITDA, capex and programme milestones.',residual:'Pre-tax, unlevered model excludes working capital, financing and detailed replacement reserves.'},
 ];
 return freezeDeep({input:frozen,signature,version,selected,scenarios,current,projected,decision,tornado,breakEvens,summary,risks,projectEAC:null,maximumModelledScenarioCapex:Math.max(...scenarios.map(s=>s.settings.investment.capex),settings.investment.capex),portfolioLink:{linked:false,reason:'No matching dated investment project identifier exists in Phase 4. Portfolio budgets, EAC, synthetic benchmarks and risk flags are not used as appraisal evidence.'}});
}
export type InvestmentMemo=ReturnType<typeof generateInvestmentMemo>;
export function isMemoCurrent(memo:InvestmentMemo,input:MemoInput) {return memo.signature===memoInputSignature(input);}
export function assertMemoExportable(memo:InvestmentMemo,input:MemoInput) {if(!isMemoCurrent(memo,input))throw new Error('Memo is stale; regenerate before export');}
export function memoFinancialRows(memo:InvestmentMemo):(string|number|null)[][] {
 const r=memo.selected.result,p=memo.selected.settings.investment;
 return [['Hypothetical investment appraisal; pre-tax and unlevered; no hotel group endorsement'],['Analysis date',memo.input.config.analysisDate,'Snapshot',memo.version,'Case',memo.selected.id,'Currency','GBP'],['Recommendation',memo.decision.recommendation],['NPV GBP',r.npv],['IRR decimal',r.irr.value],['Simple payback years',r.payback],['Discounted payback years',r.discountedPayback],['ROI decimal',r.roi],['Initial model capex GBP',p.capex],['Linked project EAC GBP',null],['Maximum tested scenario initial capex GBP',memo.maximumModelledScenarioCapex],['Year','Without renovation EBITDA GBP','With renovation EBITDA GBP','Incremental EBITDA GBP','Initial capex GBP','Maintenance capex GBP','Residual benefit GBP','Incremental FCF GBP','Discount factor','Present value GBP','Cumulative FCF GBP'],[0,null,null,null,-p.capex,0,0,r.flows[0],1,r.flows[0],r.flows[0]],...r.years.map(y=>[y.year,y.without.ebitda,y.withRenovation.ebitda,y.incrementalEBITDA,0,-y.maintenance,y.residual,y.fcf,y.discountFactor,y.pv,y.cumulative]),['Scenario','NPV GBP','IRR decimal','Simple payback years','Discounted payback years','ROI decimal','Initial capex GBP'],...memo.scenarios.map(s=>[s.id,s.result.npv,s.result.irr.value,s.result.payback,s.result.discountedPayback,s.result.roi,s.settings.investment.capex]),['Decision criterion','Actual','Requirement','Status'],...memo.decision.matrix.map(c=>[c.id,c.actual,typeof c.requirement==='boolean'?String(c.requirement):c.requirement,c.status])];
}

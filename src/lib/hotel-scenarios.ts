import { forecastInvestment, type InvestmentAssumptions } from './hotel-investment.ts';
import type { OperatingAssumptions } from './hotel-model.ts';

export interface ModelSettings { current: OperatingAssumptions; projected: OperatingAssumptions; investment: InvestmentAssumptions }
export interface ScenarioOverrides { occupancy: number; adr: number; capex: number; costInflation: number }
export type ScenarioId = 'downside' | 'base' | 'upside';
export const SCENARIO_IDS: readonly ScenarioId[] = ['downside','base','upside'];
export const DEFAULT_SCENARIOS: Readonly<Record<ScenarioId, Readonly<ScenarioOverrides>>> = Object.freeze({
 downside: Object.freeze({ occupancy:.70, adr:135, capex:6000000, costInflation:.035 }),
 base: Object.freeze({ occupancy:.78, adr:145, capex:5000000, costInflation:.02 }),
 upside: Object.freeze({ occupancy:.85, adr:160, capex:4500000, costInflation:.015 }),
});
export type SensitivityVariable = 'adr' | 'occupancy' | 'capex' | 'discountRate' | 'costInflation' | 'renovationMonths' | 'unavailableRooms';
const LIMITS: Record<SensitivityVariable, readonly [number,number]> = { adr:[0,5000],occupancy:[0,1],capex:[0,100000000],discountRate:[0,.5],costInflation:[0,.2],renovationMonths:[0,120],unavailableRooms:[0,1] };
const within = (n:number,min:number,max:number) => Number.isFinite(n) && n>=min && n<=max;
export function validateModelSettings(s: ModelSettings) {
 for(const a of [s.current,s.projected]) {
  if(!Number.isInteger(a.rooms)||!within(a.rooms,0,2000)||!Number.isInteger(a.days)||!within(a.days,1,366)||!within(a.occupancy,0,1)||!within(a.adr,0,5000)||!within(a.margin,0,1)||!within(a.ancillaryRate,0,2))throw new RangeError('Invalid operating assumptions');
 }
 const p=s.investment;
 for(const key of ['capex','discountRate','costInflation','renovationMonths','unavailableRooms'] as const) if(!within(p[key],...LIMITS[key])) throw new RangeError(`Invalid ${key}`);
 if(!Number.isInteger(p.horizon)||!within(p.horizon,1,30)||!within(p.adrGrowth,0,.2)||!within(p.fixedCostShare,0,1)||!within(p.maintenance,0,10000000)||!within(p.residual,0,100000000)||p.renovationMonths>p.horizon*12) throw new RangeError('Invalid investment assumptions');
}
export function resolveScenario(shared: ModelSettings, overrides: ScenarioOverrides): ModelSettings {
 const settings={current:{...shared.current},projected:{...shared.projected,occupancy:overrides.occupancy,adr:overrides.adr},investment:{...shared.investment,capex:overrides.capex,costInflation:overrides.costInflation}};
 validateModelSettings(settings);return settings;
}
export function runModel(settings: ModelSettings) {
 validateModelSettings(settings);
 return forecastInvestment(settings.current,settings.projected,settings.investment);
}
export function compareScenarios(shared: ModelSettings, scenarios: Record<ScenarioId,ScenarioOverrides>) {
 return SCENARIO_IDS.map(id=>{const settings=resolveScenario(shared,scenarios[id]);return {id,settings,result:runModel(settings)};});
}
export function variableValue(s:ModelSettings,key:SensitivityVariable) {return key==='adr'||key==='occupancy'?s.projected[key]:s.investment[key];}
export function withVariable(s:ModelSettings,key:SensitivityVariable,value:number):ModelSettings {
 const clone={current:{...s.current},projected:{...s.projected},investment:{...s.investment}};
 if(key==='adr'||key==='occupancy')clone.projected[key]=value;else clone.investment[key]=value;
 validateModelSettings(clone);return clone;
}
export const SENSITIVITY_PAIRS = {
 'adr-occupancy':['adr','occupancy'], 'capex-adr':['capex','adr'],
 'capex-occupancy':['capex','occupancy'], 'discount-capex':['discountRate','capex'],
} as const;
export type SensitivityPair = keyof typeof SENSITIVITY_PAIRS;
export function sensitivityRanges(s:ModelSettings,pair:SensitivityPair) {
 const capex=s.investment.capex;
 const ranges: Partial<Record<SensitivityVariable,number[]>>={adr:[125,135,145,155,165,175],occupancy:[.65,.70,.75,.80,.85,.90],capex:capex===0?[0,250000,500000,750000,1000000]:[.8,.9,1,1.1,1.2].map(x=>Math.min(100000000,capex*x)),discountRate:[.06,.08,.10,.12,.14]};
 const [x,y]=SENSITIVITY_PAIRS[pair];return {x,y,xValues:[...new Set(ranges[x]!)],yValues:[...new Set(ranges[y]!)]};
}
export function calculateHeatmap(s:ModelSettings,pair:SensitivityPair) {
 const axes=sensitivityRanges(s,pair);
 const cells=axes.yValues.map(y=>axes.xValues.map(x=>({x,y,npv:runModel(withVariable(withVariable(s,axes.x,x),axes.y,y)).npv,isReference:Math.abs(variableValue(s,axes.x)-x)<1e-8&&Math.abs(variableValue(s,axes.y)-y)<1e-8})));
 return {...axes,cells};
}
export function calculateTornado(s:ModelSettings) {
 const baseNPV=runModel(s).npv;
 const ranges: {key:SensitivityVariable;low:number;high:number}[]=[
  {key:'adr',low:s.projected.adr*.9,high:Math.min(5000,s.projected.adr*1.1)},
  {key:'occupancy',low:Math.max(0,s.projected.occupancy-.05),high:Math.min(1,s.projected.occupancy+.05)},
  {key:'capex',low:s.investment.capex*.8,high:Math.min(100000000,s.investment.capex*1.2)},
  {key:'discountRate',low:Math.max(0,s.investment.discountRate-.02),high:Math.min(.5,s.investment.discountRate+.02)},
  {key:'costInflation',low:Math.max(0,s.investment.costInflation-.01),high:Math.min(.2,s.investment.costInflation+.01)},
  {key:'renovationMonths',low:Math.max(0,s.investment.renovationMonths-3),high:Math.min(120,s.investment.horizon*12,s.investment.renovationMonths+3)},
  {key:'unavailableRooms',low:Math.max(0,s.investment.unavailableRooms-.10),high:Math.min(1,s.investment.unavailableRooms+.10)},
 ];
 return ranges.map(row=>{
  const lowNPV=runModel(withVariable(s,row.key,row.low)).npv,highNPV=runModel(withVariable(s,row.key,row.high)).npv;
  const lowImpact=lowNPV-baseNPV,highImpact=highNPV-baseNPV;
  return {...row,lowNPV,highNPV,lowImpact,highImpact,maxImpact:Math.max(Math.abs(lowImpact),Math.abs(highImpact))};
 }).sort((a,b)=>b.maxImpact-a.maxImpact);
}
export const BREAK_EVEN_TOLERANCE = 1; // £1 NPV residual, not £1 in the tested input.
export type RootResult = {status:'found';value:number;npv:number;iterations:number} | {status:'no-solution'|'non-finite'|'not-converged';value:null;npv:null;iterations:number};
/** Bisection: requires opposite endpoint signs or an endpoint within £1 NPV. No extrapolation. */
export function findBoundedRoot(fn:(value:number)=>number,low:number,high:number,tolerance=BREAK_EVEN_TOLERANCE):RootResult {
 if(!Number.isFinite(low)||!Number.isFinite(high)||low>high||!Number.isFinite(tolerance)||tolerance<=0)throw new RangeError('Invalid search interval or tolerance');
 let a=low,b=high,fa=fn(a),fb=fn(b);
 if(!Number.isFinite(fa)||!Number.isFinite(fb))return {status:'non-finite',value:null,npv:null,iterations:0};
 if(Math.abs(fa)<=tolerance)return {status:'found',value:a,npv:fa,iterations:0};
 if(Math.abs(fb)<=tolerance)return {status:'found',value:b,npv:fb,iterations:0};
 if(Math.sign(fa)===Math.sign(fb))return {status:'no-solution',value:null,npv:null,iterations:0};
 for(let i=1;i<=200;i++){
  const mid=(a+b)/2,fm=fn(mid);
  if(!Number.isFinite(fm))return {status:'non-finite',value:null,npv:null,iterations:i};
  if(Math.abs(fm)<=tolerance)return {status:'found',value:mid,npv:fm,iterations:i};
  if(Math.sign(fm)===Math.sign(fa)){a=mid;fa=fm;}else b=mid;
 }
 return {status:'not-converged',value:null,npv:null,iterations:200};
}
export function calculateBreakEvens(s:ModelSettings) {
 // With fixed margins used only to calibrate starting costs, ADR and occupancy
 // each scale the same renovated revenue/cost seed. Their NPV is affine at fixed
 // other inputs; capex appears once at t=0. Thus each bounded sign crossing is unique
 // unless the function is flat (reported separately).
 const intervals=[{key:'adr' as const,low:0,high:5000},{key:'occupancy' as const,low:0,high:1},{key:'capex' as const,low:0,high:100000000}];
 return intervals.map(interval=>{
  const fn=(v:number)=>runModel(withVariable(s,interval.key,v)).npv;
  const lowNPV=fn(interval.low),highNPV=fn(interval.high);
  const flat=Math.abs(highNPV-lowNPV)<1e-8;
  const direction=flat?'flat':highNPV>lowNPV?'increasing':'decreasing';
  return {...interval,direction,lowNPV,highNPV,result:flat?{status:'no-solution' as const,value:null,npv:null,iterations:0}:findBoundedRoot(fn,interval.low,interval.high)};
 });
}

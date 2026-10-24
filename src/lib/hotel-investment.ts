import { calculateOperatingMetrics, type OperatingAssumptions } from './hotel-model.ts';
export interface InvestmentAssumptions { capex: number; horizon: number; discountRate: number; adrGrowth: number; costInflation: number; renovationMonths: number; unavailableRooms: number; maintenance: number; residual: number; fixedCostShare: number }
export const DEFAULT_INVESTMENT: InvestmentAssumptions = { capex: 5000000, horizon: 10, discountRate: .10, adrGrowth: .025, costInflation: .02, renovationMonths: 6, unavailableRooms: .20, maintenance: 50000, residual: 0, fixedCostShare: .60 };
export function calculateNPV(flows: number[], rate: number): number {
 if (!Number.isFinite(rate) || rate <= -1 || flows.some(x => !Number.isFinite(x))) throw new RangeError('Invalid cash flows or discount rate');
 return flows.reduce((sum, flow, year) => sum + flow / (1 + rate) ** year, 0);
}
export function calculateIRR(flows: number[]): { value: number | null; status: 'unique' | 'none' | 'ambiguous' } {
 const signs = flows.filter(x => x !== 0).map(Math.sign);
 const changes = signs.slice(1).filter((s,i) => s !== signs[i]).length;
 if (!flows.every(Number.isFinite) || changes === 0) return { value: null, status: 'none' };
 // Multiple sign changes can produce multiple roots. Do not select an arbitrary IRR.
 if (changes > 1) return { value: null, status: 'ambiguous' };
 let lo = -.999999, hi = 1;
 let left = calculateNPV(flows,lo), right = calculateNPV(flows,hi);
 while (Math.sign(left) === Math.sign(right) && hi < 1e12) { hi = hi * 2 + 1; right = calculateNPV(flows,hi); }
 if (Math.sign(left) === Math.sign(right)) return { value:null,status:'none' };
 for (let i=0;i<200;i++) { const mid=(lo+hi)/2, value=calculateNPV(flows,mid); if(Math.sign(value)===Math.sign(left)){lo=mid;left=value;}else hi=mid; }
 return {value:(lo+hi)/2,status:'unique'};
}
/** Linear interpolation within the first recovery year; flows are otherwise year-end. */
export function calculatePayback(flows: number[]): number | null {
 let cumulative=flows[0] ?? 0;
 if(cumulative>=0)return 0;
 for(let year=1;year<flows.length;year++){const next=cumulative+flows[year];if(next>=0 && flows[year]>0)return year-1-cumulative/flows[year];cumulative=next;}
 return null;
}
export function forecastInvestment(current: OperatingAssumptions, projected: OperatingAssumptions, p: InvestmentAssumptions) {
 for(const [key,value] of Object.entries(p)) if(!Number.isFinite(value) || value<0) throw new RangeError(`Invalid ${key}`);
 if(!Number.isInteger(p.horizon)||p.horizon<1||p.horizon>30||p.unavailableRooms>1||p.fixedCostShare>1||p.renovationMonths>p.horizon*12)throw new RangeError('Invalid forecast range');
 const base=calculateOperatingMetrics(current);
 // Capacity is common: only operating improvements differ between the scenarios.
 const target=calculateOperatingMetrics({...projected,rooms:current.rooms,days:current.days});
 const forecast=(seed: typeof base,year: number,availability=1)=>{
  const growth=(1+p.adrGrowth)**(year-1), inflation=(1+p.costInflation)**(year-1);
  const revenue=calculateOperatingMetrics({rooms:current.rooms*availability,days:current.days,occupancy:seed.occupancy,adr:seed.adr*growth,ancillaryRate:seed.roomRevenue ? seed.ancillaryRevenue/seed.roomRevenue : 0,margin:0});
  const costs=(seed.totalRevenue-seed.ebitda)*inflation*(p.fixedCostShare+(1-p.fixedCostShare)*availability);
  return {...revenue,costs,ebitda:revenue.totalRevenue-costs,margin:revenue.totalRevenue ? (revenue.totalRevenue-costs)/revenue.totalRevenue : 0};
 };
 const flows=[-p.capex];let cumulative=-p.capex;
 const years=Array.from({length:p.horizon},(_,i)=>{
  const year=i+1, fraction=Math.max(0,Math.min(1,p.renovationMonths/12-i));
  const without=forecast(base,year), during=forecast(base,year,1-p.unavailableRooms), after=forecast(target,year);
  const withRenovation={...after};
  for(const key of ['available','occupied','roomRevenue','ancillaryRevenue','totalRevenue','costs','ebitda'] as const) withRenovation[key]=during[key]*fraction+after[key]*(1-fraction);
  withRenovation.occupancy=withRenovation.available ? withRenovation.occupied/withRenovation.available : 0;
  withRenovation.adr=withRenovation.occupied ? withRenovation.roomRevenue/withRenovation.occupied : 0;
  withRenovation.revpar=withRenovation.available ? withRenovation.roomRevenue/withRenovation.available : 0;
  withRenovation.margin=withRenovation.totalRevenue ? withRenovation.ebitda/withRenovation.totalRevenue : 0;
  const incrementalEBITDA=withRenovation.ebitda-without.ebitda;
  const disruptionLoss=(without.ebitda-during.ebitda)*fraction;
  const residual=year===p.horizon?p.residual:0;
  const fcf=incrementalEBITDA-p.maintenance+residual;
  const discountFactor=1/(1+p.discountRate)**year;
  cumulative+=fcf;flows.push(fcf);
  return {year,without,withRenovation,incrementalEBITDA,disruptionLoss,capex:0,maintenance:p.maintenance,residual,fcf,discountFactor,pv:fcf*discountFactor,cumulative};
 });
 const operatingBenefit=years.reduce((s,y)=>s+y.incrementalEBITDA,0), maintenance=p.maintenance*p.horizon;
 const net=-p.capex+operatingBenefit-maintenance+p.residual;
 const outflows=p.capex+maintenance;
 const stabilisedYear=Math.floor(p.renovationMonths/12)+1+(p.renovationMonths%12>0?1:0);
 return {years,flows,npv:calculateNPV(flows,p.discountRate),irr:calculateIRR(flows),payback:calculatePayback(flows),discountedPayback:calculatePayback(flows.map((v,i)=>v/(1+p.discountRate)**i)),roi:outflows ? net/outflows : null,stabilised:years.find(y=>y.year===stabilisedYear),disruptionLoss:years.reduce((s,y)=>s+y.disruptionLoss,0),waterfall:{capex:-p.capex,operatingBenefit,maintenance:-maintenance,residual:p.residual,net}};
}

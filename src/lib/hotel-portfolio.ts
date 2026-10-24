import { calculateOperatingMetrics, type OperatingAssumptions } from './hotel-model.ts';

export type ProjectStatus = 'Planning' | 'In progress' | 'On hold' | 'Complete';
export type Department = 'Operations' | 'Architecture & Design' | 'Finance / Accounting' | 'Asset Management' | 'Legal' | 'Tax';
export interface PortfolioHotel { id:string; name:string; country:string; city:string; rooms:number; tenure:string; assetManager:string; operating:OperatingAssumptions }
export interface CapexProject { id:string; hotelId:string; category:string; description:string; startDate:string; originalCompletion:string; department:Department; reportingOwner:string }
export interface DepartmentUpdate { department:Department; date:string|null; complete:boolean; outstanding:string }
export interface ProjectSnapshot {
 projectId:string; month:string; approval:'Pending'|'Approved'; status:ProjectStatus;
 originalBudget:number; revisedBudget:number; actual:number; committed:number; uncommitted:number;
 nextMonthForecast:number; expectedCompletion:string; risk:'Low'|'Medium'|'High';
 latestUpdate:string; updates:readonly DepartmentUpdate[]; commentary:string; nextAction:string; deviationReason:string;
}
export interface HotelSnapshot { hotelId:string; month:string; assumptions:OperatingAssumptions; benchmark:Pick<OperatingAssumptions,'occupancy'|'adr'|'margin'> }
export interface PortfolioDataset { hotels:readonly PortfolioHotel[]; projects:readonly CapexProject[]; months:readonly string[]; snapshots:readonly ProjectSnapshot[]; performance:readonly HotelSnapshot[] }
export interface PortfolioFilters { hotelId:string; status:string; category:string; sort:'variance'|'expenditure' }
export const DEFAULT_FILTERS:PortfolioFilters = {hotelId:'all',status:'all',category:'all',sort:'variance'};
export const ratio = (numerator:number,denominator:number):number|null => denominator===0 || !Number.isFinite(numerator/denominator) ? null : numerator/denominator;
export const monthEnd = (month:string) => new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
export const previousMonth = (month:string) => new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-2,1)).toISOString().slice(0,7);
export const dayDifference = (a:string,b:string) => Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
export function expenditureMetrics(s:Pick<ProjectSnapshot,'actual'|'committed'|'uncommitted'|'revisedBudget'>) {
 const etc=s.committed+s.uncommitted,eac=s.actual+etc,variance=eac-s.revisedBudget;
 return {etc,eac,variance,varianceRate:ratio(variance,s.revisedBudget),grossOverspend:Math.max(0,variance)};
}
export function forecastAccuracy(current:ProjectSnapshot,previous:ProjectSnapshot|undefined) {
 if(!previous)return {forecast:null,actual:null,error:null,errorRate:null,absoluteError:null,material:false,reason:'No previous-month snapshot'};
 const forecast=previous.nextMonthForecast,actual=current.actual-previous.actual,error=actual-forecast;
 return {forecast,actual,error,errorRate:ratio(error,forecast),absoluteError:Math.abs(error),material:Math.abs(error)>25000 && (forecast===0||Math.abs(error/forecast)>.2),reason:current.deviationReason};
}
export interface RiskFlag { code:string; detail:string }
export function projectFlags(current:ProjectSnapshot,history:readonly ProjectSnapshot[],project:CapexProject):RiskFlag[] {
 const flags:RiskFlag[]=[],metrics=expenditureMetrics(current);
 const previous=history.find(s=>s.projectId===current.projectId&&s.month===previousMonth(current.month));
 if(metrics.variance>0&&(current.revisedBudget===0||metrics.varianceRate!>.1))flags.push({code:'overspend',detail:current.revisedBudget===0?'Forecast expenditure has no approved budget':`Forecast exceeds revised budget by ${(metrics.varianceRate!*100).toFixed(1)}% (>10%)`});
 if(previous){const increase=metrics.eac-expenditureMetrics(previous).eac;if(increase>100000&&increase>expenditureMetrics(previous).eac*.05)flags.push({code:'cost-increase',detail:`EAC rose GBP ${increase.toFixed(0)} month on month (>GBP 100,000 and >5%)`});}
 const delay=dayDifference(current.expectedCompletion,project.originalCompletion);
 if(current.status!=='Complete'&&delay>30)flags.push({code:'delay',detail:`Expected completion delayed ${delay} days from original plan (>30)`});
 const remainingBudget=current.revisedBudget-current.actual;
 if(current.committed>0&&(remainingBudget<=0||current.committed>remainingBudget*.8))flags.push({code:'commitments',detail:`Unpaid commitments GBP ${current.committed.toFixed(0)} exceed 80% of remaining approved budget GBP ${remainingBudget.toFixed(0)}`});
 const a=forecastAccuracy(current,previous);
 const beforePrevious=previous&&history.find(s=>s.projectId===current.projectId&&s.month===previousMonth(previous.month));
 if(a.material&&previous&&forecastAccuracy(previous,beforePrevious).material)flags.push({code:'forecast-errors',detail:'Two consecutive monthly errors exceed GBP 25,000 and 20% of the prior forecast (zero forecast counts as material)'});
 const missing=current.updates.filter(u=>!u.complete);
 if(missing.length)flags.push({code:'missing-updates',detail:`Missing updates: ${missing.map(u=>u.department).join(', ')}`});
 return flags;
}
export function selectProjects(data:PortfolioDataset,month:string,filters:PortfolioFilters) {
 if(!data.snapshots.some(s=>s.month===month))throw new RangeError('Unknown reporting month');
 return data.snapshots.filter(s=>s.month===month).map(snapshot=>{
  const project=data.projects.find(p=>p.id===snapshot.projectId)!,hotel=data.hotels.find(h=>h.id===project.hotelId)!;
  const previous=data.snapshots.find(s=>s.projectId===snapshot.projectId&&s.month===previousMonth(month));
  // All history used by rules is bounded by the selected reporting month.
  const flags=projectFlags(snapshot,data.snapshots.filter(s=>s.month<=month),project);
  const metrics=expenditureMetrics(snapshot);
  const accuracy=forecastAccuracy(snapshot,previous);
  const progress=ratio(snapshot.actual,metrics.eac);
  return {project,hotel,snapshot,previous,metrics,accuracy,flags,progress,
   risk:flags.length>=2||snapshot.risk==='High'?'High':flags.length?'Medium':snapshot.risk,
   approachingCompletion:snapshot.status!=='Complete'&&progress!==null&&progress>=.9,
   eacChange:previous?metrics.eac-expenditureMetrics(previous).eac:null,
   delayDays:dayDifference(snapshot.expectedCompletion,project.originalCompletion)};
 }).filter(r=>(filters.hotelId==='all'||r.hotel.id===filters.hotelId)&&(filters.status==='all'||r.snapshot.status===filters.status)&&(filters.category==='all'||r.project.category===filters.category))
 .sort((a,b)=>filters.sort==='expenditure'?Math.abs(b.snapshot.actual)-Math.abs(a.snapshot.actual)||a.project.id.localeCompare(b.project.id):b.metrics.variance-a.metrics.variance||a.project.id.localeCompare(b.project.id));
}
export type ProjectReportRow = ReturnType<typeof selectProjects>[number];
export function programmeTotals(rows:readonly ProjectReportRow[]) {
 const sum=(fn:(r:ProjectReportRow)=>number)=>rows.reduce((s,r)=>s+fn(r),0);
 const originalBudget=sum(r=>r.snapshot.originalBudget),revisedBudget=sum(r=>r.snapshot.revisedBudget),actual=sum(r=>r.snapshot.actual),committed=sum(r=>r.snapshot.committed),uncommitted=sum(r=>r.snapshot.uncommitted),eac=sum(r=>r.metrics.eac);
 return {originalBudget,revisedBudget,actual,committed,uncommitted,etc:committed+uncommitted,eac,variance:eac-revisedBudget,varianceRate:ratio(eac-revisedBudget,revisedBudget),grossOverspend:sum(r=>r.metrics.grossOverspend),overBudget:rows.filter(r=>r.metrics.variance>0).length,atRisk:rows.filter(r=>r.flags.length||r.risk==='High').length,projectCount:rows.length};
}
export function accuracyTotals(rows:readonly ProjectReportRow[]) {
 const eligible=rows.filter(r=>r.accuracy.forecast!==null);
 const forecast=eligible.reduce((s,r)=>s+r.accuracy.forecast!,0),actual=eligible.reduce((s,r)=>s+r.accuracy.actual!,0),absolute=eligible.reduce((s,r)=>s+r.accuracy.absoluteError!,0);
 return {forecast,actual,error:actual-forecast,bias:ratio(actual-forecast,forecast),mae:eligible.length?absolute/eligible.length:null,wape:ratio(absolute,actual),count:eligible.length};
}
export function portfolioPerformance(data:PortfolioDataset,month:string,hotelId='all') {
 const properties=data.performance.filter(s=>s.month===month&&(hotelId==='all'||s.hotelId===hotelId)).map(s=>{
  const hotel=data.hotels.find(h=>h.id===s.hotelId)!,metrics=calculateOperatingMetrics(s.assumptions);
  const benchmarkRevpar=s.benchmark.occupancy*s.benchmark.adr;
  const previous=data.performance.find(p=>p.hotelId===s.hotelId&&p.month===previousMonth(month));
  return {hotel,snapshot:s,metrics,benchmarkRevpar,revparIndex:ratio(metrics.revpar*100,benchmarkRevpar),occupancyGap:metrics.occupancy-s.benchmark.occupancy,adrGap:metrics.adr-s.benchmark.adr,revparGap:metrics.revpar-benchmarkRevpar,marginGap:metrics.margin-s.benchmark.margin,marginChange:previous?metrics.margin-previous.assumptions.margin:null};
 });
 const sum=(key:'available'|'occupied'|'roomRevenue'|'totalRevenue'|'ebitda')=>properties.reduce((s,p)=>s+p.metrics[key],0);
 const available=sum('available'),occupied=sum('occupied'),roomRevenue=sum('roomRevenue'),revenue=sum('totalRevenue'),ebitda=sum('ebitda');
 return {properties,aggregate:{rooms:properties.reduce((s,p)=>s+p.hotel.rooms,0),available,occupied,roomRevenue,revenue,ebitda,occupancy:ratio(occupied,available),adr:ratio(roomRevenue,occupied),revpar:ratio(roomRevenue,available),margin:ratio(ebitda,revenue)}};
}
export function buildPortfolioReport(data:PortfolioDataset,month:string,filters:PortfolioFilters) {
 if(!data.months.includes(month))throw new RangeError('Unknown reporting month');
 const rows=selectProjects(data,month,filters),ids=new Set(rows.map(r=>r.project.id));
 const priorRows=data.snapshots.some(s=>s.month===previousMonth(month))?selectProjects(data,previousMonth(month),{...DEFAULT_FILTERS}).filter(r=>ids.has(r.project.id)):[];
 const totals=programmeTotals(rows),prior=programmeTotals(priorRows);
 // Lock the currently selected project IDs through time: status/category filters
 // do not change the historical chart's cohort as projects change status.
 const timeline=data.months.filter(m=>m<=month).map(m=>{
  const historical=selectProjects(data,m,{...DEFAULT_FILTERS}).filter(r=>ids.has(r.project.id));
  return {month:m,cumulativeActual:programmeTotals(historical).actual,...accuracyTotals(historical)};
 });
 return {month,filters:{...filters},rows,totals,prior,accuracy:accuracyTotals(rows),performance:portfolioPerformance(data,month,filters.hotelId),timeline};
}
export type PortfolioReport = ReturnType<typeof buildPortfolioReport>;
export type ExportKind = 'per'|'performance'|'variance';
export function reportExportRows(report:PortfolioReport,kind:ExportKind):(string|number|null)[][] {
 const metadata:(string|number|null)[][]=[['Hypothetical demonstration data; not actual hotel or licensed market data'],['Reporting month',report.month,'Currency','GBP'],['Hotel filter',report.filters.hotelId,'Project status filter',report.filters.status,'Category filter',report.filters.category,'Sort',report.filters.sort]];
 if(kind==='performance')return [...metadata,['Scope','Selected hotels only; project status/category filters do not apply. Monthly operations.'],['Hotel ID','Hotel','Rooms','Available room nights','Occupied room nights','Occupancy decimal','ADR GBP','RevPAR GBP','Total revenue GBP','EBITDA GBP','EBITDA margin decimal','Synthetic occupancy','Synthetic ADR GBP','Synthetic RevPAR GBP','Synthetic EBITDA margin','RevPAR index'],...report.performance.properties.map(p=>[p.hotel.id,p.hotel.name,p.hotel.rooms,p.metrics.available,p.metrics.occupied,p.metrics.occupancy,p.metrics.adr,p.metrics.revpar,p.metrics.totalRevenue,p.metrics.ebitda,p.metrics.margin,p.snapshot.benchmark.occupancy,p.snapshot.benchmark.adr,p.benchmarkRevpar,p.snapshot.benchmark.margin,p.revparIndex]),['TOTAL', 'Selected hotels',report.performance.aggregate.rooms,report.performance.aggregate.available,report.performance.aggregate.occupied,report.performance.aggregate.occupancy,report.performance.aggregate.adr,report.performance.aggregate.revpar,report.performance.aggregate.revenue,report.performance.aggregate.ebitda,report.performance.aggregate.margin]];
 if(kind==='variance')return [...metadata,['Scope','Filtered projects; positive variance = overspend'],['Project ID','Hotel','Project','Original approved GBP','Revised approved GBP','EAC GBP','Variance GBP','Variance decimal','EAC change vs previous month GBP','Delay days','Risk flags'],...report.rows.map(r=>[r.project.id,r.hotel.name,r.project.description,r.snapshot.originalBudget,r.snapshot.revisedBudget,r.metrics.eac,r.metrics.variance,r.metrics.varianceRate,r.eacChange,r.delayDays,r.flags.map(f=>f.detail).join('; ')]),['TOTAL','Filtered selection','',report.totals.originalBudget,report.totals.revisedBudget,report.totals.eac,report.totals.variance,report.totals.varianceRate],['Gross overspend GBP',report.totals.grossOverspend]];
 return [...metadata,['Scope','Filtered projects; ETC includes unpaid commitments and uncommitted remaining forecast'],['Project ID','Hotel','Category','Project','Approval','Original approved GBP','Revised approved GBP','Actual cumulative GBP','Committed unpaid GBP','Uncommitted remaining GBP','ETC GBP','EAC GBP','Variance GBP','Variance decimal','Status','Risk','Start date','Expected completion','Reporting owner'],...report.rows.map(r=>[r.project.id,r.hotel.name,r.project.category,r.project.description,r.snapshot.approval,r.snapshot.originalBudget,r.snapshot.revisedBudget,r.snapshot.actual,r.snapshot.committed,r.snapshot.uncommitted,r.metrics.etc,r.metrics.eac,r.metrics.variance,r.metrics.varianceRate,r.snapshot.status,r.risk,r.project.startDate,r.snapshot.expectedCompletion,r.project.reportingOwner]),['TOTAL','Filtered selection','','','',report.totals.originalBudget,report.totals.revisedBudget,report.totals.actual,report.totals.committed,report.totals.uncommitted,report.totals.etc,report.totals.eac,report.totals.variance,report.totals.varianceRate]];
}
export function encodeCSV(rows:readonly (readonly (string|number|null)[])[]) {
 return '\uFEFF'+rows.map(row=>row.map(value=>{
  let text=value===null?'':String(value);
  if(typeof value==='string'&&/^[=+@\-\t\r]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
 }).join(',')).join('\r\n');
}

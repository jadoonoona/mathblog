import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HOTEL_PORTFOLIO as DATA,createPortfolioDataset} from '../src/data/hotel-portfolio.ts';
import {DEFAULT_FILTERS, expenditureMetrics, programmeTotals, buildPortfolioReport, selectProjects, forecastAccuracy, accuracyTotals, portfolioPerformance, projectFlags, reportExportRows, encodeCSV, previousMonth, type PortfolioDataset, type ProjectSnapshot, type PortfolioFilters} from '../src/lib/hotel-portfolio.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const report=(month='2025-12',filters:PortfolioFilters={...DEFAULT_FILTERS})=>buildPortfolioReport(DATA,month,filters);
function finiteTree(value:unknown){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finiteTree);}
function csvRows(text:string){
 const rows:string[][]=[],row:string[]=[];let cell='',quoted=false;
 for(let i=0;i<text.replace(/^\uFEFF/,'').length;i++){
  const input=text.replace(/^\uFEFF/,''),char=input[i];
  if(char==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(char===','&&!quoted){row.push(cell);cell='';}
  else if(char==='\r'&&input[i+1]==='\n'&&!quoted){row.push(cell);rows.push([...row]);row.length=0;cell='';i++;}
  else cell+=char;
 }
 row.push(cell);rows.push(row);return rows;
}
test('archive has five fictional hotels, fifteen projects and twelve reproducible immutable periods',()=>{
 assert.equal(DATA.hotels.length,5);assert.equal(DATA.projects.length,15);assert.equal(DATA.months.length,12);assert.equal(DATA.snapshots.length,195);
 assert.deepEqual(createPortfolioDataset(),DATA);assert.ok(Object.isFrozen(DATA.snapshots[0]));assert.ok(Object.isFrozen(DATA.snapshots[0].updates));
 assert.throws(()=>createPortfolioDataset(13));
});
test('every EAC, budget and actual ledger respects accounting definitions without adding commitments twice',()=>{
 for(const s of DATA.snapshots){
  const m=expenditureMetrics(s);assert.equal(m.etc,s.committed+s.uncommitted);assert.equal(m.eac,s.actual+s.committed+s.uncommitted);assert.equal(m.variance,m.eac-s.revisedBudget);
  assert.ok(s.actual>=0&&s.committed>=0&&s.uncommitted>=0);if(s.approval==='Pending'){assert.equal(s.originalBudget,0);assert.equal(s.revisedBudget,0);assert.equal(s.actual,0);assert.equal(s.committed,0);}
  const prev=DATA.snapshots.find(p=>p.projectId===s.projectId&&p.month===previousMonth(s.month));if(prev)assert.ok(s.actual>=prev.actual);
  if(s.status==='Complete'){assert.equal(s.committed,0);assert.equal(s.uncommitted,0);assert.equal(s.nextMonthForecast,0);}
 }
 const example=expenditureMetrics({actual:100,committed:20,uncommitted:30,revisedBudget:140});assert.equal(example.eac,150);assert.equal(example.variance,10);
});
test('portfolio and filtered totals reconcile with visible rows for every month',()=>{
 for(const month of DATA.months)for(const filters of [DEFAULT_FILTERS,{...DEFAULT_FILTERS,hotelId:'H2'},{...DEFAULT_FILTERS,status:'Complete'},{...DEFAULT_FILTERS,category:'HVAC upgrades'},{...DEFAULT_FILTERS,hotelId:'H5',status:'On hold'}]){
  const r=report(month,filters),t=r.totals;
  assert.equal(t.projectCount,r.rows.length);
  for(const key of ['actual','committed','uncommitted','originalBudget','revisedBudget'] as const)assert.equal(t[key],r.rows.reduce((sum,row)=>sum+row.snapshot[key],0));
  assert.equal(t.eac,r.rows.reduce((sum,row)=>sum+row.metrics.eac,0));assert.equal(t.variance,t.eac-t.revisedBudget);assert.equal(t.grossOverspend,r.rows.reduce((sum,row)=>sum+Math.max(0,row.metrics.variance),0));
  assert.equal(t.overBudget,r.rows.filter(row=>row.metrics.variance>0).length);finiteTree(r);
 }
});
test('gross overspend does not net underspends and zero-budget percentages are unavailable',()=>{
 const rows=report('2025-09').rows;assert.ok(rows.some(r=>r.metrics.variance<0));const t=programmeTotals(rows);assert.ok(t.grossOverspend>t.variance);
 assert.equal(expenditureMetrics({actual:0,committed:0,uncommitted:100,revisedBudget:0}).varianceRate,null);
 const empty=programmeTotals([]);assert.equal(empty.varianceRate,null);assert.equal(empty.eac,0);
});
test('historical snapshots are prefix-invariant and independent of all later updates',()=>{
 const september=createPortfolioDataset(9);
 assert.deepEqual(september.snapshots,DATA.snapshots.filter(s=>s.month<='2025-09'));assert.deepEqual(september.performance,DATA.performance.filter(s=>s.month<='2025-09'));
 assert.deepEqual(buildPortfolioReport(september,'2025-09',DEFAULT_FILTERS),report('2025-09'));
 const changed=structuredClone(DATA) as PortfolioDataset;
 for(const s of changed.snapshots.filter(s=>s.month>'2025-09')){s.uncommitted+=1e9;s.revisedBudget+=1e9;s.nextMonthForecast+=1e9;s.expectedCompletion='2030-12-31';s.commentary='future mutation';}
 for(const s of changed.performance.filter(s=>s.month>'2025-09'))s.assumptions.adr=9999;
 assert.deepEqual(buildPortfolioReport(changed,'2025-09',DEFAULT_FILTERS),report('2025-09'));
 const p01May=DATA.snapshots.find(s=>s.projectId==='P01'&&s.month==='2025-05')!,p01Apr=DATA.snapshots.find(s=>s.projectId==='P01'&&s.month==='2025-04')!;assert.notEqual(expenditureMetrics(p01May).eac,expenditureMetrics(p01Apr).eac);
});
test('accuracy compares current monthly actual with the forecast stored in the prior snapshot',()=>{
 const current={...DATA.snapshots[0],month:'2025-02',actual:170,revisedBudget:999999},previous={...DATA.snapshots[0],month:'2025-01',actual:100,nextMonthForecast:50};
 const accuracy=forecastAccuracy(current,previous);assert.equal(accuracy.actual,70);assert.equal(accuracy.forecast,50);assert.equal(accuracy.error,20);assert.equal(accuracy.absoluteError,20);assert.equal(accuracy.errorRate,.4);
 assert.equal(forecastAccuracy(current,{...previous,nextMonthForecast:0}).errorRate,null);assert.equal(forecastAccuracy(current,undefined).forecast,null);
 for(const month of DATA.months){const r=report(month);for(const row of r.rows){const prior=DATA.snapshots.find(s=>s.projectId===row.project.id&&s.month===previousMonth(month))!;assert.equal(row.accuracy.actual,row.snapshot.actual-prior.actual);assert.equal(row.accuracy.forecast,prior.nextMonthForecast);}const sumAbsolute=r.rows.reduce((s,row)=>s+row.accuracy.absoluteError!,0);close(r.accuracy.mae!,sumAbsolute/r.rows.length);close(r.accuracy.wape!,sumAbsolute/r.accuracy.actual);close(r.accuracy.bias!,r.accuracy.error/r.accuracy.forecast);}
});
test('January uses December opening forecasts; zero spending produces no NaN or Infinity',()=>{
 const jan=report('2025-01');assert.ok(jan.rows.every(r=>r.previous?.month==='2024-12'));assert.equal(jan.accuracy.count,15);
 const opening=selectProjects(DATA,'2024-12',DEFAULT_FILTERS);const accuracy=accuracyTotals(opening);assert.equal(accuracy.wape,null);assert.equal(accuracy.mae,null);finiteTree(accuracy);
 assert.throws(()=>report('2030-01'));
});
test('portfolio metrics use aggregate room-night denominators rather than unweighted averages',()=>{
 const p=portfolioPerformance(DATA,'2025-09'),a=p.aggregate,rows=p.properties;
 const available=rows.reduce((s,r)=>s+r.metrics.available,0),occupied=rows.reduce((s,r)=>s+r.metrics.occupied,0),revenue=rows.reduce((s,r)=>s+r.metrics.roomRevenue,0);
 close(a.occupancy!,occupied/available);close(a.adr!,revenue/occupied);close(a.revpar!,revenue/available);close(a.margin!,a.ebitda/a.revenue);
 assert.notEqual(a.occupancy,rows.reduce((s,r)=>s+r.metrics.occupancy,0)/rows.length);
 for(const r of rows){close(r.revparIndex!,r.metrics.revpar/r.benchmarkRevpar*100);close(r.revparGap,r.metrics.revpar-r.benchmarkRevpar);assert.equal(r.snapshot.assumptions.days,30);}
 const filtered=report('2025-09',{...DEFAULT_FILTERS,hotelId:'H2',category:'HVAC upgrades',status:'Complete'});assert.equal(filtered.performance.properties.length,1);assert.equal(filtered.performance.properties[0].hotel.id,'H2');
 const zero=structuredClone(DATA);for(const s of zero.performance)s.assumptions.occupancy=0;
 const z=portfolioPerformance(zero,'2025-09');assert.equal(z.aggregate.adr,null);assert.equal(z.aggregate.revpar,0);assert.equal(z.aggregate.margin,null);finiteTree(z);
});
test('month selection updates all report views and keeps historical project cohorts constant',()=>{
 const june=report('2025-06'),dec=report('2025-12');assert.notEqual(june.totals.actual,dec.totals.actual);assert.notEqual(june.accuracy.actual,dec.accuracy.actual);assert.notEqual(june.performance.aggregate.revenue,dec.performance.aggregate.revenue);assert.equal(june.timeline.length,6);assert.equal(dec.timeline.length,12);
 const filtered=report('2025-12',{...DEFAULT_FILTERS,status:'Complete'}),ids=new Set(filtered.rows.map(r=>r.project.id));
 for(const point of filtered.timeline){const historical=selectProjects(DATA,point.month,DEFAULT_FILTERS).filter(r=>ids.has(r.project.id));assert.equal(point.cumulativeActual,programmeTotals(historical).actual);assert.equal(point.forecast,accuracyTotals(historical).forecast);}
 assert.ok(filtered.rows.length>0);
 const byActual=report('2025-12',{...DEFAULT_FILTERS,sort:'expenditure'}).rows;assert.ok(byActual.every((r,i)=>!i||byActual[i-1].snapshot.actual>=r.snapshot.actual));
});
test('risk thresholds, date delays and commitments use only the selected month',()=>{
 const project=DATA.projects[0],template=DATA.snapshots.find(s=>s.projectId===project.id&&s.month==='2025-06')!;
 const prior:ProjectSnapshot={...template,month:'2025-05',actual:0,committed:0,uncommitted:1000000,nextMonthForecast:100000,updates:[]};
 const current:ProjectSnapshot={...template,originalBudget:1000000,revisedBudget:1000000,actual:500000,committed:450000,uncommitted:250000,expectedCompletion:'2025-12-31',updates:[{department:'Tax',date:null,complete:false,outstanding:'Missing tax update'}]};
 const flags=projectFlags(current,[prior],project),codes=flags.map(f=>f.code);assert.ok(codes.includes('overspend'));assert.ok(codes.includes('cost-increase'));assert.ok(codes.includes('delay'));assert.ok(codes.includes('commitments'));assert.ok(codes.includes('missing-updates'));
 const atThreshold={...current,actual:100000,committed:0,uncommitted:1000000,expectedCompletion:project.originalCompletion,updates:[]};assert.ok(!projectFlags(atThreshold,[],project).some(f=>f.code==='overspend'));
 assert.ok(!projectFlags({...current,status:'Complete'},[prior],project).some(f=>f.code==='delay'));
 const before={...prior,month:'2025-04',actual:0,nextMonthForecast:100000};const previous={...prior,actual:200000};
 assert.ok(projectFlags(current,[before,previous],project).some(f=>f.code==='forecast-errors'));
 const row=report('2025-06').rows.find(r=>r.project.id==='P01')!;assert.ok(row.flags.some(f=>f.code==='delay'));assert.ok(!report('2025-05').rows.find(r=>r.project.id==='P01')!.flags.some(f=>f.code==='delay'));
});
test('approaching-completion and risk totals are based on disclosed project rules',()=>{
 let found=false;
 for(const month of DATA.months){const r=report(month);for(const row of r.rows){assert.equal(row.approachingCompletion,row.snapshot.status!=='Complete'&&row.progress!==null&&row.progress>=.9);if(row.approachingCompletion)found=true;}assert.equal(r.totals.atRisk,r.rows.filter(row=>row.flags.length>0||row.risk==='High').length);}
 assert.ok(found);
});
test('exports match selected visible reports at full precision, with dates, units and disclaimer',()=>{
 for(const month of ['2025-01','2025-09','2025-12'])for(const filters of [DEFAULT_FILTERS,{...DEFAULT_FILTERS,hotelId:'H1',category:'Guestroom refurbishment'},{...DEFAULT_FILTERS,status:'Complete'}]){
  const r=report(month,filters);
  for(const kind of ['per','variance','performance'] as const){
   const rows=reportExportRows(r,kind),csv=encodeCSV(rows),parsed=csvRows(csv);assert.match(csv,/Hypothetical demonstration/);assert.match(csv,/GBP/);assert.ok(csv.includes(month));assert.deepEqual(parsed,rows.map(row=>row.map(value=>value===null?'':String(value))));
   const total=rows.find(row=>row[0]==='TOTAL')!;
   if(kind==='per'){assert.equal(total[7],r.totals.actual);assert.equal(total[11],r.totals.eac);assert.equal(rows.filter(row=>/^P\d+$/.test(String(row[0]))).length,r.rows.length);}
   if(kind==='variance'){assert.equal(total[5],r.totals.eac);assert.equal(total[6],r.totals.variance);}
   if(kind==='performance'){assert.equal(total[8],r.performance.aggregate.revenue);assert.equal(total[9],r.performance.aggregate.ebitda);assert.equal(rows.filter(row=>/^H\d+$/.test(String(row[0]))).length,r.performance.properties.length);}
   assert.ok(!csv.includes('NaN'));assert.ok(!csv.includes('Infinity'));
  }
 }
});
test('CSV handles embedded commas, quotes, newlines and spreadsheet formula-like strings',()=>{
 const values=[['a,b','say "hello"','two\nlines',123,-42,null]],csv=encodeCSV(values);assert.deepEqual(csvRows(csv),[['a,b','say "hello"','two\nlines','123','-42','']]);assert.ok(encodeCSV([['=1+1','@SUM(A1)']]).includes("'=1+1"));
});

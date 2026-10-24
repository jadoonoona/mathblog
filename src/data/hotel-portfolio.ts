/** Fixed, fictional reporting archive. No clock, network or random inputs. */
import type { PortfolioDataset, PortfolioHotel, CapexProject, ProjectSnapshot, HotelSnapshot, Department } from '../lib/hotel-portfolio.ts';
import { monthEnd } from '../lib/hotel-portfolio.ts';
const departments:Department[]=['Operations','Architecture & Design','Finance / Accounting','Asset Management','Legal','Tax'];
const places=[['Alder Quay House','Bristol',200],['Cedar Atrium House','Manchester',160],['Juniper Court House','Edinburgh',240],['Rowan Terrace House','Leeds',120],['Willow Exchange House','Birmingham',180]] as const;
const categories=['Guestroom refurbishment','Lobby renovation','Restaurant refurbishment','HVAC upgrades','Energy efficiency','Meeting facilities','Building maintenance','Technology infrastructure','Accessibility improvements'];
const budgets=[4800000,650000,420000,2100000,380000,900000,760000,280000,320000,1650000,540000,240000,1250000,460000,350000];
const duration=[9,7,14,11,6,9,16,7,8,10,13,6,14,8,10];
const iso=(monthIndex:number,day=1)=>new Date(Date.UTC(2025,monthIndex,day)).toISOString().slice(0,10);
const addDays=(date:string,days:number)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
const money=(n:number)=>Math.round(n);
function freezeDeep<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value);}return value;}
/** Building a shorter archive never reads later months; prefix invariance is tested. */
export function createPortfolioDataset(lastMonth=12):PortfolioDataset {
 if(!Number.isInteger(lastMonth)||lastMonth<1||lastMonth>12)throw new RangeError('Reporting archive ends between January and December 2025');
 const hotels:PortfolioHotel[]=places.map(([name,city,rooms],i)=>({id:`H${i+1}`,name,country:'United Kingdom',city,rooms,tenure:i%2?'Illustrative long leasehold':'Illustrative freehold',assetManager:`Demo Asset Manager ${String.fromCharCode(65+i)}`,operating:{rooms,days:365,occupancy:[.72,.76,.69,.81,.74][i],adr:[125,138,155,118,132][i],ancillaryRate:[.25,.28,.3,.2,.26][i],margin:[.28,.30,.26,.32,.29][i]}}));
 const start=(i:number)=>i>=13?i-3:i%4;
 const projects:CapexProject[]=budgets.map((_,i)=>({id:`P${String(i+1).padStart(2,'0')}`,hotelId:hotels[Math.floor(i/3)].id,category:categories[i%categories.length],description:`${categories[i%categories.length]} — ${['east wing','public areas','service areas'][i%3]}`,startDate:iso(start(i)),originalCompletion:iso(start(i)+duration[i],0),department:departments[i%departments.length],reportingOwner:`Demo ${departments[i%departments.length]} Lead ${Math.floor(i/3)+1}`}));
 const months=Array.from({length:lastMonth},(_,i)=>`2025-${String(i+1).padStart(2,'0')}`),snapshots:ProjectSnapshot[]=[],performance:HotelSnapshot[]=[];
 // Opening December snapshot allows January's spending to be compared with a
 // genuine prior-period forecast. Every following snapshot depends only on its
 // seed and the already-created prior snapshot, not an end-of-year outcome.
 for(let m=-1;m<lastMonth;m++){
  const month=m<0?'2024-12':months[m];
  projects.forEach((project,i)=>{
   const prev=snapshots.find(s=>s.projectId===project.id&&s.month===(m===0?'2024-12':months[m-1]));
   const approved=m>=start(i)-1,originalBudget=approved?budgets[i]:0;
   const revisedBudget=originalBudget?(m>=8&&i%4===0?money(originalBudget*1.08):originalBudget):0;
   const delayKnown=m>=5&&i%5===0?45:m>=8&&i%5===2?60:0;
   const expectedCompletion=addDays(project.originalCompletion,delayKnown);
   const endIndex=(Number(expectedCompletion.slice(0,4))-2025)*12+Number(expectedCompletion.slice(5,7))-1;
   const active=approved&&m>=start(i),onHold=active&&((i===6&&m>=6&&m<=7)||(i===13&&m===10));
   const complete=active&&m>=endIndex;
   const status=complete?'Complete':onHold?'On hold':active?'In progress':'Planning';
   // Cost changes and approval changes are independent as-of events.
   const knownCostRate=[.06,-.04,.03,.12,-.06][i%5]+(m>=4&&i%3===0?.13:0)+(m>=9&&i%4===1?.09:0);
   const target=prev?.status==='Complete'?prev.actual:Math.max(prev?.actual??0,money(budgets[i]*(1+knownCostRate)));
   const scheduled=money(budgets[i]/duration[i]);
   const shock=[.72,1.32,.88,1.42,.65,1.1][(Math.max(0,m)+i)%6];
   const monthlyActual=!active||onHold||prev?.status==='Complete'?0:complete?Math.max(0,target-(prev?.actual??0)):Math.min(Math.max(0,target-(prev?.actual??0)),money(scheduled*shock));
   const actual=(prev?.actual??0)+monthlyActual;
   const remaining=Math.max(0,target-actual);
   const committed=!approved||complete?0:money(remaining*(i%3===0?.85:.55));
   const uncommitted=remaining-committed;
   const nextMonthForecast=complete?0:approved&&m+1>=start(i)?Math.min(remaining,money(remaining/Math.max(1,endIndex-m))):m+1===start(i)?scheduled:0;
   const updateDate=monthEnd(month);
   const updates=departments.map((department,j)=>{
    const missing=m>=0&&status!=='Complete'&&(i+m+j)%13===0;
    return {department,date:missing?null:addDays(updateDate,-(j+1)),complete:!missing,outstanding:missing?`${department} cost/schedule confirmation not submitted`:''};
   });
   const previousForecast=prev?.nextMonthForecast??0,error=monthlyActual-previousForecast;
   snapshots.push({projectId:project.id,month,approval:approved?'Approved':'Pending',status,originalBudget,revisedBudget,actual,committed,uncommitted,nextMonthForecast,expectedCompletion,risk:status==='On hold'?'High':i%4===0?'Medium':'Low',latestUpdate:addDays(updateDate,-1),updates,
    commentary:complete?'Works reported complete; final account included in cumulative actual.':onHold?'Works paused for design coordination; unpaid obligations remain.':delayKnown?'Completion forecast revised after contractor sequencing update.':'Cost and delivery position reviewed for this reporting month.',
    nextAction:updates.some(u=>!u.complete)?'Asset Management to obtain missing departmental confirmations.':status==='Complete'?'Finance to retain final account evidence.':onHold?'Architecture & Design to confirm restart sequence.':'Responsible department to validate remaining costs and next-month drawdown.',
    deviationReason:error===0?'Actual drawdown matches the prior monthly forecast.':!active?'No drawdown before the approved work programme starts.':onHold?'Design coordination hold deferred the planned contractor drawdown.':complete?'Final-account settlement changed the monthly drawdown.':error>0?'Contractor milestone certification accelerated expenditure versus the prior drawdown forecast.':'Invoice certification timing deferred expenditure versus the prior drawdown forecast.'});
  });
  hotels.forEach((hotel,i)=>{
   const index=Math.max(0,m),season=[-.04,-.03,-.01,.01,.03,.06,.08,.07,.02,0,-.02,.01][index];
   const assumptions={...hotel.operating,days:Number(monthEnd(month).slice(8,10)),occupancy:hotel.operating.occupancy+season,adr:money(hotel.operating.adr*(1+index*.002)),margin:hotel.operating.margin+(i%2===0?-index*.002:index*.001)};
   performance.push({hotelId:hotel.id,month,assumptions,benchmark:{occupancy:.76+season/2,adr:hotel.operating.adr*1.04,margin:.30}});
  });
 }
 return freezeDeep({hotels,projects,months,snapshots,performance});
}
export const HOTEL_PORTFOLIO=createPortfolioDataset();

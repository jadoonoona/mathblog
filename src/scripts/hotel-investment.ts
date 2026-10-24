import { initScenarios } from './hotel-scenarios';
import { forecastInvestment, DEFAULT_INVESTMENT, type InvestmentAssumptions } from '../lib/hotel-investment';
import type { OperatingAssumptions } from '../lib/hotel-model';
export function initInvestment(root: HTMLElement, operating: () => {current:OperatingAssumptions;projected:OperatingAssumptions;valid:boolean}) {
 const section=root.querySelector<HTMLElement>('[data-investment]')!, form=section.querySelector<HTMLFormElement>('form')!;
 const ko=root.dataset.lang==='ko',t=(en:string,kr:string)=>ko?kr:en;
 const money=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
 const number=(n:number)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(n);
 const pct=(n:number)=>`${number(n*100)}%`;
 const view=section.querySelector<HTMLSelectElement>('select')!;
 const get=(selector:string)=>section.querySelector<HTMLElement>(selector)!;
 const yearLabel=t('Year','연도');
 function readShared(){
  const p={...DEFAULT_INVESTMENT};
  for(const key of Object.keys(p) as (keyof InvestmentAssumptions)[]){const input=form.elements.namedItem(key) as HTMLInputElement;p[key]=input.valueAsNumber/(['discountRate','adrGrowth','costInflation','unavailableRooms','fixedCostShare'].includes(key)?100:1);}
  const op=operating();
  return {settings:{current:op.current,projected:op.projected,investment:p},valid:form.checkValidity()&&op.valid&&p.renovationMonths<=p.horizon*12};
 }
 const updateScenarios=initScenarios(root,readShared);
 function render(){
  const state=readShared(),p=state.settings.investment;
  const op={current:state.settings.current,projected:state.settings.projected};
  for(const input of form.querySelectorAll('input'))input.setAttribute('aria-invalid',String(!input.validity.valid));
  updateScenarios();
  if(!state.valid){get('[data-investment-validation]').textContent=t('Enter valid operating and investment inputs. Renovation must fit within the investment horizon. Results retain the last valid case.','운영 및 투자 가정을 확인하세요. 공사 기간은 투자 기간 이내여야 합니다. 마지막 유효 결과를 유지합니다.');return;}
  get('[data-investment-validation]').textContent='';
  const model=forecastInvestment(op.current,op.projected,p);
  const payback=(n:number|null)=>n===null?t('Not achieved','미회수'):`${number(n)} ${t('years','년')}`;
  const kpis=[
   [t('Initial capex','초기 투자'),money(p.capex),null],
   [t('Stabilised incremental EBITDA','안정화 증분 EBITDA'),model.stabilised?`${money(model.stabilised.incrementalEBITDA)} (${yearLabel} ${model.stabilised.year})`:t('Beyond horizon','투자 기간 이후'),model.stabilised?.incrementalEBITDA],
   [t('Project NPV','프로젝트 NPV'),money(model.npv),model.npv],
   [t('Project IRR','프로젝트 IRR'),model.irr.value===null?(model.irr.status==='ambiguous'?t('Potentially ambiguous','모호 가능성'):t('No solution','해 없음')):pct(model.irr.value),model.irr.value],
   [t('Simple payback','단순 회수 기간'),payback(model.payback),null],
   [t('Discounted payback','할인 회수 기간'),payback(model.discountedPayback),null],
   [t('Investment ROI','투자 ROI'),model.roi===null?'N/A':pct(model.roi),model.roi],
  ];
  get('[data-investment-kpis]').innerHTML=kpis.map(([label,value,sign])=>`<article class="hotel-kpi"><h3>${label}</h3><p class="kpi-value ${typeof sign==='number'?(sign<0?'investment-negative':'investment-positive'):''}">${value}</p><p>${t('Pre-tax · Unlevered','세전 · 무차입')}</p></article>`).join('');
  get('[data-investment-summary]').textContent=`${t('Operating cash flow lost during renovation','공사 중 운영 현금흐름 손실')}: ${money(model.disruptionLoss)}. ${t('Already included in the investment cash flows.','투자 현금흐름에 이미 포함되어 있습니다.')}`;
  const chart=(title:string,body:string)=>`<article class="hotel-chart"><h3>${title}</h3>${body}</article>`;
  const svg=(body:string)=>`<svg viewBox="0 0 600 280" role="img" aria-label="${t('Annual values in GBP, details in forecast table','연간 GBP 값, 상세 내용은 예측 표 참고')}">${body}</svg>`;
  function plot(series:{label:string;values:number[];color:string}[],bars=false,startYear=0){
   const values=series.flatMap(s=>s.values),min=Math.min(0,...values),max=Math.max(0,...values),range=max-min||1;
   const x=(i:number)=>65+i*480/Math.max(1,series[0].values.length-1), y=(v:number)=>230-(v-min)/range*195;
   let body=`<text x="4" y="20">${money(max)}</text><text x="4" y="260">${money(min)}</text><line class="chart-zero" x1="60" x2="560" y1="${y(0)}" y2="${y(0)}"/>`;
   for(const s of series){
    if(!bars)body+=`<polyline fill="none" stroke="${s.color}" stroke-width="3" points="${s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"/>`;
    body+=s.values.map((v,i)=> bars?`<rect tabindex="0" aria-label="${s.label} ${yearLabel} ${i+startYear}: ${money(v)}" x="${x(i)-6}" y="${Math.min(y(0),y(v))}" width="12" height="${Math.max(1,Math.abs(y(v)-y(0)))}" fill="${v<0?'var(--investment-negative)':s.color}"><title>${yearLabel} ${i}: ${money(v)}</title></rect>`:`<circle tabindex="0" aria-label="${s.label} ${yearLabel} ${i}: ${money(v)}" cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}"><title>${s.label} ${yearLabel} ${i}: ${money(v)}</title></circle>`).join('');
   }
   body+=series[0].values.map((_,i)=>i===0||i===series[0].values.length-1||i%5===0?`<text x="${x(i)}" y="278">${i+startYear}</text>`:'').join('');
   return svg(body)+`<p class="chart-legend">${series.map(s=>`<span style="color:${s.color}">● ${s.label}</span>`).join(' · ')} · ${t('Zero line = break-even; x-axis = year','0선 = 손익분기, x축 = 연도')}</p>`;
  }
  const w=model.waterfall;
  const items=[{label:t('Initial capex','초기 투자'),value:w.capex},{label:t('Operating benefit','운영 효익'),value:w.operatingBenefit},{label:t('Maintenance','유지 투자'),value:w.maintenance},{label:t('Residual','잔존 효익'),value:w.residual},{label:t('Net cash flow','순현금흐름'),value:w.net}];
  let running=0;const steps=items.map((item,i)=>{const start=i===4?0:running;const end=i===4?item.value:running+item.value;if(i!==4)running=end;return {...item,start,end};});
  const low=Math.min(0,...steps.flatMap(s=>[s.start,s.end])),high=Math.max(0,...steps.flatMap(s=>[s.start,s.end])),wy=(v:number)=>220-(v-low)/(high-low||1)*180;
  const waterfall=svg(`<line class="chart-zero" x1="10" x2="590" y1="${wy(0)}" y2="${wy(0)}"/>`+steps.map((s,i)=>`<rect tabindex="0" aria-label="${s.label}: ${money(s.value)}" x="${20+i*116}" y="${Math.min(wy(s.start),wy(s.end))}" width="85" height="${Math.max(1,Math.abs(wy(s.start)-wy(s.end)))}" fill="${s.value<0?'var(--investment-negative)':'var(--color-accent)'}"><title>${s.label}: ${money(s.value)}</title></rect><text x="${20+i*116}" y="250">${i+1}</text>`).join(''))+`<ol class="waterfall-key">${items.map(s=>`<li>${s.label}: ${money(s.value)}</li>`).join('')}</ol>`;
  get('[data-investment-charts]').innerHTML=chart(t('Incremental annual cash flow','연간 증분 현금흐름'),plot([{label:t('Incremental FCF','증분 FCF'),values:model.flows,color:'var(--color-accent)'}],true))+chart(t('Cumulative cash flow','누적 현금흐름'),plot([{label:t('Cumulative investment cash flow','누적 투자 현금흐름'),values:[-p.capex,...model.years.map(y=>y.cumulative)],color:'var(--color-accent)'}])+`<p>${t('First break-even','최초 손익분기')}: ${payback(model.payback)}</p>`)+chart(t('Renovation vs no-renovation EBITDA','리노베이션 실시 / 미실시 EBITDA'),plot([{label:t('Without renovation','미실시'),values:model.years.map(y=>y.without.ebitda),color:'var(--color-text-muted)'},{label:t('With renovation','실시'),values:model.years.map(y=>y.withRenovation.ebitda),color:'var(--color-accent)'}],false,1))+chart(t('Cash flow waterfall','현금흐름 워터폴'),waterfall);
  const headings=[t('Year','연도'),t('Available room nights','판매 가능 객실박'),t('Occupancy','점유율'),'ADR','RevPAR',t('Room revenue','객실 매출'),t('Ancillary revenue','부대 매출'),t('Total revenue','총매출'),t('Operating costs','운영 비용'),'EBITDA',t('EBITDA margin','EBITDA 마진'),t('Incremental EBITDA','증분 EBITDA'),t('Renovation capex','공사 투자'),t('Maintenance capex','유지 투자'),t('Residual benefit','잔존 효익'),t('Incremental FCF','증분 FCF'),t('Discount factor','할인 계수'),t('PV of cash flow','현금흐름 현재가치'),t('Cumulative cash flow','누적 현금흐름')];
  const rows=model.years.map(y=>{
   const selected=view.value==='incremental'?Object.fromEntries(Object.keys(y.without).map(k=>[k,y.withRenovation[k as keyof typeof y.without]-y.without[k as keyof typeof y.without]])):y[view.value as 'without'|'withRenovation'];
   const rate=(v:number)=>view.value==='incremental'?`${number(v*100)} pp`:pct(v);
   return [y.year,number(selected.available),rate(selected.occupancy),money(selected.adr),money(selected.revpar),money(selected.roomRevenue),money(selected.ancillaryRevenue),money(selected.totalRevenue),money(selected.costs),money(selected.ebitda),rate(selected.margin),money(y.incrementalEBITDA),money(y.capex),money(-y.maintenance),money(y.residual),money(y.fcf),y.discountFactor.toFixed(4),money(y.pv),money(y.cumulative)];
  });
  rows.unshift([0,...Array(10).fill('—'),money(0),money(-p.capex),money(0),money(0),money(-p.capex),'1.0000',money(-p.capex),money(-p.capex)]);
  get('[data-forecast]').innerHTML=`<table><caption>${view.options[view.selectedIndex].text} · GBP · ${t('Pre-tax, unlevered','세전, 무차입')}</caption><thead><tr>${headings.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((v,i)=>i===0?`<th scope="row">${v}</th>`:`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 }
 form.addEventListener('input',render);form.addEventListener('submit',e=>e.preventDefault());view.addEventListener('change',render);
 get('[data-investment-reset]').addEventListener('click',()=>{form.reset();render();});
 return render;
}

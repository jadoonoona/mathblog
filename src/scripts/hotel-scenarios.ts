import { initInvestmentMemo } from './hotel-memo';
import { compareScenarios, calculateHeatmap, calculateTornado, calculateBreakEvens, DEFAULT_SCENARIOS, SCENARIO_IDS, variableValue, type ModelSettings, type ScenarioId, type ScenarioOverrides, type SensitivityPair, type SensitivityVariable } from '../lib/hotel-scenarios';
import { npvComparisonChart, scenarioLineChart, type ChartSeries } from './scenario-charts';
export function initScenarios(root:HTMLElement,shared:()=>{settings:ModelSettings;valid:boolean}) {
 const section=root.querySelector<HTMLElement>('[data-scenarios]')!;
 const form=section.querySelector<HTMLFormElement>('form')!;
 const reference=section.querySelector<HTMLSelectElement>('[data-scenario-reference]')!;
 const pair=section.querySelector<HTMLSelectElement>('[data-sensitivity-pair]')!;
 const get=(selector:string)=>section.querySelector<HTMLElement>(selector)!;
 const ko=root.dataset.lang==='ko',t=(en:string,kr:string)=>ko?kr:en;
 const number=(n:number)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(n);
 const money=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
 const exactMoney=(n:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:6}).format(n);
 const pct=(n:number)=>`${number(n*100)}%`;
 const names:Record<ScenarioId,string>={downside:t('Downside','하방'),base:t('Base','기준'),upside:t('Upside','상방')};
 const colors:Record<ScenarioId,string>={downside:'var(--investment-negative)',base:'var(--color-accent)',upside:'var(--scenario-upside)'};
 const labels:Record<SensitivityVariable,string>={adr:t('Post-renovation ADR','공사 후 ADR'),occupancy:t('Post-renovation occupancy','공사 후 점유율'),capex:t('Renovation capex','리노베이션 투자비'),discountRate:t('Discount rate','할인율'),costInflation:t('Operating cost inflation','운영 비용 상승률'),renovationMonths:t('Disruption duration','공사 기간'),unavailableRooms:t('Rooms unavailable','사용 불가 객실 비중')};
 const format=(key:SensitivityVariable,n:number)=>key==='adr'||key==='capex'?money(n):key==='renovationMonths'?`${number(n)} ${t('months','개월')}`:pct(n);
 const payback=(n:number|null)=>n===null?t('Not achieved','미회수'):`${number(n)} ${t('years','년')}`;
 function readSource(){
  const state=shared();
  const overrides={} as Record<ScenarioId,ScenarioOverrides>;
  for(const id of SCENARIO_IDS){
   const values={...DEFAULT_SCENARIOS[id]};
   for(const key of Object.keys(values) as (keyof ScenarioOverrides)[]){const input=form.elements.namedItem(`${id}-${key}`) as HTMLInputElement;input.setAttribute('aria-invalid',String(!input.validity.valid));values[key]=input.valueAsNumber/(key==='occupancy'||key==='costInflation'?100:1);}
   overrides[id]=values;
  }
  return {shared:state.settings,scenarios:overrides,valid:state.valid&&form.checkValidity()};
 }
 const updateMemo=initInvestmentMemo(root,readSource);
 function render(){
  const source=readSource();
  const state={settings:source.shared};
  const overrides=source.scenarios;
  const valid=source.valid;
  updateMemo();
  get('[data-scenario-results]').setAttribute('data-stale',String(!valid));
  get('[data-scenario-validation]').textContent=valid?'':t('Correct invalid operating, investment or scenario inputs. All scenario results below retain the last valid calculation and are not current.','유효하지 않은 운영, 투자 또는 시나리오 입력값을 수정하세요. 아래 결과는 마지막 유효 계산이며 현재 입력값을 반영하지 않습니다.');
  if(!valid)return;
  const cases=compareScenarios(state.settings,overrides);
  const active=cases.find(c=>c.id===reference.value)!;
  const settings=active.settings,model=active.result;
  const p=settings.investment;
  const rows:[string,(result:typeof model)=>string][]=[
   [t('Project NPV','프로젝트 NPV'),r=>money(r.npv)],
   [t('Project IRR','프로젝트 IRR'),r=>r.irr.value===null?(r.irr.status==='ambiguous'?t('Potentially ambiguous','모호 가능성'):t('No solution','해 없음')):pct(r.irr.value)],
   [t('Simple payback','단순 회수 기간'),r=>payback(r.payback)],
   [t('Discounted payback','할인 회수 기간'),r=>payback(r.discountedPayback)],
   [t('Investment ROI','투자 ROI'),r=>r.roi===null?'N/A':pct(r.roi)],
   [t('Stabilised incremental EBITDA','안정화 증분 EBITDA'),r=>r.stabilised?`${money(r.stabilised.incrementalEBITDA)} (${t('Year','연도')} ${r.stabilised.year})`:t('Beyond horizon','투자 기간 이후')],
   [t('Cumulative net project cash flow','누적 순투자 현금흐름'),r=>money(r.waterfall.net)],
  ];
  get('[data-scenario-comparison]').innerHTML=`<table><caption>${t('Illustrative scenario outcomes · GBP · Pre-tax, unlevered','가상 시나리오 결과 · GBP · 세전, 무차입')}</caption><thead><tr><th scope="col">${t('Metric','지표')}</th>${cases.map(c=>`<th scope="col" style="color:${colors[c.id]}">${names[c.id]}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn],i)=>`<tr><th scope="row">${label}</th>${cases.map(c=>`<td class="${i===0||i===4||i===6?((i===4&&c.result.roi===null)?'':(i===0?c.result.npv:i===4?c.result.roi!:c.result.waterfall.net)<0?'investment-negative':'investment-positive'):''}">${fn(c.result)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const inherited=state.settings;
  get('[data-scenario-inheritance]').innerHTML=`<p>${t('Baseline','기준 운영')}: ${inherited.current.rooms} ${t('rooms','객실')}, ${inherited.current.days} ${t('days','일')}, ${pct(inherited.current.occupancy)} / ${money(inherited.current.adr)} / ${pct(inherited.current.margin)} ${t('EBITDA margin','EBITDA 마진')}, ${pct(inherited.current.ancillaryRate)} ${t('ancillary ratio','부대 매출 비율')}.</p><p>${t('Shared projected','공통 예상')}: ${pct(inherited.projected.margin)} ${t('EBITDA margin','EBITDA 마진')}, ${pct(inherited.projected.ancillaryRate)} ${t('ancillary ratio','부대 매출 비율')}.</p><p>${t('Investment','투자')}: ${p.horizon} ${t('years','년')}, ${pct(p.discountRate)} ${t('discount rate','할인율')}, ${pct(p.adrGrowth)} ${t('ADR growth','ADR 성장률')}, ${p.renovationMonths} ${t('months renovation','개월 공사')}, ${pct(p.unavailableRooms)} ${t('rooms unavailable','사용 불가 객실')}, ${money(p.maintenance)} ${t('annual maintenance','연간 유지 투자')}, ${money(p.residual)} ${t('residual','잔존 효익')}, ${pct(p.fixedCostShare)} ${t('fixed costs','고정비')}.</p>`;
  const series=(getValues:(result:typeof model)=>number[]):ChartSeries[]=>cases.map(c=>({label:names[c.id],values:getValues(c.result),color:colors[c.id],dash:c.id==='downside'?'6 4':c.id==='upside'?'2 3':undefined}));
  get('[data-scenario-charts]').innerHTML=npvComparisonChart(series(r=>[r.npv]),money,t('Project NPV comparison','프로젝트 NPV 비교'))+scenarioLineChart(t('Annual incremental project cash flows','연간 증분 투자 현금흐름'),series(r=>r.flows),money,t('Year','연도'))+scenarioLineChart(t('Cumulative undiscounted cash flow','누적 비할인 현금흐름'),series(r=>[r.flows[0],...r.years.map(y=>y.cumulative)]),money,t('Year','연도'));
  get('[data-scenario-reference-summary]').textContent=`${names[active.id]} · ${t('Reference NPV','기준 NPV')}: ${money(model.npv)} · ${labels.adr}: ${money(settings.projected.adr)} · ${labels.occupancy}: ${pct(settings.projected.occupancy)} · ${labels.capex}: ${money(p.capex)} · ${labels.costInflation}: ${pct(p.costInflation)} · ${labels.discountRate}: ${pct(p.discountRate)} · ${p.horizon} ${t('years','년')}`;
  const heatmap=calculateHeatmap(settings,pair.value as SensitivityPair);
  const includesReference=heatmap.cells.flat().some(cell=>cell.isReference);
  get('[data-heatmap-reference]').textContent=`${t('Reference coordinates','기준 좌표')}: ${labels[heatmap.x]} ${format(heatmap.x,variableValue(settings,heatmap.x))}; ${labels[heatmap.y]} ${format(heatmap.y,variableValue(settings,heatmap.y))}. ${includesReference?t('Outlined cell = exact reference combination.','테두리 셀 = 정확한 기준 조합.'):t('The exact reference combination is not on this grid; no cell is marked as the reference.','정확한 기준 조합이 격자에 없어 기준 셀을 표시하지 않습니다.')}`;
  get('[data-sensitivity-heatmap]').innerHTML=`<table class="scenario-heatmap"><caption>${names[active.id]} · ${t('NPV in GBP; + positive, − negative','GBP NPV; + 양수, − 음수')}</caption><thead><tr><th scope="col">${labels[heatmap.y]} ↓ / ${labels[heatmap.x]} →</th>${heatmap.xValues.map(x=>`<th scope="col">${format(heatmap.x,x)}</th>`).join('')}</tr></thead><tbody>${heatmap.cells.map((row,i)=>`<tr><th scope="row">${format(heatmap.y,heatmap.yValues[i])}</th>${row.map(cell=>`<td class="${cell.npv<0?'heatmap-negative':'heatmap-positive'} ${cell.isReference?'heatmap-reference':''}" title="${labels[heatmap.x]} ${format(heatmap.x,cell.x)}; ${labels[heatmap.y]} ${format(heatmap.y,cell.y)}; NPV ${exactMoney(cell.npv)}${cell.isReference?' · '+t('Reference','기준'):''}">${cell.npv>0?'+':''}${money(cell.npv)}${cell.isReference?' ★':''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const tornado=calculateTornado(settings),maxImpact=Math.max(1,...tornado.map(row=>row.maxImpact));
  get('[data-scenario-tornado]').innerHTML=`<p>${t('Δ NPV from reference','기준 대비 Δ NPV')}: ${money(model.npv)} · ${t('Low test = solid; high test = striped. Central line = zero impact.','낮은 입력 = 단색, 높은 입력 = 줄무늬. 중앙선 = 영향 0.')}</p>`+tornado.map((row,i)=>{
   const bar=(value:number,high:boolean)=>{const width=Math.abs(value)/maxImpact*50;return `<span class="tornado-bar ${high?'tornado-high':'tornado-low'}" style="left:${value<0?50-width:50}%;width:${width}%;top:${high?18:2}px"></span>`;};
   return `<div class="tornado-row"><div><strong>${i+1}. ${labels[row.key]}</strong><small>${t('Low','낮음')}: ${format(row.key,row.low)} → ${money(row.lowNPV)} (${money(row.lowImpact)} Δ)<br/>${t('High','높음')}: ${format(row.key,row.high)} → ${money(row.highNPV)} (${money(row.highImpact)} Δ)</small></div><div class="scenario-diverging tornado-track" role="img" aria-label="${labels[row.key]}: ${t('low input impact','낮은 입력 영향')} ${money(row.lowImpact)}; ${t('high input impact','높은 입력 영향')} ${money(row.highImpact)}">${bar(row.lowImpact,false)}${bar(row.highImpact,true)}</div></div>`;
  }).join('');
  const roots=calculateBreakEvens(settings);
  get('[data-scenario-breakeven]').innerHTML=roots.map(row=>{
   let value:string,explanation:string;
   if(row.result.status==='found'){
    value=row.key==='occupancy'?`${(row.result.value*100).toFixed(6)}%`:exactMoney(row.result.value);
    explanation=`${t('NPV residual','NPV 잔차')}: ${exactMoney(row.result.npv)}. `+(row.key==='capex'?t('Maximum capex with nonnegative NPV.','NPV가 음수가 아닌 최대 투자비.'):row.direction==='increasing'?t('Minimum input with nonnegative NPV.','NPV가 음수가 아닌 최소 입력값.'):t('NPV decreases with this input under these assumptions; the root is an upper threshold, not a minimum.','이 가정에서는 입력 증가 시 NPV가 감소하므로 이 해는 최소값이 아닌 상한입니다.'));
   }else{
    value=t('No unique break-even','고유 손익분기 없음');
    explanation=row.direction==='flat'?t('NPV is constant across this interval; no unique threshold can be identified.','이 구간에서 NPV가 일정하여 고유 임계값을 찾을 수 없습니다.'):row.lowNPV>0&&row.highNPV>0?t('NPV is positive throughout the bounded interval; there is no zero crossing.','한정 구간 전체에서 NPV가 양수이며 0과 교차하지 않습니다.'):row.lowNPV<0&&row.highNPV<0?t('NPV is negative throughout the bounded interval; no feasible zero crossing was found.','한정 구간 전체에서 NPV가 음수이며 유효한 교차점을 찾지 못했습니다.'):t('Search could not establish a valid solution within tolerance.','허용오차 내의 유효한 해를 확인하지 못했습니다.');
   }
   return `<article class="hotel-kpi"><h4>${row.key==='capex'?t('Maximum renovation capex','최대 리노베이션 투자비'):row.key==='adr'?t('Break-even post-renovation ADR','공사 후 손익분기 ADR'):t('Break-even post-renovation occupancy','공사 후 손익분기 점유율')}</h4><p class="kpi-value">${value}</p><p>${explanation}</p><p>${t('Search interval','탐색 구간')}: ${format(row.key,row.low)} – ${format(row.key,row.high)}</p></article>`;
  }).join('');
  const base=cases.find(c=>c.id==='base')!,downside=cases.find(c=>c.id==='downside')!;
  const positive=heatmap.cells.flat().filter(cell=>cell.npv>=0).length,total=heatmap.cells.flat().length;
  get('[data-scenario-commentary]').innerHTML=`<ul><li>${t('Base scenario','기준 시나리오')}: NPV ${money(base.result.npv)} (${base.result.npv>=0?t('nonnegative','0 이상'):t('negative','음수')}). ${t('This compares incremental operating benefits after maintenance with renovation capex at the selected discount rate.','선택 할인율에서 유지 투자 차감 후 증분 운영 효익과 리노베이션 투자비를 비교합니다.')}</li><li>${t('Downside scenario','하방 시나리오')}: NPV ${money(downside.result.npv)}; ${downside.result.npv>=0?t('nonnegative under the tested downside inputs.','테스트한 하방 가정에서 0 이상입니다.'):t('does not cover the selected discount-rate hurdle under these inputs.','이 가정에서는 선택 할인율 기준을 충족하지 못합니다.')}</li><li>${names[active.id]}: ${t('Largest tested one-way NPV impact','테스트한 단일 변수 중 최대 NPV 영향')} — ${labels[tornado[0].key]}, ${money(tornado[0].maxImpact)}. ${t('Test inputs','테스트 입력')}: ${format(tornado[0].key,tornado[0].low)} – ${format(tornado[0].key,tornado[0].high)}.</li><li>${names[active.id]}: ${positive}/${total} ${t('heatmap combinations have nonnegative NPV within the displayed ranges. This count is a grid result, not a probability of success.','히트맵 조합이 표시 범위에서 NPV 0 이상입니다. 이 비율은 격자 결과이며 성공 확률이 아닙니다.')}</li></ul>`;
 }
 form.addEventListener('input',render);form.addEventListener('submit',e=>e.preventDefault());reference.addEventListener('change',render);pair.addEventListener('change',render);
 get('[data-scenario-reset]').addEventListener('click',()=>{form.reset();render();});
 return render;
}

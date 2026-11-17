import { calculate, percent, type Result, type Sector, type Model } from './brinson.ts';
export type Language = 'ko' | 'en';
export const text = (lang: Language, ko: string, en: string) => lang === 'en' ? en : ko;
export const format = (lang: Language, v: number, effect=false, digits=2) => percent(v,effect,digits).replace('%p',lang==='en'?' pp':'%p');
const esc = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function metrics(r: Result, lang: Language='ko') {
    const t=(ko:string,en:string)=>text(lang,ko,en), p=(v:number,e=false)=>format(lang,v,e);
    return `<dl class="ba-metrics">${([
        [t('포트폴리오 수익률','Portfolio return'),r.portfolio,false],[t('벤치마크 수익률','Benchmark return'),r.benchmark,false],[t('초과수익률','Active return'),r.active,true],
        [t('Allocation · 배분','Allocation'),r.allocation,true],[t('Selection · 선택','Selection'),r.selection,true],[t('Interaction · 상호작용','Interaction'),r.interaction,true],
    ] as const).map(([label,value,effect])=>`<div><dt>${label}</dt><dd>${p(value,effect)}</dd></div>`).join('')}</dl>`;
}
export function interpretation(r: Result,lang: Language='ko') {
    const p=(v:number,e=false)=>format(lang,v,e);
    if(lang==='en') {
        const direction=Math.abs(r.active)<1e-12?'The portfolio matches the benchmark.':`The portfolio ${r.active>0?'outperforms':'underperforms'} the benchmark by ${p(Math.abs(r.active),true).replace('+','')}.`;
        const effect=(v:number)=>Math.abs(v)<1e-12?'has no effect':v>0?'adds to active return':'reduces active return';
        return `${direction} Allocation is ${p(r.allocation,true)} and ${effect(r.allocation)}. Selection is ${p(r.selection,true)} and ${effect(r.selection)}. Interaction is ${p(r.interaction,true)}. These effects describe weight and return differences for this period; they do not establish risk-adjusted investment skill.`;
    }
    const direction = Math.abs(r.active)<1e-12 ? '벤치마크와 같은 수익률입니다.' : `벤치마크보다 ${p(Math.abs(r.active),true).replace('+','')} ${r.active>0?'높습니다':'낮습니다'}.`;
    const explain = (v:number, positive:string,negative:string) => Math.abs(v)<1e-12?'효과가 없습니다':v>0?positive:negative;
    return `${direction} 배분은 ${p(r.allocation,true)}로 ${explain(r.allocation,'초과수익에 보탰습니다','초과수익을 줄였습니다')}. 선택은 ${p(r.selection,true)}로 ${explain(r.selection,'섹터 내 상대수익률이 유리했습니다','섹터 내 상대수익률이 불리했습니다')}. 상호작용은 ${p(r.interaction,true)}입니다. 각 효과는 위험 조정 운용 능력의 증명이 아니라, 이 기간의 비중과 수익률 차이를 분해한 값입니다.`;
}
export function sectorTable(r: Result,lang: Language='ko') {
    const t=(ko:string,en:string)=>text(lang,ko,en),p=(v:number)=>format(lang,v,true);
    return `<div class="ba-scroll" tabindex="0" role="region" aria-label="${t('섹터별 기여도와 성과 요인 표','Sector contributions and attribution table')}"><table><caption>${t('섹터별 결과','Sector results')} · ${r.model} · ${t('모든 효과와 기여도의 단위는 %p','All effects and contributions in percentage points (pp)')}</caption><thead><tr>${[t('섹터','Sector'),t('포트폴리오 기여도','Portfolio contribution'),t('벤치마크 기여도','Benchmark contribution'),'Allocation','Selection','Interaction',t('효과 합계','Total effect')].map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${r.sectors.map(s=>`<tr><th scope="row">${esc(s.name)}</th>${[s.contribution,s.benchmarkContribution,s.allocation,s.selection,s.interaction,s.total].map(v=>`<td>${p(v)}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><th scope="row">${t('합계','Total')}</th>${[r.portfolio,r.benchmark,r.allocation,r.selection,r.interaction,r.active].map(v=>`<td>${p(v)}</td>`).join('')}</tr></tfoot></table></div>`;
}
export function waterfallSteps(r: Result,lang: Language='ko') {
    const labels=lang==='en'?['Benchmark','Allocation','Selection','Interaction','Portfolio']:['벤치마크','배분','선택','상호작용','포트폴리오'];
    let level=r.benchmark;
    return [{label:labels[0],start:0,end:r.benchmark,value:r.benchmark,effect:false},...(['allocation','selection','interaction'] as const).map((key,i)=>{
        const start=level;level+=r[key];return {label:labels[i+1],start,end:level,value:r[key],effect:true};
    }),{label:labels[4],start:0,end:r.portfolio,value:r.portfolio,effect:false}];
}
export function waterfall(r: Result,lang: Language='ko') {
    const t=(ko:string,en:string)=>text(lang,ko,en),p=(v:number,e=false)=>format(lang,v,e);
    const steps=waterfallSteps(r,lang),values=steps.flatMap(s=>[s.start,s.end]);
    const min=Math.min(0,...values),max=Math.max(0,...values),pad=Math.max((max-min)*.22,.01);
    const lo=min-pad,hi=max+pad,y=(v:number)=>238-(v-lo)/(hi-lo)*190;
    const desc=steps.map(s=>`${s.label} ${p(s.value,s.effect)}`).join(' → ');
    return `<figure class="ba-waterfall"><svg viewBox="0 0 720 300" role="img" aria-label="${esc(desc)}"><text x="8" y="24">${t('수익률 수준 (%) · 변화량 (%p)','Return level (%) · changes (pp)')}</text>${[lo,0,hi].map(v=>`<line class="ba-grid" x1="72" x2="710" y1="${y(v)}" y2="${y(v)}"/><text x="4" y="${y(v)+4}">${p(v)}</text>`).join('')}${steps.map((s,i)=>{
        const x=100+i*124,top=y(Math.max(s.start,s.end)),height=Math.max(2,Math.abs(y(s.start)-y(s.end)));
        return `<rect x="${x}" y="${top}" width="82" height="${height}" class="${!s.effect?'ba-total':s.value<0?'ba-negative':'ba-positive'}"/><text text-anchor="middle" x="${x+41}" y="${top-9}">${p(s.value,s.effect)}</text><text text-anchor="middle" x="${x+41}" y="280">${s.label}</text>${i<4?`<line class="ba-connector" x1="${x+82}" x2="${x+124}" y1="${y(s.end)}" y2="${y(s.end)}"/>`:''}`;
    }).join('')}</svg><figcaption>${esc(desc)}. ${t('막대의 높이는 수익률 수준이며, 중간 막대는 직전 수준에서 더하거나 빼는 효과입니다.','Bars show return levels. Each intermediate bar adds to or subtracts from the previous level.')}</figcaption></figure><details><summary>${t('워터폴 수치 표 보기','View waterfall data')}</summary><div class="ba-scroll" tabindex="0"><table><caption>${t('워터폴 경로 · 반올림은 표시 단계에만 적용','Waterfall path · rounding for display only')}</caption><thead><tr>${[t('단계','Step'),t('수익률 또는 효과','Return or effect'),t('도달한 수익률','Resulting return')].map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${steps.map(s=>`<tr><th scope="row">${s.label}</th><td>${p(s.value,s.effect)}</td><td>${p(s.end)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
export function microscope(r: Result,index: number,lang: Language='ko') {
    const t=(ko:string,en:string)=>text(lang,ko,en),p=(v:number,e=false,d=2)=>format(lang,v,e,d);
    const s=r.sectors[index],dec=(v:number)=>v.toFixed(6),weight=s.wp-s.wb,spread=s.rp-s.rb;
    const reference=r.model==='BF'?s.rb-r.benchmark:s.rb;
    return `<p>${esc(s.name)} · wP=${dec(s.wp)}, wB=${dec(s.wb)}, rP=${dec(s.rp)}, rB=${dec(s.rb)}${r.model==='BF'?`, RB=${dec(r.benchmark)}`:''}. ${t('아래 대입값은 읽기 위해 소수 6자리로 표시하며 계산에는 원래 정밀도를 사용합니다.','Substituted values are shown to six decimal places for readability; calculations retain full precision.')}</p>${[
        {name:t('Allocation · 배분','Allocation'),formula:r.model==='BF'?'(wPᵢ − wBᵢ) × (rBᵢ − RB)':'(wPᵢ − wBᵢ) × rBᵢ',numeric:`(${dec(s.wp)} − ${dec(s.wb)}) × ${r.model==='BF'?`(${dec(s.rb)} − ${dec(r.benchmark)})`:dec(s.rb)}`,value:s.allocation,meaning:t(`비중 차이 ${p(weight,true)}를 ${r.model==='BF'?'전체 벤치마크 대비 섹터 수익률':'벤치마크 섹터 수익률'} ${p(reference)}로 평가합니다. 두 값의 부호가 같으면 양의 효과, 다르면 음의 효과입니다.`,`Evaluate the weight difference of ${p(weight,true)} against ${r.model==='BF'?'the sector benchmark return minus the total benchmark return':'the sector benchmark return'} (${p(reference)}). Matching signs produce a positive effect; opposite signs produce a negative effect.`)},
        {name:t('Selection · 선택','Selection'),formula:'wBᵢ × (rPᵢ − rBᵢ)',numeric:`${dec(s.wb)} × (${dec(s.rp)} − ${dec(s.rb)})`,value:s.selection,meaning:t(`벤치마크 비중 ${p(s.wb)}에 섹터 내 상대수익률 ${p(spread,true)}를 적용합니다. 실제 포트폴리오 비중으로 계산한 기여도와는 다릅니다.`,`Apply the within-sector return difference of ${p(spread,true)} to the benchmark weight of ${p(s.wb)}. This differs from contribution calculated using the actual portfolio weight.`)},
        {name:t('Interaction · 상호작용','Interaction'),formula:'(wPᵢ − wBᵢ) × (rPᵢ − rBᵢ)',numeric:`(${dec(s.wp)} − ${dec(s.wb)}) × (${dec(s.rp)} − ${dec(s.rb)})`,value:s.interaction,meaning:t('비중 차이와 섹터 내 상대수익률의 교차항입니다. 둘 다 음수여도 양수가 될 수 있으므로, 양수 자체를 좋은 종목 선택으로 해석하면 안 됩니다.','This is the cross-product of the weight difference and the within-sector return difference. Two negative differences also produce a positive effect, so a positive interaction does not by itself indicate good security selection.')},
    ].map(e=>`<article class="ba-formula"><h4>${e.name}</h4><p><code>${e.formula}</code></p><p><code>${e.numeric} = ${dec(e.value)}</code> → <strong>${p(e.value,true,4)}</strong></p><p>${e.meaning}</p></article>`).join('')}`;
}
export function comparison(rows: readonly Sector[],model: Model,lang: Language='ko') {
    const t=(ko:string,en:string)=>text(lang,ko,en),p=(v:number)=>format(lang,v,true,4);
    const a=calculate(rows,'BHB'),b=calculate(rows,'BF');
    return `<p>${t('현재 모형','Current model')}: <strong>${model}</strong>. ${t('두 모형은 배분 효과를 섹터에 나누는 기준만 다릅니다. BHB는 섹터 벤치마크 수익률, BF는 전체 벤치마크 수익률 대비 상대 수준을 사용합니다.','Only the sector-level allocation reference changes: BHB uses the sector benchmark return; BF uses its difference from the total benchmark return.')}</p><div class="ba-scroll" tabindex="0"><table><caption>${t('섹터별 Allocation 비교 (%p)','Sector allocation comparison (pp)')}</caption><thead><tr><th scope="col">${t('섹터','Sector')}</th><th scope="col">BHB</th><th scope="col">BF</th><th scope="col">BF − BHB</th></tr></thead><tbody>${a.sectors.map((s,i)=>`<tr><th scope="row">${esc(s.name)}</th><td>${p(s.allocation)}</td><td>${p(b.sectors[i].allocation)}</td><td>${p(b.sectors[i].allocation-s.allocation)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">${t('합계','Total')}</th><td>${p(a.allocation)}</td><td>${p(b.allocation)}</td><td>${p(b.allocation-a.allocation)}</td></tr></tfoot></table></div><p>${t('검산: BHB 초과수익','Check: BHB active return')} ${p(a.active)} = ${t('BF 초과수익','BF active return')} ${p(b.active)}. ${t('배분 합계 차이의 절댓값','Absolute difference in total allocation')}: ${Math.abs(a.allocation-b.allocation).toExponential(2)} ${t('(소수 단위)','(decimal units)')}.</p>`;
}
export function preview(r: Result,lang: Language='ko') {
    const p=(v:number,e=false)=>format(lang,v,e,6);
    return `${text(lang,'모형','Model')}: ${r.model}\nRP: ${p(r.portfolio)}\nRB: ${p(r.benchmark)}\nActive: ${p(r.active,true)}\nAllocation: ${p(r.allocation,true)}\nSelection: ${p(r.selection,true)}\nInteraction: ${p(r.interaction,true)}\nResidual (decimal): ${r.residual.toExponential(6)}`;
}

/** Presentation only: accepts computed values and performs no valuation. */
export interface ChartSeries {label:string;values:number[];color:string;dash?:string}
const escape = (value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function scenarioLineChart(title:string,series:ChartSeries[],money:(n:number)=>string,yearLabel:string) {
 const all=series.flatMap(s=>s.values),min=Math.min(0,...all),max=Math.max(0,...all),range=max-min||1;
 const x=(i:number)=>70+i*480/Math.max(1,series[0].values.length-1),y=(v:number)=>225-(v-min)/range*185;
 const svg=`<svg viewBox="0 0 600 280" role="img" aria-label="${escape(title)}"><text x="6" y="20">${money(max)}</text><text x="6" y="250">${money(min)}</text><line class="chart-zero" x1="65" x2="565" y1="${y(0)}" y2="${y(0)}"/>${series.map(s=>`<polyline fill="none" stroke="${s.color}" stroke-dasharray="${s.dash??''}" stroke-width="2.5" points="${s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"/>${s.values.map((v,i)=>`<circle tabindex="0" role="img" aria-label="${escape(s.label)} ${escape(yearLabel)} ${i}: ${money(v)}" cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}"><title>${escape(s.label)} · ${escape(yearLabel)} ${i}: ${money(v)}</title></circle>`).join('')}`).join('')}${series[0].values.map((_,i)=>i===0||i===series[0].values.length-1||i%5===0?`<text x="${x(i)}" y="275">${i}</text>`:'').join('')}</svg>`;
 return `<article class="hotel-chart"><h4>${escape(title)}</h4>${svg}<p class="chart-legend">${series.map(s=>`<span style="color:${s.color}">● ${escape(s.label)}</span>`).join(' · ')} · ${escape(yearLabel)}</p><details><summary>${escape(title)} · GBP</summary><div class="forecast-scroll" tabindex="0"><table><thead><tr><th scope="col">${escape(yearLabel)}</th>${series.map(s=>`<th scope="col">${escape(s.label)}</th>`).join('')}</tr></thead><tbody>${series[0].values.map((_,i)=>`<tr><th scope="row">${i}</th>${series.map(s=>`<td>${money(s.values[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></article>`;
}
export function npvComparisonChart(series:ChartSeries[],money:(n:number)=>string,title:string) {
 const max=Math.max(1,...series.map(s=>Math.abs(s.values[0])));
 return `<article class="hotel-chart"><h4>${escape(title)}</h4>${series.map(s=>{
 const value=s.values[0],width=Math.abs(value)/max*50;
 return `<div class="scenario-npv-row"><span style="color:${s.color}">${escape(s.label)}</span><div class="scenario-diverging"><span class="scenario-npv-bar" style="left:${value<0?50-width:50}%;width:${width}%;background:${s.color}"></span></div><strong class="${value<0?'investment-negative':'investment-positive'}">${money(value)}</strong></div>`;
 }).join('')}<p class="chart-legend">GBP · 0</p></article>`;
}

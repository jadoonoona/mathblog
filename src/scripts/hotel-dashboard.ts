import { initInvestment } from './hotel-investment';
import { calculateOperatingMetrics, calculateChange, DEFAULT_CURRENT, DEFAULT_PROJECTED, type OperatingAssumptions } from '../lib/hotel-model';
const root = document.querySelector<HTMLElement>('[data-hotel]');
if (root) {
 const ko = root.dataset.lang === 'ko';
 const t = (en: string, kr: string) => ko ? kr : en;
 const form = root.querySelector<HTMLFormElement>('[data-assumptions]')!;
 const updateInvestment = initInvestment(root, () => ({ current: read('current'), projected: read('projected'), valid: form.checkValidity() }));
 const currency = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);
 const num = (n: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(n);
 const percent = (n: number) => `${num(n * 100)}%`;
 const currentLabel = t('Current','현재'), projectedLabel = t('Projected','예상');
 const labels = {occupancy:t('Occupancy','점유율'),adr:'ADR',revpar:'RevPAR',roomRevenue:t('Room revenue','객실 매출'),totalRevenue:t('Total revenue','총매출'),ebitda:'EBITDA',margin:t('EBITDA margin','EBITDA 마진')};
 function read(scenario: string): OperatingAssumptions {
  const result = { ...DEFAULT_CURRENT };
  for (const key of Object.keys(result) as (keyof OperatingAssumptions)[]) {
   const shared = key === 'rooms' || key === 'days';
   const input = form.elements.namedItem(`${shared ? 'current' : scenario}-${key}`) as HTMLInputElement;
   result[key] = input.valueAsNumber / (['occupancy','margin','ancillaryRate'].includes(key) ? 100 : 1);
  }
  return result;
 }
 function render() {
  const inputs = Array.from(form.querySelectorAll('input'));
  const invalid = inputs.filter(input => !input.validity.valid);
  inputs.forEach(input => input.setAttribute('aria-invalid', String(!input.validity.valid)));
  root!.querySelector('[data-validation]')!.textContent = invalid.length ? t('Enter valid values within the displayed ranges. Results retain the last valid scenario.','표시 범위 내의 유효한 값을 입력하세요. 결과는 마지막 유효 시나리오를 유지합니다.') : '';
  updateInvestment();
  if (invalid.length) return;
  const a = calculateOperatingMetrics(read('current')), b = calculateOperatingMetrics(read('projected'));
  root!.querySelector('[data-kpis]')!.innerHTML = Object.entries(labels).map(([key,label]) => {
   const k = key as keyof typeof labels, isRate = k === 'occupancy' || k === 'margin';
   const format = isRate ? percent : currency;
   const delta = calculateChange(a[k],b[k]);
   const sign = delta.absolute > 0 ? '+' : '';
   const change = isRate ? `${sign}${num(delta.absolute * 100)} pp` : `${sign}${currency(delta.absolute)}`;
   return `<article class="hotel-kpi"><h3>${label}</h3><p class="kpi-value">${format(b[k])}</p><p>${currentLabel}: ${format(a[k])} → ${projectedLabel}: ${format(b[k])}</p><p class="kpi-change">${change} · ${delta.percentage === null ? 'N/A' : `${delta.percentage > 0 ? '+' : ''}${num(delta.percentage)}%`} ${t('relative','상대 변화')}</p></article>`;
  }).join('');
  root!.querySelector('[data-nights]')!.textContent = `${t('Available room nights','판매 가능 객실박')}: ${num(a.available)} · ${t('Occupied room nights','판매 객실박')}: ${num(a.occupied)} → ${num(b.occupied)}`;
  const bar = (label: string, value: number, max: number, format: (n: number) => string, projected = false) => `<div class="chart-row"><span>${label}</span><div class="chart-track"><div tabindex="0" role="img" aria-label="${label}: ${format(value)}" class="chart-bar ${projected ? 'projected' : ''}" style="width:${max > 0 ? value / max * 100 : 0}%"><span class="chart-tooltip">${label}: ${format(value)}</span></div></div><strong>${format(value)}</strong></div>`;
  const comparison = (title: string, x: number, y: number, format: (n: number) => string, max = Math.max(x,y)) => `<div class="chart-comparison"><h4>${title}</h4>${bar(currentLabel,x,max,format)}${bar(projectedLabel,y,max,format,true)}</div>`;
  root!.querySelector('[data-charts]')!.innerHTML = `<article class="hotel-chart"><h3>${labels.roomRevenue}</h3>${comparison(t('Annual GBP','연간 GBP'),a.roomRevenue,b.roomRevenue,currency)}</article><article class="hotel-chart"><h3>EBITDA</h3>${comparison(t('Annual GBP','연간 GBP'),a.ebitda,b.ebitda,currency)}</article><article class="hotel-chart"><h3>${t('ADR & occupancy','ADR 및 점유율')}</h3>${comparison('ADR (£)',a.adr,b.adr,currency)}${comparison(labels.occupancy,a.occupancy,b.occupancy,percent,1)}</article><article class="hotel-chart"><h3>${t('Revenue composition','매출 구성')}</h3>${[a,b].map((m,i) => `<h4>${i ? projectedLabel : currentLabel}</h4>${bar(labels.roomRevenue,m.roomRevenue,Math.max(a.totalRevenue,b.totalRevenue),currency,!!i)}${bar(t('Ancillary','부대 매출'),m.ancillaryRevenue,Math.max(a.totalRevenue,b.totalRevenue),currency,!!i)}`).join('')}</article>`;
 }
 form.addEventListener('input', render);
 form.addEventListener('submit', event => event.preventDefault());
 root.querySelector('[data-reset]')!.addEventListener('click', () => { form.reset(); render(); });
 render();
}

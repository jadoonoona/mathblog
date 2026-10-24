import { generateInvestmentMemo, memoFinancialRows, isMemoCurrent, assertMemoExportable, EVIDENCE_ITEMS, type MemoSource, type MemoInput, type MemoConfig, type InvestmentMemo } from '../lib/hotel-memo';
import { encodeCSV } from '../lib/hotel-portfolio';
import { renderInvestmentMemo } from './memo-renderer';
export function initInvestmentMemo(root:HTMLElement,source:()=>MemoSource&{valid:boolean}) {
 const section=root.querySelector<HTMLElement>('[data-ic]')!,form=section.querySelector<HTMLFormElement>('form')!;
 const ko=root.dataset.lang==='ko',t=(en:string,kr:string)=>ko?kr:en;
 const get=(selector:string)=>section.querySelector<HTMLElement>(selector)!;
 const field=(name:string)=>form.elements.namedItem(name) as HTMLInputElement;
 const date=field('analysisDate');
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 date.value=date.defaultValue=['year','month','day'].map(key=>parts.find(p=>p.type===key)!.value).join('-');
 let memo:InvestmentMemo|null=null;
 const portfolioURL=`${import.meta.env.BASE_URL}${ko?'ko/':''}projects/hotel-asset-management/portfolio/`;
 function read():MemoInput {
  const state=source();if(!state.valid||!form.checkValidity())throw new Error(t('Correct invalid operating, investment, scenario or memo inputs.','유효하지 않은 운영, 투자, 시나리오 또는 메모 입력을 수정하세요.'));
  const config:MemoConfig={caseId:field('caseId').value as MemoConfig['caseId'],analysisDate:date.value,policy:{minIRR:field('minIRR').valueAsNumber/100,minNPV:field('minNPV').valueAsNumber,maxPayback:field('maxPayback').valueAsNumber,maxCapex:field('maxCapex').valueAsNumber,allowNegativeDownside:field('allowNegativeDownside').checked,materialFlagsBlock:field('materialFlagsBlock').checked},evidence:EVIDENCE_ITEMS.map(item=>({id:item.id,status:field(`evidence-${item.id}`).value as MemoConfig['evidence'][number]['status'],reference:field(`reference-${item.id}`).value})),riskState:field('riskState').value as MemoConfig['riskState'],riskReference:field('riskReference').value,analystComments:field('analystComments').value,additionalConditions:field('additionalConditions').value.split('\n').map(v=>v.trim()).filter(Boolean),charts:{npv:field('chart-npv').checked,cashFlow:field('chart-cashFlow').checked,cumulative:field('chart-cumulative').checked}};
  return {shared:state.shared,scenarios:state.scenarios,config};
 }
 function setStale(stale:boolean,message:string){
  section.dataset.icStale=String(stale);get('[data-ic-status]').textContent=message;
  for(const selector of ['[data-ic-print]','[data-ic-csv]'])(get(selector) as HTMLButtonElement).disabled=stale||!memo;
 }
 function checkCurrent(){
  try{const input=read();if(!memo)return false;const current=isMemoCurrent(memo,input);setStale(!current,current?t(`Current memo · ${memo.version} · ${memo.input.config.analysisDate}`,`현재 메모 · ${memo.version} · ${memo.input.config.analysisDate}`):t('Memo is stale. Inputs changed; regenerate before printing or exporting.','메모가 오래되었습니다. 입력이 변경되어 인쇄 또는 내보내기 전에 재생성해야 합니다.'));return current;}
  catch(error){setStale(true,`${t('Memo requires update.','메모 업데이트가 필요합니다.')} ${(error as Error).message}`);return false;}
 }
 function generate(){
  for(const input of form.querySelectorAll('input, textarea'))input.setAttribute('aria-invalid',String(!(input as HTMLInputElement).validity.valid));
  try{memo=generateInvestmentMemo(read());get('[data-ic-output]').innerHTML=renderInvestmentMemo(memo,portfolioURL);checkCurrent();}
  catch(error){setStale(true,(error as Error).message);}
 }
 form.addEventListener('submit',event=>{event.preventDefault();generate();});
 form.addEventListener('input',checkCurrent);form.addEventListener('change',checkCurrent);
 get('[data-ic-reset]').addEventListener('click',()=>{form.reset();generate();});
 get('[data-ic-print]').addEventListener('click',()=>{if(checkCurrent()&&memo){assertMemoExportable(memo,read());window.print();}});
 get('[data-ic-csv]').addEventListener('click',()=>{
  if(!checkCurrent()||!memo)return;
  assertMemoExportable(memo,read());
  const blob=new Blob([encodeCSV(memoFinancialRows(memo))],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`hypothetical-ic-${memo.selected.id}-${memo.input.config.analysisDate}-${memo.version}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 window.addEventListener('beforeprint',checkCurrent);
 return ()=>{if(!memo)generate();else checkCurrent();};
}

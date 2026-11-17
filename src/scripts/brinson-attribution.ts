import { calculate, scenario, rebalance, sum, pythonCode, csv, type Sector, type Model, type Scenario } from '../lib/brinson';
import { metrics, interpretation, sectorTable, waterfall, microscope, comparison, preview, text, format, type Language } from '../lib/brinson-view';
const root = document.querySelector<HTMLElement>('[data-brinson]');
if (root) {
    const lang: Language = root.dataset.lang === 'en' ? 'en' : 'ko';
    const t = (ko: string, en: string) => text(lang, ko, en);
    const percent = (v: number, e=false, d=2) => format(lang,v,e,d);
    const el = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const inputs = [...root.querySelectorAll<HTMLInputElement>('input[data-field]')];
    const exports = [...root.querySelectorAll<HTMLButtonElement>('.ba-export-actions button')];
    const modelInput = el<HTMLSelectElement>('#ba-model');
    const sectorInput = el<HTMLSelectElement>('#ba-sector');
    let rows: Sector[] = scenario('original');
    let valid = true;
    let code = '';
    const notes: Record<Scenario,string> = {
        original: t('원문 예제: 초기 비중과 섹터 수익률을 사용합니다.', 'Original example: use the original weights and sector returns.'),
        allocation: t('배분만 다르게: 초기 비중을 유지하고 모든 rP를 초기 rB와 같게 설정했습니다. Selection과 Interaction은 0입니다.', 'Allocation only: keep original weights and set every rP equal to the original rB. Selection and interaction are zero.'),
        selection: t('선택만 다르게: 모든 wP를 초기 wB와 같게 설정하고 초기 섹터 수익률을 유지했습니다. Allocation과 Interaction은 0입니다.', 'Selection only: set every wP equal to the original wB and retain original sector returns. Allocation and interaction are zero.'),
        identical: t('벤치마크와 동일: 초기 벤치마크의 비중과 수익률을 양쪽에 적용했습니다. 세 효과는 모두 0입니다.', 'Match benchmark: apply original benchmark weights and returns to both portfolios. All three effects are zero.'),
    };
    function syncWeights() {
        rows.forEach((s,i)=>{
            const input=el<HTMLInputElement>(`input[data-index="${i}"][data-field="wp"]`);
            input.value=String(s.wp);
            input.setAttribute('aria-valuetext',percent(s.wp/100));
            el<HTMLOutputElement>(`[data-weight="${i}"]`).value=percent(s.wp/100);
        });
        el('[data-weight-sum]').textContent=`${t('포트폴리오 비중 합계','Portfolio weight total')} ${percent(sum(rows.map(s=>s.wp))/100)} · ${t('벤치마크 비중 합계','Benchmark weight total')} ${percent(sum(rows.map(s=>s.wb))/100)}`;
    }
    function render() {
        const errors: string[]=[];
        for(const input of inputs.filter(input=>input.dataset.field!=='wp')) {
            const index=Number(input.dataset.index),field=input.dataset.field as 'rp'|'rb';
            const number=input.value.trim()==='' ? NaN : Number(input.value);
            const error= !Number.isFinite(number) ? t('수익률을 숫자로 입력해 주세요.', 'Enter a numeric return.') : number < -100 || number > 1000 ? t('−100%~1,000% 사이로 입력해 주세요.', 'Enter a return between −100% and 1,000%.') : '';
            rows[index][field]=number;
            input.setAttribute('aria-invalid',String(Boolean(error)));
            el(`[data-error="${index}-${field}"]`).textContent=error;
            if(error) errors.push(`${rows[index].name} ${field==='rp'?t('포트폴리오','portfolio'):t('벤치마크','benchmark')}: ${error}`);
        }
        valid=errors.length===0;
        el('[data-live-results]').hidden=!valid;
        el('[data-valid-output]').hidden=!valid;
        exports.forEach(button=>button.disabled=!valid);
        el('[data-export-status]').textContent='';
        el('[data-input-status]').textContent=valid?'':`${t('입력을 확인해 주세요. 결과와 내보내기를 중지했습니다.', 'Check your inputs. Results and exports are paused.')} ${errors.join(' ')}`;
        if(!valid) return;
        const model=modelInput.value as Model;
        const r=calculate(rows,model);
        el('[data-metrics]').innerHTML=metrics(r,lang);
        el('[data-interpretation]').textContent=interpretation(r,lang);
        const reconciles=Math.abs(r.residual)<=1e-10;
        el('[data-check]').textContent=`${t('검산','Reconciliation')} ${reconciles?t('통과','passed'):t('실패','failed')}: ${percent(r.allocation,true,4)} + ${percent(r.selection,true,4)} + ${percent(r.interaction,true,4)} = ${percent(r.attributed,true,4)}; ${t('초과수익','active return')} ${percent(r.active,true,4)}. ${t('잔차','Residual')} ${r.residual.toExponential(3)} ${t('(소수 단위), 허용 오차 10⁻¹⁰.', '(decimal units), tolerance 10⁻¹⁰.')}`;
        el('[data-waterfall]').innerHTML=waterfall(r,lang);
        el('[data-sectors]').innerHTML=sectorTable(r,lang);
        el('[data-microscope]').innerHTML=microscope(r,Number(sectorInput.value),lang);
        el('[data-comparison]').innerHTML=comparison(rows,model,lang);
        code=pythonCode(rows,model,lang);
        el('[data-python]').textContent=code;
        el('[data-preview]').textContent=preview(r,lang);
    }
    inputs.forEach(input=>input.addEventListener('input',()=>{
        if(input.dataset.field==='wp') {
            rows=rebalance(rows,Number(input.dataset.index),Number(input.value));
            syncWeights();
        }
        root.querySelectorAll('[data-scenario]').forEach(button=>button.setAttribute('aria-pressed','false'));
        el('[data-scenario-note]').textContent=t('사용자 실험: 현재 입력값으로 계산합니다. 시나리오를 누르면 원문 초기값을 기준으로 다시 구성합니다.', 'Custom experiment: calculations use your current inputs. Scenario buttons rebuild from the original example.');
        render();
    }));
    function applyScenario(kind: Scenario, reset=false) {
        rows=scenario(kind);
        if(reset) { modelInput.value='BHB'; sectorInput.value='0'; }
        for(const input of inputs) input.value=String(rows[Number(input.dataset.index)][input.dataset.field as 'wp'|'rp'|'rb']);
        syncWeights();
        root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scenario===kind)));
        el('[data-scenario-note]').textContent=(reset?t('초기화: 모형과 섹터 선택도 처음으로 되돌렸습니다. ', 'Reset: model and selected sector have also been restored. '):'')+notes[kind]+t(' 모든 시나리오는 원문 초기값에서 시작합니다.', ' All scenarios start from the original example.');
        render();
    }
    root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button=>button.addEventListener('click',()=>applyScenario(button.dataset.scenario as Scenario)));
    el('[data-reset]').addEventListener('click',()=>applyScenario('original',true));
    modelInput.addEventListener('change',render);
    sectorInput.addEventListener('change',render);
    function download(content: string, name: string, type: string) {
        const url=URL.createObjectURL(new Blob([content],{type}));
        const link=document.createElement('a'); link.href=url; link.download=name;
        document.body.append(link); link.click(); link.remove();
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
        el('[data-export-status]').textContent=t(`${name} 다운로드를 요청했습니다.`, `Requested download: ${name}.`);
    }
    el('[data-copy]').addEventListener('click',async()=>{
        if(!valid) return;
        try { await navigator.clipboard.writeText(code); el('[data-export-status]').textContent=t('현재 입력의 Python 코드를 복사했습니다.', 'Copied Python code for the current inputs.'); }
        catch { el('[data-export-status]').textContent=t('클립보드에 접근할 수 없습니다. 코드를 직접 선택하거나 Python 다운로드를 사용해 주세요.', 'Clipboard access is unavailable. Select the code manually or download the Python file.'); }
    });
    el('[data-python-download]').addEventListener('click',()=>{if(valid) download(code,'brinson-attribution.py','text/x-python;charset=utf-8');});
    el('[data-csv-download]').addEventListener('click',()=>{if(valid) download(csv(rows,modelInput.value as Model),'brinson-attribution.csv','text/csv;charset=utf-8');});
    syncWeights(); render();
}

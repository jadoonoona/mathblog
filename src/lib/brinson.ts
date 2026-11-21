/** UI data is in percent; every calculation below uses decimal ratios. */
export type Model = 'BHB' | 'BF';
export interface Sector { name: string; wp: number; wb: number; rp: number; rb: number }
export const initial: readonly Sector[] = [
    { name: 'Energy', wp: 50, wb: 50, rp: 18, rb: 10 },
    { name: 'Healthcare', wp: 30, wb: 20, rp: -3, rb: -2 },
    { name: 'Financials', wp: 20, wb: 30, rp: 10, rb: 12 },
];
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export function validate(rows: readonly Sector[]): string[] {
    const errors: string[] = [];
    if (!rows.length) errors.push('섹터가 필요합니다.');
    for (const s of rows) {
        for (const field of ['wp', 'wb', 'rp', 'rb'] as const) {
            const value = s[field], weight = field === 'wp' || field === 'wb';
            if (!Number.isFinite(value) || value < (weight ? 0 : -100) || value > (weight ? 100 : 1000))
                errors.push(`${s.name}: ${field}는 ${weight ? '0~100' : '-100~1000'}%의 유한한 숫자여야 합니다.`);
        }
    }
    for (const field of ['wp', 'wb'] as const) if (Math.abs(sum(rows.map(s => s[field])) - 100) > 1e-8)
        errors.push(`${field === 'wp' ? '포트폴리오' : '벤치마크'} 비중 합계는 100%여야 합니다.`);
    return errors;
}
export function calculate(rows: readonly Sector[], model: Model = 'BHB') {
    const errors = validate(rows);
    if (errors.length) throw new Error(errors.join(' '));
    if (model !== 'BHB' && model !== 'BF') throw new Error('지원하지 않는 모형입니다.');
    const decimal = rows.map(s => ({ name: s.name, wp: s.wp / 100, wb: s.wb / 100, rp: s.rp / 100, rb: s.rb / 100 }));
    const portfolio = sum(decimal.map(s => s.wp * s.rp));
    const benchmark = sum(decimal.map(s => s.wb * s.rb));
    const sectors = decimal.map(s => {
        // BF uses sector return relative to the total benchmark; BHB uses sector return directly.
        // Since both weight sums are one, aggregate allocation is unchanged between the models.
        const allocation = (s.wp - s.wb) * (s.rb - (model === 'BF' ? benchmark : 0));
        const selection = s.wb * (s.rp - s.rb);
        const interaction = (s.wp - s.wb) * (s.rp - s.rb);
        return { ...s, allocation, selection, interaction, total: allocation + selection + interaction,
            contribution: s.wp * s.rp, benchmarkContribution: s.wb * s.rb };
    });
    const allocation = sum(sectors.map(s => s.allocation));
    const selection = sum(sectors.map(s => s.selection));
    const interaction = sum(sectors.map(s => s.interaction));
    const active = portfolio - benchmark;
    const attributed = allocation + selection + interaction;
    return { model, portfolio, benchmark, active, allocation, selection, interaction, attributed,
        residual: active - attributed, sectors };
}
export type Result = ReturnType<typeof calculate>;
export function rebalance(rows: readonly Sector[], index: number, weight: number): Sector[] {
    if (!Number.isInteger(index) || index < 0 || index >= rows.length || rows.length < 2 || !Number.isFinite(weight) || weight < 0 || weight > 100)
        throw new Error('유효한 섹터와 0~100% 비중이 필요합니다.');
    const other = rows.map((_, i) => i).filter(i => i !== index);
    const total = sum(other.map(i => rows[i].wp));
    const next = rows.map(s => ({ ...s }));
    next[index].wp = weight;
    let allocated = 0;
    // Preserve other sectors' relative weights, or split equally when their previous total is zero.
    // Give the final sector the remainder to avoid drift in the 100% weight constraint.
    other.forEach((i, j) => {
        next[i].wp = j === other.length - 1 ? 100 - weight - allocated : (100 - weight) * (total === 0 ? 1 / other.length : rows[i].wp / total);
        allocated += next[i].wp;
    });
    return next;
}
export type Scenario = 'original' | 'allocation' | 'selection' | 'identical';
export function scenario(kind: Scenario): Sector[] {
    return initial.map(s => ({ ...s,
        wp: kind === 'selection' || kind === 'identical' ? s.wb : s.wp,
        rp: kind === 'allocation' || kind === 'identical' ? s.rb : s.rp,
    }));
}
/** Only formatting functions round; exports retain raw calculation precision. */
export function percent(value: number, effect = false, digits = 2): string {
    const n = Math.abs(value * 100) < 0.5 * 10 ** -digits ? 0 : value * 100;
    return `${effect && n > 0 ? '+' : ''}${n.toFixed(digits)}${effect ? '%p' : '%'}`;
}
export function pythonCode(rows: readonly Sector[], model: Model, language: 'ko' | 'en' = 'ko'): string {
    const effectUnit = language === 'en' ? ' pp' : '%p';
    calculate(rows, model); // Never export invalid inputs.
    return `# Educational single-period Brinson attribution. Requires: pip install pandas
# Independently written; example: Tal Sansani, Brinson Attribution in Python (2023)
# https://medium.com/off-script-systems/brinson-attribution-in-python-5e5a6265e708
import json
import math
import pandas as pd

MODEL = "${model}"
# Inputs in percent. Beginning-of-period weights; same period and currency.
rows = ${JSON.stringify(rows, null, 4)}
df = pd.DataFrame(rows).set_index("name")
for col in ["wp", "wb", "rp", "rb"]:
    assert all(math.isfinite(x) for x in df[col])
    lo, hi = (0, 100) if col in ["wp", "wb"] else (-100, 1000)
    assert df[col].between(lo, hi).all()
df[["wp", "wb", "rp", "rb"]] /= 100.0
assert math.isclose(float(df.wp.sum()), 1.0, abs_tol=1e-10)
assert math.isclose(float(df.wb.sum()), 1.0, abs_tol=1e-10)

RP = float((df.wp * df.rp).sum())
RB = float((df.wb * df.rb).sum())
df["contribution"] = df.wp * df.rp
df["benchmarkContribution"] = df.wb * df.rb
df["allocation"] = (df.wp - df.wb) * (df.rb - (RB if MODEL == "BF" else 0))
df["selection"] = df.wb * (df.rp - df.rb)
df["interaction"] = (df.wp - df.wb) * (df.rp - df.rb)
df["total"] = df[["allocation", "selection", "interaction"]].sum(axis=1)
totals = df[["allocation", "selection", "interaction"]].sum()
active = RP - RB
attributed = float(totals.sum())
residual = active - attributed
assert math.isclose(attributed, active, rel_tol=1e-10, abs_tol=1e-12)

print("Inputs and effects (decimal ratios):")
print(df.to_string())
print("Attribution totals (${effectUnit.trim()}):")
print((totals * 100).to_string())
print(f"RP={RP:.6%}, RB={RB:.6%}, active={active * 100:+.6f}${effectUnit}")
# Full precision machine-readable output, also useful for independent verification.
output = dict(model=MODEL, portfolio=RP, benchmark=RB, active=active,
              **{k: float(v) for k, v in totals.items()}, attributed=attributed,
              residual=residual, sectors=df.reset_index().to_dict(orient="records"))
print("RESULT_JSON=" + json.dumps(output, allow_nan=False))
`;
}
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
export function csv(rows: readonly Sector[], model: Model): string {
    const r = calculate(rows, model);
    const header = ['model', 'sector', 'wp_percent', 'wb_percent', 'rp_percent', 'rb_percent', 'portfolio_contribution_pp', 'benchmark_contribution_pp', 'allocation_pp', 'selection_pp', 'interaction_pp', 'total_pp'];
    const lines = rows.map((s, i) => [model, s.name, s.wp, s.wb, s.rp, s.rb, ...(['contribution', 'benchmarkContribution', 'allocation', 'selection', 'interaction', 'total'] as const).map(k => r.sectors[i][k] * 100)]);
    lines.push([model, 'TOTAL', 100, 100, '', '', r.portfolio * 100, r.benchmark * 100, r.allocation * 100, r.selection * 100, r.interaction * 100, r.active * 100] as (string | number)[]);
    return '\uFEFF' + [header, ...lines].map(line => line.map(csvCell).join(',')).join('\r\n');
}

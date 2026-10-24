# Hotel model — Phases 1–5

Local routes include the Astro base:
- `/mathblog/projects/hotel-asset-management/`
- `/mathblog/ko/projects/hotel-asset-management/`

Run `npm test` (Node 22.18+ native TypeScript support) and `npm run build`.
The repository has no lint command. No dependencies have been added.

## Architecture

`hotel-model.ts` retains the pure annual operating functions. Rates are decimals.
`hotel-investment.ts` consumes those functions to produce two comparable annual
forecasts, incremental cash flows, NPV, IRR status, simple/discounted paybacks,
ROI, disruption loss and a reconciled waterfall. Inputs are never mutated.
`HotelInvestment.astro` and `hotel-investment.ts` in scripts own bilingual inputs,
formatting, accessible SVG charts and the scrollable forecast. The existing
operating dashboard calls its update callback after each operating input/reset.
Invalid inputs retain the last valid case with a status message.

## Investment conventions

- Capex occurs at year zero; all other cash flows are year-end.
- Year 1 uses starting ADR and calibrated costs; growth/inflation start Year 2.
- Both cases share capacity, growth and inflation. Starting costs equal total
  revenue less EBITDA for the respective Phase 1 regime, then inflate independently.
- Construction starts immediately. During construction use baseline rates,
  occupancy and cost structure, partial room availability, unchanged fixed costs
  and variable costs proportional to availability. Blend construction and improved
  regimes by fraction of each year. Improvements start after construction.
- Disruption loss compares construction EBITDA with no-renovation EBITDA for the
  same time fraction. It is embedded once in incremental EBITDA.
- Incremental FCF = renovated EBITDA − baseline EBITDA − incremental maintenance
  + final-year residual. Annual maintenance applies throughout the horizon.
- ROI divides net cumulative FCF (already net of outflows) by initial capex plus
  all maintenance capex. A zero denominator is N/A.
- IRR uses all project cash flows. Multiple sign changes are flagged as potentially
  ambiguous; no arbitrary root is selected. Payback interpolates the first
  recovery year, which may differ from strict year-end timing and can later reverse.
- The forecast selector changes operating columns. Investment cash-flow columns
  remain incremental in all views. Currency displays round to pounds; underlying
  calculations and the waterfall reconcile at full precision.

Returns are illustrative, pre-tax and unlevered. EBITDA is not FCF. Cost split,
post-renovation cost calibration, monthly disruption, ramp-up, working capital,
tax, replacement reserves, seasonality, exit assumptions and price elasticity
need asset-specific refinement. Residual benefit defaults to zero and represents
only an incremental investment receipt, never total hotel sale proceeds.

Phase 3 reuses `forecastInvestment` for all scenario comparisons and sensitivity
tests. Portfolio reporting is documented separately in `hotel-portfolio.md`; the Investment Committee memo is documented in `hotel-memo.md`.

## Phase 3 — scenario and sensitivity analysis

`hotel-scenarios.ts` contains the pure scenario engine. `resolveScenario` clones
live current/projected/investment settings and overrides only projected occupancy,
projected ADR, initial capex and cost inflation. `compareScenarios`,
`calculateHeatmap`, `calculateTornado` and `calculateBreakEvens` all call the exact
Phase 2 `forecastInvestment` function via `runModel`. Core valuation formulas have
not changed. The original four scenario defaults remain explicit overrides even
when their matching Phase 2 inputs change; other settings inherit immediately.
Scenario edits persist until changed or reset. The sensitivity reference selector
chooses which resolved scenario is tested and never writes shared assumptions.

The heatmap modifies exactly two inputs per cell. Defaults: ADR £125–175 by £10,
occupancy 65–90% by 5pp, capex 80–120% of reference, discount 6–14% by 2pp.
Capex tests are capped at £100m; a zero reference uses £0–1m in £250k steps.
Only exact reference coordinates are outlined (78% is not on the default grid).
Tornado tests use ADR ±10%, occupancy ±5pp, capex ±20%, discount ±2pp,
cost inflation ±1pp, construction duration ±3 months, and rooms unavailable ±10pp.
Each interval is clipped to valid input bounds and the construction horizon.
Ranks are conditional on these ranges, not probability estimates.

Break-even uses bounded bisection, at most 200 iterations and £1 absolute NPV
residual tolerance. Bounds: ADR £0–5,000, occupancy 0–100%, capex £0–100m.
Endpoint roots are accepted within tolerance; flat functions, missing sign
brackets, non-finite evaluations or nonconvergence never produce a fabricated
solution. At fixed other settings, Phase 2 NPV is affine in each of these three
variables (target revenue and calibrated costs scale together; capex is a t=0
outflow). Increasing operating-input thresholds are minima; an unusual negative
slope is explicitly labelled as an upper threshold. Full precision is retained
for root checks; displayed values are rounded.

`HotelScenarios.astro`, `scripts/hotel-scenarios.ts` and
`scripts/scenario-charts.ts` supply the bilingual section, charts, data tables and
results-driven commentary. Shared operating/investment input events, scenario
edits, resets and reference/pair selectors each refresh results. Invalid inputs
retain the last valid calculation with an explicit stale-results message.
No data is persisted across reloads. All results remain illustrative, pre-tax and
unlevered. Projected costs are recalibrated from the projected margin, as in
Phase 2; sensitivities therefore do not hold renovated costs fixed. The horizon
inherits the user's Phase 2 setting rather than forcing ten years.

Unit tests cover complete Phase 2/base reconciliation, inheritance, immutability,
all four heatmap pairs, tornado reruns/ranking, root residuals, absent roots,
feasible bounds, invalid assumptions and unavailable IRR/payback. Browser-level
visual and interaction verification requires browser tooling unavailable here.
Phase 4 portfolio reporting is available on the separate `/portfolio/` route; see `hotel-portfolio.md`. Phase 5 memo generation and decision support are available on the project page; see `hotel-memo.md`.

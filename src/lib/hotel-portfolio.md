# Phase 4 — Portfolio & Capex Oversight

Routes:
- `/mathblog/projects/hotel-asset-management/portfolio/`
- `/mathblog/ko/projects/hotel-asset-management/portfolio/`

Run `npm run dev` for local use, `npm test` for calculations and `npm run build`
for all static routes. No lint command is configured. No dependency was added.

## Files and responsibilities

- `data/hotel-portfolio.ts`: five fictional UK upscale hotels, fifteen projects,
  January–December 2025 archive plus December 2024 opening records. All amounts
  are nominal GBP and every person/property/benchmark is fictional.
- `lib/hotel-portfolio.ts`: typed hotel/project/snapshot structures, expenditure
  metrics, accuracy, flags, filtered report construction, weighted operations,
  export rows and safe CSV encoding. Uses Phase 1 `calculateOperatingMetrics`.
- `components/HotelPortfolio.astro`: bilingual page structure, global reporting
  controls, six accessible tabs, methodology and a project record dialog.
- `scripts/hotel-portfolio.ts`: selection events, formatting, tab keyboard support,
  traceable commentary, record inspection and local CSV downloads.
- `scripts/portfolio-charts.ts`: presentation-only charts from report outputs.
- `styles/hotel-portfolio.css`: theme-aware responsive controls and scrollable
  financial tables, alongside the existing hotel dashboard stylesheet.
- English/Korean portfolio pages: existing shared Layout/header/theme/navigation.
- `tests/hotel-portfolio.test.ts`: reporting, archive and export integrity tests.

## Snapshot architecture

`createPortfolioDataset(endMonth)` builds snapshots forward from fixed project
seeds and the prior snapshot. It uses no clock, network, random number or final
realised project outcome. Each snapshot records approval, both budget versions,
cumulative actual, outstanding commitments, uncommitted remaining forecast,
next-month drawdown forecast, status, completion date, declared risk and all six
departmental submissions. Portfolio hotel operating assumptions and synthetic
benchmarks are separately archived per month. The returned dataset is recursively
frozen. A report never consults a later snapshot.

A shorter archive through September has exactly the same historical records and
report as the full archive through December. Tests also alter all later cost,
budget, schedule and operating records and verify that September remains equal.
The opening snapshot supplies January's prior forecast and cumulative actual.
Completed projects retain their final actual expenditure and have zero ETC and
next-month forecast; unpaid commitments never sit in actual expenditure.

These are generated demonstration records, not forecasts estimated from real data
or an audited accounting ledger. Deliberate as-of events include separate cost
forecast changes, approved budget revisions, construction holds, schedule delays,
approvals, invoice timing differences and missing departmental submissions.

## Financial conventions

Original approved = first approved amount (zero before approval). Revised approved
= original plus approved as-of changes. Pending project estimates may have EAC but
no approved budget: this is explicitly flagged rather than granting approval.

ETC = unpaid commitments + uncommitted remaining forecast.
EAC = cumulative actual + ETC.
Forecast variance = EAC − revised approved budget (positive = overspend).
Gross overspend = sum(max(project variance, 0)); savings never offset this metric.
Financial near-completion = actual/EAC ≥90% for an unfinished project; this is not
physical certification. Rates with a zero denominator are N/A, never Infinity.

Monthly actual = current cumulative actual − prior cumulative actual.
Monthly forecast = the prior snapshot's next-month forecast for that same month.
Forecast error = monthly actual − monthly forecast; positive = under-forecasting.
Bias = sum(error)/sum(forecast).
MAE = sum(abs(project errors))/number of projects with a prior forecast.
WAPE = sum(abs(project errors))/sum(monthly actual).
Material deviation = absolute error >£25k AND >20% of forecast (zero forecast with
>£25k actual is material). Explanations describe the as-of simulated invoice,
certification, hold or final-account event; no budget is used as a monthly forecast.

## Filters, time comparisons and rules

Hotel, status and category filters define the visible project ID cohort. KPI totals,
PER, variance tables, accuracy, risk records and exports all use that cohort.
Previous-month comparisons and history charts hold those IDs constant rather than
changing cohorts as historical statuses change. Charts stop at the selected month.
Hotel performance uses the hotel filter only: project filters do not change hotel
operations. Sorting changes row order without changing totals.

Flags are explicitly rule-based: overspend >10% or unapproved forecast; EAC increase
>£100k and >5% month on month; unfinished completion delay >30 days versus original
plan; commitments >80% of remaining approved budget (or any when none remains);
two consecutive material forecast errors; incomplete departmental submissions.
Two or more flags produce displayed High risk, one produces at least Medium;
a declared High risk stays High. At-risk count includes any flag or High risk.
Project inspection exposes the components, prior EAC, monthly drawdown error,
original/current schedule and every departmental submission/next action.

Rules-based commentary lists the three largest overspends, material EAC increases,
unfinished delays, properties below synthetic benchmark RevPAR, margin declines
versus prior month and the attention count. Links open the underlying record or
hotel performance view; each statement comes from the selected report outputs.

## Operating performance and exports

Monthly hotel operations reuse Phase 1 with actual calendar days and illustrative
occupancy/ADR/margin assumptions. Portfolio occupancy = total occupied nights /
total available nights; ADR = total room revenue / occupied nights; RevPAR = total
room revenue / available nights; EBITDA margin = total EBITDA / total revenue.
Benchmark gaps are hotel minus synthetic benchmark; RevPAR index = hotel RevPAR /
synthetic benchmark RevPAR ×100. No licensed STR dataset or operator data is used.

PER, variance and hotel performance CSVs use the same report object as the display,
include reporting month, GBP, filter/scope metadata, disclaimer and reconciled
selection totals. Currency data exports retain full precision while UI currency
rounds to pounds. Rates are explicitly labelled decimals. CSV uses BOM, CRLF and
quoted escaped fields; formula-like strings are protected for spreadsheet use.
Downloads occur in the browser; there is no external integration or persistence.

## Integration and limits

Phases 1–3 retain their calculation functions, scenario inputs and existing route.
The project page links to this separate archive. There is no dated project ID in
the single-hotel case consistent with these programme records; therefore no
portfolio project is claimed to be the Phase 2 refurbishment and no approved
budget is substituted for investment cash flows. Phase 5 memo generation is available on the single-hotel page, without importing these unrelated project values.

Outstanding limits: deterministic synthetic data, no invoice-level audit trail,
no real approval controls, no authentication/collaboration, no FX/tax treatment,
simplified operating assumptions and synthetic benchmarks. Department labels and
record commentary remain English data in the Korean interface. Desktop/mobile
browser visual QA is unavailable in this environment. Automated checks cover all
calculation suites, build output, generated navigation and the actual client
renderer with DOM stubs (month/filter/reset events); stubs do not verify layout.

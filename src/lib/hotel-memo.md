# Phase 5 — Investment Committee & Decision Support

Open `/mathblog/projects/hotel-asset-management/#investment-committee` (or the
Korean route `/mathblog/ko/projects/hotel-asset-management/#investment-committee`).
The module lives on the existing project page and inherits live Phase 1–3 inputs.
The portfolio page links back to it; phase navigation links all five modules.

## Files

Created:
- `src/components/HotelMemo.astro`: bilingual controls and memo output container.
- `src/lib/hotel-memo.ts`: typed configuration, recommendation matrix, immutable
  snapshot generation, numerical commentary, risk evidence and CSV financial rows.
- `src/scripts/hotel-memo.ts`: input handling, regeneration, stale-state and export
  guards, browser printing and CSV download.
- `src/scripts/memo-renderer.ts`: pure, DOM-independent memo HTML from a snapshot.
- `src/styles/hotel-memo.css`: responsive memo controls and A4 print layout.
- `tests/hotel-memo.test.ts`: reconciliation, governance and export tests.
- `src/lib/hotel-memo.md`: this document.

Updated:
- `src/components/HotelDashboard.astro`: memo and five-phase navigation.
- `src/components/HotelInvestment.astro`: underwriting navigation anchor.
- `src/components/HotelScenarios.astro`: scenario navigation anchor.
- `src/scripts/hotel-scenarios.ts`: shared scenario-reader callback and memo update
  notification on upstream changes (including invalid inputs).
- `src/components/HotelPortfolio.astro`: return link and scope disclosure.
- `src/data/home.ts`, `src/data/home-ko.ts`: project availability label.
- `src/lib/hotel-model.md`, `src/lib/hotel-portfolio.md`: Phase 5 references.

No new package, route, backend, AI API or unrelated portfolio module is introduced.

## Source and snapshot consistency

The appraised case can be the edited Phase 3 downside, base or upside scenario,
or the current Phase 2 custom inputs. The choice never rewrites upstream settings.
Phase 3's four overrides remain explicit; all other assumptions inherit normally.
Scenario comparisons always retain the exact Phase 3 results, even when the
custom Phase 2 appraisal differs from the Phase 3 base scenario.

`generateInvestmentMemo` clones inputs, validates them, calls the existing
`runModel`/`compareScenarios`, tornado and bounded-break-even functions, generates
structured commentary, then deeply freezes the document. Current operating values
reuse `calculateOperatingMetrics`. Core Phase 1–4 calculation methods are unchanged.
The memo includes all annual cash flows for the selected horizon (ten years by
default), without treating EBITDA as free cash flow.

Each document retains its entire input signature, appraised case, analysis date
and a human-readable snapshot ID. Staleness compares the full input signature,
not the abbreviated ID hash. Any relevant setting, note, evidence, chart or
scenario change marks the document stale. Both export buttons are disabled, and
handlers recheck the signature before export; invalid upstream inputs also block.
Regeneration replaces the entire document. No results from different versions are
merged. Reset affects only memo configuration and preserves upstream assumptions.
The default analysis date is browser time in Europe/London, editable by the user.
No analyst notes are persisted or transmitted.

## Recommendation policy

Default thresholds: IRR ≥10%, NPV ≥£0, simple payback ≤8 years, initial capex ≤£5.5m.
The user can edit all four, permit negative downside NPV, and choose whether
material adverse execution findings block the investment outright. These are
illustrative rules, never a hotel-group policy.

- Fail any core financial threshold → DO NOT APPROVE. NPV must also satisfy a
  nonnegative-value safeguard even if a negative hurdle is configured.
- Null, ambiguous or non-finite required metrics do not pass.
- Material/adverse execution findings → DO NOT APPROVE when the blocking policy
  is enabled; otherwise they remain unresolved and lead to conditional approval.
- Unacceptable downside, missing execution evidence, an unreferenced risk review,
  or any open condition → CONDITIONAL APPROVAL when financial hurdles pass.
- APPROVE requires all six criteria to Pass and no open condition.

Every required evidence item defaults to Unknown. A supported analyst assertion
requires a nonblank reference; it is explicitly user-provided, not independent
verification. Execution Pass requires all six referenced supporting items and a
referenced clear risk review. Proposed mitigations never mark evidence complete.
Additional user conditions remain open. Passing financial thresholds alone does
not establish execution readiness or authorise real capital commitment.

## Memo and portfolio scope

The English memo contains an executive dashboard, a 150–200-word default summary,
asset overview, capital scope, underwriting, scenarios/sensitivities, bounded roots,
five structured risk assessments, portfolio scope disclosure, decision matrix,
conditions, analyst evidence/comments, monitoring suggestions and methodology.
Controls and headings around the document follow the site's English/Korean routes;
the generated IC document is deliberately English (`lang="en"`). All analyst text
is escaped and explicitly labelled unverified user text.

No dated project ID consistently links the appraisal asset to Phase 4. Accordingly
`projectEAC` is null, portfolio budget/benchmark/risk values are not imported, and
execution readiness is not inferred from unrelated reporting records. Maximum
initial capex among the tested cases is shown as a scenario bound only, never an
expected final expenditure forecast.

## Print/PDF and CSV

The Print / Save as PDF button invokes browser print on the exact memo DOM shown
on screen. Choose A4 and Save as PDF in the browser dialog. Print CSS hides website
navigation, upstream dashboards, controls and chart interaction tables. It uses
fixed-width wrapping tables, repeating headers, row-break protection, bounded
charts and an A4 content area. Direct browser printing of a stale memo suppresses
the outdated document and shows the stale-status notice.

CSV uses `memoFinancialRows` from the same frozen document and Phase 4's existing
CSV encoder. It includes date, case, snapshot ID, recommendation, required financial
metrics, every annual investment cash flow, all scenarios and the decision matrix.
No financial values are recalculated specifically for print or CSV.

## Verification and limitations

All 51 calculation tests pass, including the previous 37 tests. New tests confirm
complete Phase 2 NPV/IRR/cash-flow equality, exact Phase 3 scenario equality, threshold
logic, missing evidence, negative NPV guards, stale-export rejection, snapshot
immutability, CSV reconciliation, numerical narrative claims and escaped comments.
The actual client module also passed a DOM-stub interaction check for stale
blocking, selected-case regeneration and identical print DOM.

A local headless Whale/Chromium print check generated a nine-page A4 base memo.
PDFKit extraction verified the snapshot ID, analysis date, NPV, recommendation and
all final sections; UI/navigation controls were absent. Every page's text remained
inside A4 horizontal content margins. The executive and annual-cash-flow pages
were visually inspected, including repeated cash-flow headers. Temporary preview
files were written under `/private/tmp`, not committed. No browser package was
installed. The repository has no lint command.

Financial limitations remain those of Phases 1–3: hypothetical, pre-tax, unlevered,
annual timing, margin-calibrated costs, no independent market/contractor estimates,
no detailed tax/working-capital/financing model or verified residual value. Scenario
ranges are not probabilities. User-supplied evidence is not documentary verification.
Browser print engines and user print settings may affect pagination. The full
interactive page has not received desktop/mobile visual browser testing. Real
investment decisions require professional judgement and detailed diligence; no
hotel group endorsement is implied.

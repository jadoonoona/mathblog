# Brinson Attribution interactive post

Local articles: `/mathblog/blog/brinson-attribution/` (English), `/mathblog/ko/blog/brinson-attribution/` (Korean). EN / 한국어 links switch between the two versions. Both share the same calculations; English uses `pp` for percentage points, Korean uses `%p`.
No new runtime dependencies. Astro + TypeScript + SVG, following the existing blog layout and theme variables.

## Source map

- `src/pages/blog/brinson-attribution.astro` and `src/pages/ko/blog/brinson-attribution.astro`: English/Korean article, labels, controls and initial server-rendered results.
- `src/data/brinson-post.ts`: metadata registered in the blog list and All Posts sidebar.
- `src/lib/brinson.ts`: validated pure calculations, proportional rebalancing, scenarios, full-precision Python/CSV generation. UI inputs use percent, computations use decimals.
- `src/lib/brinson-view.ts`: presentation only: tables, waterfall, Korean interpretation, microscope and model comparison.
- `src/scripts/brinson-attribution.ts`: input/error handling, state updates, clipboard and downloads.
- `src/styles/brinson.css`: scoped theme styles and responsive layout; minimum-width correction applies only to this article.
- `src/pages/blog/index.astro` and `src/layouts/BlogPost.astro`: register the post in the Blog list and select the appropriate sidebar translation.
- `src/components/LanguageSwitcher.astro`: link English and Korean routes.
- `tests/brinson.test.ts` and `scripts/check-brinson-browser.mjs`: pure-model/Python parity checks and real-browser QA.
- `research/brinson-attribution/README.md`: this implementation and verification guide.

## Preview and checks

```sh
npm run dev
# http://localhost:4321/mathblog/blog/brinson-attribution/
npm run build
npm test
```

The Python parity test runs actual generated pandas code. This checkout's `.venv/bin/python` already has pandas 2.3.3. For another machine, prepare a Python environment with pandas and select it:

```sh
BRINSON_PYTHON=/absolute/path/to/python npm test
```

`tests/brinson.test.ts` covers the six expected initial totals, isolated/zero effects, 0%/100% weights, proportional and equal redistribution, invalid inputs, 1,000 seeded random portfolios, BHB/BF identities and 12 real Python executions comparing sector effects and totals.

For the optional real-browser check, start the dev server and a local Chromium instance with remote debugging port 9223, then run:

```sh
node scripts/check-brinson-browser.mjs
```

This script needs localhost access. It checks both language routes, then scenarios, sliders/keyboard, blank and out-of-range inputs, negative/zero waterfall values, BF formulas, clipboard, Python and CSV downloads, downloaded Python execution, accessible names, desktop width and a 390px mobile viewport. It writes screenshots and downloads under `/private/tmp/brinson-qa/`. Browser launch and inspection permissions depend on the local environment.

## Units and assumptions

Long-only, fully invested beginning-of-period weights, single period and currency; no separate flows, trades, fees or currency effects. Return inputs are limited to -100% through 1,000% for the experiment. Benchmark weights stay fixed at 50/20/30. Display formatting rounds; calculation and exports do not. CSV header suffix `_percent` means percentage inputs; `_pp` means percentage-point contributions/effects. On the TOTAL row, `total_pp` is active return.

BHB allocation is `(wp-wb)*rb`; BF allocation is `(wp-wb)*(rb-RB)`. Selection and interaction are unchanged. Because both weight sums equal one, total allocation is identical, while sector allocations and sector effect totals can differ. Reconciliation tolerance in the UI is 1e-10 decimal units.

## References

- Tal Sansani, [Brinson Attribution in Python](https://medium.com/off-script-systems/brinson-attribution-in-python-5e5a6265e708), 2023-04-13: numerical example and learning prompt. Article prose and both implementations are independently written.
- CFA Institute Research Foundation, [Performance Attribution](https://rpc.cfainstitute.org/sites/default/files/-/media/documents/book/rf-lit-review/2019/rflr-performance-attribution.pdf), 2019: attribution formulas.
- CFA Institute, [Portfolio Performance Evaluation](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/portfolio-performance-evaluation): performance evaluation context and limitations.

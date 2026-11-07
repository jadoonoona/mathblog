# Nasdaq after U.S. midterm elections

A reproducible study of magnitude, with direction reported secondarily. Python 3.11+.

From the repository root:

```sh
python -m pip install -r research/nasdaq-midterms/requirements.txt
python research/nasdaq-midterms/analyze.py --as-of 2026-11-06
python -m pytest -q research/nasdaq-midterms
npm test
npm run build
# Refresh the raw snapshot explicitly (network required):
python research/nasdaq-midterms/analyze.py --fetch --as-of 2026-11-06
```

The repository's `.venv/bin/python` can replace `python`. For restricted home caches, set `MPLCONFIGDIR=/tmp/mathblog-mpl`. The default run is offline using the retained original CSV. No API key, filling, substitute index, or synthetic-data fallback is used. Failure to retrieve sufficient real observations raises an error and leaves no newly fabricated results.

## Repository conventions

No applicable `AGENTS.md` was found in this checkout or its ancestor directories. Reviewed `src/pages/math-notes/matrix.md`, `src/pages/math-notes/permutation and combination.md` (Markdown front matter, probability/statistics category, BlogPost layout), and the existing finance research project. The Math & Statistics project category had no project entries before this addition. Existing `.astro` project routes, shared Layout, blog typography, and data-driven ProjectCard registration are used. Both language versions share one research component and one JSON result source. This project lives under Projects / Mathematics rather than the unrelated Blog index. No dependencies were added to the web app.

## Data and official calendar

- Prices: Nasdaq, Inc., NASDAQ Composite [NASDAQCOM], retrieved from FRED, Federal Reserve Bank of St. Louis: https://fred.stlouisfed.org/series/NASDAQCOM
- CSV endpoint: https://fred.stlouisfed.org/graph/fredgraph.csv?id=NASDAQCOM&cosd=1971-01-01&coed=2026-11-06
- Raw snapshot: `data/raw/NASDAQCOM.csv`; source provider, final observation, cutoff, download metadata and SHA-256 are included in the output JSON. Nasdaq data are subject to the source's terms; this is the actual retained snapshot, not a newly licensed feed.
- Official 1974–2022 general-election dates: LA County Registrar-Recorder/County Clerk, https://www.lavote.gov/official-election-returns . All 13 relevant dates were checked against the dated general-election headings on that archive.
- Official 2026 election date: California Secretary of State, https://www.sos.ca.gov/elections/upcoming-elections (November 3, 2026).
- `elections.csv` retains each verified date and source URL. The code also checks the Tuesday-after-first-Monday calendar rule. Dates are U.S. market observation dates; London timezone conversion is not applied.

Analysis cutoff: 2026-11-06. Last available observed close in this snapshot: 2026-11-05. The snapshot starts 1971-02-05. Prices are positive observed closing levels. Empty / dot observations are removed, never forward-filled. A return bridges the previous valid observation, and both actual dates, price levels and calendar gap are retained.

## Estimand and comparison design

The event date is the first observation strictly after each midterm election; the simple return is `100 * (event_close / previous_valid_close - 1)`. The event-day absolute return is ranked against exactly 60 valid daily absolute returns immediately before that event. The evaluation date is excluded. These require 61 preceding valid price levels. Percentile is `100 * count(baseline <= event_absolute_return) / 60`; exact numerical ties are included. This rank rescales recent move size and is not a full control for market conditions.

The main statistic is the median of the 14 event percentiles (even n: average of middle two). Direction is not used to choose candidates or the main statistic.

The comparison window is October 1 to the final available 2026 observation's month/day, capped at November 30, inclusive for **every** election year: currently October 1–November 5. An observed Wednesday is eligible unless it belongs to the election's Monday–Sunday week. This means early-November candidates can remain for years with a later election date. The event dates themselves are not truncated to this candidate window. Candidate dates, counts and their own strictly prior 60-return windows are exported in full.

Within each simulation, select one eligible Wednesday uniformly from each year, independently across years. Compute the median of 14 percentiles. Repeat 10,000 times, NumPy default_rng seed 42. The comparison center is the median of the simulated medians. Difference is observed median minus comparison center, in percentile points. Report the raw count/10,000 of simulated medians **greater than or equal to** observed, including ties. This is a conditional simulation rarity measure under the specified candidate mechanism, not a causal probability, an election-label permutation test, or a prediction interval. Its Monte Carlo resolution is 0.0001; finite simulation error remains.

For leave-one-year-out, delete each observed percentile and the corresponding simulated year column, then recompute the 13-year median in every simulation. This uses common random draws to reduce spurious sensitivity from a seed change. Influence is defined as the largest absolute change in the upper-tail fraction; ties use absolute change in observed-minus-center difference, then earlier year. All 14 sensitivities are reported, not just the selected year.

## Outputs and shared source

`public/data/nasdaq-midterms/`:

- `study.json`: provenance, summary, all events/candidates, candidate counts, LOO, 2026 baseline.
- `elections.csv`: the 14 event returns, both close dates and levels, gap, baseline endpoints and percentile counts.
- `comparison-wednesdays.csv`: every eligible date and its 60-return context.
- `leave-one-out.csv`: all 14 sensitivity runs.
- `simulation-medians.csv`: all 10,000 simulated medians.

`public/images/projects/nasdaq-midterms/`: three chart groups, SVG editable text + PNG. Charts are generated from the same study object serialized to JSON; the article and tables import that JSON directly, with no manually copied numerical results. Charts use opaque white backgrounds for light/dark legibility. Narrow portrait-friendly ratios, larger fonts, distinct up/down triangle shapes and responsive images support phones; tables scroll within the article rather than expanding the page. The article uses deployment BASE_URL for every chart and download path.

Routes: `/mathblog/projects/nasdaq-after-us-midterm-elections/` and `/mathblog/ko/projects/nasdaq-after-us-midterm-elections/`; registered in `src/data/home.ts` / `home-ko.ts` under `mathematics`. The header language switch preserves this article and the Math project list route.

## Actual snapshot results

2026: 25,372.010 (Nov 3) to 25,736.510 (Nov 4), +1.43662248%; 53 prior moves smaller, zero ties, percentile 88.333333. All 14 election-day closes are observed in this snapshot, so all event close gaps are one calendar day. Holiday/missing-election-close cases remain supported by observed-date logic and tested on an explicitly synthetic gap case.

14-event median: 36.666667; simulated median center: 55.000000; difference: −18.333333 percentile points; simulated medians at least as high: 9,140/10,000 = 91.40%. No evidence here that the typical event was unusually large relative to the selected Wednesdays. This is not evidence that elections caused smaller moves.

Most influential under the declared rule: 1986. Excluding it gives actual median 38.333333, center 58.333333, tail fraction 82.42% (−8.98 percentage points). All LOO fractions span 82.42%–97.77%, without reversing the interpretation.

Fourteen events, changing index composition and regimes, unequal candidate counts, the short seasonal window, percentile discreteness and contemporaneous macro/earnings/other news limit interpretation. Causal identification would require a different design. Actual 2026 return is independently checked using Decimal arithmetic on the original two closing prices; tests also verify every window, candidate eligibility, fixed-seed reproduction and all LOO distributions.

## Verification performed

The 10 analysis tests pass, including independent original-price Decimal calculation and a missing-election-close gap case. The repository's 51 Node tests and Astro build pass. Built English/Korean Math project lists link to the article, language switching preserves it, and all three chart paths resolve under `/mathblog/`. Firefox headless QA checked the actual local English page at desktop width 1280 and the Korean page at mobile width 390, including charts in a full-height mobile capture. Tables scroll within their labelled regions; chart text, up/down marker shapes and captions remain visible against the dark theme. QA screenshots are temporary local files, not published project assets.

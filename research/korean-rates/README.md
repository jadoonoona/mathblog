# Korean Interest Rate & Credit Spread Analysis

Quantifying Credit, Funding and Refinancing Risk through Non-Parametric Bootstrap Simulations.

Python 3.11+. Run from this directory after creating the repository-root `.venv`:

```sh
../../.venv/bin/python -m pip install -r requirements.txt
../../.venv/bin/python -m pytest -q
../../.venv/bin/python -m krates.run
export ECOS_API_KEY='your-key'
../../.venv/bin/python -m krates.run --fetch --end 20261102
# Recalculate from retained original responses, without network access:
../../.venv/bin/python -m krates.run --cached
```

The default run generates financing figures and an explicitly synthetic engineering benchmark only. It never creates synthetic market estimates. A local `.env` is not automatically loaded: export the key in your shell. HTTP errors redact authenticated URLs. No API key is written to raw responses or manifests.

The exact installed versions are recorded in `requirements-lock.txt`; use that file instead of `requirements.txt` to reproduce this environment. Matplotlib may use a temporary cache if your home cache directory is not writable; optionally set `MPLCONFIGDIR=/tmp/mathblog-mpl`.

## Current evidence status (2026-11-02)

Analysis now uses the user-supplied educational CSV `9주차_실습bc용_2024_2025.csv`, retained byte-for-byte as `data/raw/sample-2024-2025.csv`. Coverage: 2024-01-02 through 2025-12-31; 488 daily observations and 24 monthly averages. Original provider, corporate rating and maturities are unverified. Rate inputs are assumed annual percentages. No API credential is needed for this workflow:

```sh
../../.venv/bin/python -m krates.run --csv data/raw/sample-2024-2025.csv
```

The loader ignores all supplied derived columns (including duplicated/mislabeled headings), reconstructs A/B/C from the three rates, and records input hash and import timestamp in `data/raw/csv-manifest.json`. No missing rate values, duplicate dates or weekend observations were found. No independent holiday calendar completeness or policy effective-date validation has been performed. Supplied daily policy values are used as-is, with no filling or future-value alignment.

Government yield is absent: D is unavailable, never approximated from A. Three/five-year windows are omitted for this two-year sample. Both daily and monthly IID and all three block lengths run 10,000 replications, seed 42. Seven chart groups (PNG/SVG) are now generated; the D distribution panel is explicitly unavailable. All market figure captions identify the user CSV, not ECOS.

Daily A/B/C sample means: 25.6943 / 9.9426 / 35.6369bp. MBB20 percentile CIs: [16.7192,32.9666] / [5.5123,12.9959] / [25.0878,43.3187]bp. Non-circular MBB underweights boundary observations; its bootstrap means need not equal the original mean, especially for long blocks and trends. Report bias and block sensitivity rather than treating MBB60 as automatically preferable. Monthly 12-observation blocks span half the sample and offer limited independent block diversity.

The retained ECOS path below is optional future expansion, not the source of current empirical results.

## Sources and verification

Official portal: https://ecos.bok.or.kr/ ; API: https://ecos.bok.or.kr/api/ . Required metadata services: StatisticItemList, followed by StatisticSearch. Table identifiers 817Y002 (market daily) and 722Y001 (policy) are discovery candidates, **not an assertion that all items have already been verified**. The collector resolves exact Korean names from official metadata, verifies daily frequency, percentage units, and start coverage, and saves all metadata plus original rows and retrieval timestamp. It fails explicitly when metadata do not match; do not substitute a guessed code. Credentials are required for complete pagination. The effective last common observation may precede the requested end date.

## Methodology for ECOS and shared analysis

Raw data: `data/raw/{metadata,manifest,corporate,government,cd,policy}.json`. Cleaned daily/monthly rates and spreads: `data/processed/`. Tables and full MBB20 mean draws: `results/`. PNG and SVG assets: `../../public/images/blog/korean-rates/`.

Market observations are outer-joined for missingness auditing, then restricted to complete common weekday dates. Korean public holidays are not manufactured or filled. Exact duplicates are removed; conflicting duplicates fail. No market-rate interpolation. Policy rates use backward as-of alignment, including December 2009 seed observations; missing policy values never overwrite valid past rates. Alignment refers to the effective daily date, not intraday release availability. Data-quality JSON records missing values and retained counts. Monthly values are arithmetic means over retained common dates, including policy; they are not month-end fixings. A partial latest month remains included and should be labelled when interpreting it.

A=(corporate-CD)*100, B=(CD-policy)*100, C=(corporate-policy)*100, D=(corporate-government)*100; input is percent, output bp. D is the principal same-maturity credit indicator but includes liquidity, tax, and supply-demand effects. A–C contain maturity and policy-expectation components; no causal claims follow from correlation.

Joint-date IID and non-circular MBB resample all available spreads together (A/B/C for CSV; A/B/C/D for verified ECOS data). Each replication has exactly n observations; the last sampled block is truncated. Daily block lengths 5/20/60; monthly 3/6/12. 10,000 replications per method, seed 42. CSV uses the full two-year window; ECOS supports full/last 5/last 3 calendar years relative to the last observation. Prefix sums and chunked start indices bound memory without materializing the entire resampled cube. Percentile CIs describe the historical mean under the resampling assumptions, **not future spread or refinancing prediction intervals**. Structural breaks and nonstationarity remain limitations; block-length and subsample sensitivity are essential. Descriptive skew/kurtosis and bootstrap-mean skew/kurtosis have separate output tables.

Historical stress uses the maximum observed 60-common-observation widening of D when available, otherwise A (explicitly a mixed funding spread, not same-maturity credit) and reports both dates and endpoint values. It is a backward-looking, selected extreme, not an ex ante forecast. A public event is not assigned as its cause.

## Financing assumptions

KRW billion throughout: cost 100, debt 60, equity 40, initial loan rate 5%, constant debt, simple annual interest. LTC=60%. LTV requires the separate assumed valuation of 100 (not development cost by definition). Reference shocks add directly to the base contractual rate. Credit widening adds only `shock * pass-through`; 0/50/100% sensitivities are hypothetical. Heatmap Y-axis is the **effective** margin shock after pass-through. Combined=150bp reference +100bp credit x50%=200bp total; annual interest 4.2. No credit component is added twice. Base contractual reference level and margin are deliberately not separately calibrated without actual contract data.

Development PF has no assumed operating CFADS: use a KRW 6bn interest reserve and runway, ignoring fees/capitalization. A **separate stabilized operating asset** has annual CFADS 6 and principal repayment 2; DSCR=6/(interest+2), interest coverage=6/interest. The debt balance is the opening balance for a one-year sensitivity, not a multi-year amortization forecast. LTV uses a separate 100 valuation. Refinancing-rate sensitivity applies to the same opening debt; balloon repayment, takeout availability and valuation stress require separate modelling. DSCR omits the balloon and cannot establish refinancing feasibility.

## Performance and limitations

`results/benchmark.json` reports actual timed runs, traced allocation peak (not RSS), runtime versions, dimensions and maximum numerical difference. The benchmark uses 300 replications of a synthetic 500x4 array and identical RNG draws; do not generalize its speedup to ECOS-sized data or MBB without measurement. Unit tests use synthetic data only. Figures use white opaque backgrounds for legibility in light/dark blog themes, English labels to avoid unavailable Korean fonts, responsive existing blog image rules, and editable SVG text. Browser-level visual verification is separate from a successful build.

Future work: contract-calibrated repricing, bootstrap block selection, stationarity/regime diagnostics, valuation-linked refinancing capacity, balloon cash-flow and stochastic CFADS modelling.

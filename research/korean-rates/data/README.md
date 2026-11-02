# User-supplied CSV dataset

Original filename: `9주차_실습bc용_2024_2025.csv`. Imported on 2026-11-02 and retained without byte changes in `raw/sample-2024-2025.csv`. See `raw/csv-manifest.json` for SHA-256, columns and provenance limits.

488 observations, 2024-01-02 to 2025-12-31. Original provider, corporate rating, maturities and redistribution license are not supplied. Do not label this file as verified ECOS data. Inputs are interpreted as annual percentage rates. No government yield is supplied. Duplicate/mislabeled derived columns are ignored; A/B/C are recalculated. No D, no three/five-year comparisons. No synthetic market observations are included.

`processed/` contains daily and monthly rates and spreads. Monthly data contain 24 means over supplied observations. Missing, duplicate and weekend checks do not establish holiday-calendar completeness or policy effective-date accuracy.

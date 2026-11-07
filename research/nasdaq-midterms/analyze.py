"""NASDAQCOM post-midterm magnitude study. No synthetic fallback or price filling."""
import argparse
import hashlib
import json
import logging
import platform
from datetime import datetime, timezone
from pathlib import Path

import httpx
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
OUT = REPO / 'public/data/nasdaq-midterms'
CHARTS = REPO / 'public/images/projects/nasdaq-midterms'
SOURCE = 'https://fred.stlouisfed.org/series/NASDAQCOM'
YEARS = list(range(1974, 2027, 4))


def load_prices(path, as_of):
    raw = pd.read_csv(path, dtype=str, keep_default_na=False)
    if list(raw.columns) != ['observation_date', 'NASDAQCOM']:
        raise ValueError('Expected the FRED NASDAQCOM CSV schema')
    raw['date'] = pd.to_datetime(raw.observation_date, format='%Y-%m-%d', errors='raise')
    if raw.date.duplicated().any():
        raise ValueError('Duplicate FRED dates')
    values = raw.NASDAQCOM.replace({'.': np.nan, '': np.nan})
    raw['close'] = pd.to_numeric(values, errors='raise')
    valid = raw[raw.date <= pd.Timestamp(as_of)].dropna(subset=['close']).sort_values('date')
    if not np.isfinite(valid.close).all() or (valid.close <= 0).any():
        raise ValueError('Nonpositive or nonfinite close')
    valid = valid[['date', 'close']].set_index('date')
    valid['return_pct'] = valid.close.pct_change(fill_method=None) * 100
    valid['abs_return_pct'] = valid.return_pct.abs()
    return valid


def load_elections(path):
    events = pd.read_csv(path)
    if events.year.tolist() != YEARS or events.year.duplicated().any():
        raise ValueError('Expected exactly 14 unique midterm years, 1974–2026')
    events['election_date'] = pd.to_datetime(events.election_date, format='%Y-%m-%d')
    for row in events.itertuples():
        first = pd.Timestamp(row.year, 11, 1)
        monday = first + pd.Timedelta(days=(0-first.dayofweek) % 7)
        expected = monday + pd.Timedelta(days=1)
        if row.election_date != expected:
            raise ValueError('Election date differs from Tuesday after first Monday')
    return events


def observation(prices, day):
    day = pd.Timestamp(day)
    i = prices.index.get_loc(day)
    if i < 61:
        raise ValueError(f'Insufficient valid 60-return history for {day.date()}')
    baseline = prices.iloc[i-60:i]
    if len(baseline) != 60 or not baseline.abs_return_pct.notna().all() or baseline.index.max() >= day:
        raise ValueError('Invalid pre-event reference window')
    value = float(prices.abs_return_pct.iloc[i])
    less = int((baseline.abs_return_pct < value).sum())
    equal = int((baseline.abs_return_pct == value).sum())
    previous = prices.index[i-1]
    return dict(previous_close_date=str(previous.date()), previous_close=float(prices.close.iloc[i-1]),
                evaluation_date=str(day.date()), evaluation_close=float(prices.close.iloc[i]),
                return_pct=float(prices.return_pct.iloc[i]), abs_return_pct=value,
                calendar_gap_days=int((day-previous).days), baseline_n=60,
                baseline_start=str(baseline.index.min().date()), baseline_end=str(baseline.index.max().date()),
                less_count=less, equal_count=equal, less_equal_count=less+equal,
                percentile=100*(less+equal)/60)


def common_end(prices):
    current = prices.loc['2026-01-01':'2026-11-30']
    if current.empty:
        raise ValueError('2026 observations are required; do not substitute an earlier study')
    last = current.index.max()
    if last < pd.Timestamp('2026-11-04'):
        raise ValueError('The first post-2026-election close is not available')
    return min(last.strftime('%m-%d'), '11-30')


def build_samples(prices, elections):
    end_md = common_end(prices)
    events, candidates = [], []
    for election in elections.itertuples():
        future = prices.index[prices.index > election.election_date]
        if len(future) == 0:
            raise ValueError(f'No observed post-election close for {election.year}')
        day = future[0]
        record = observation(prices, day)
        record.update(year=int(election.year), election_date=str(election.election_date.date()),
                      election_close_observed=bool(election.election_date in prices.index),
                      election_close=float(prices.loc[election.election_date, 'close']) if election.election_date in prices.index else None,
                      election_source=election.source_url)
        events.append(record)
        monday = election.election_date - pd.Timedelta(days=election.election_date.dayofweek)
        scope = prices.loc[f'{election.year}-10-01':f'{election.year}-{end_md}']
        for candidate in scope.index:
            if candidate.dayofweek == 2 and not monday <= candidate < monday+pd.Timedelta(days=7):
                candidates.append(dict(year=int(election.year), **observation(prices, candidate)))
        if not any(c['year'] == election.year for c in candidates):
            raise ValueError(f'No comparison Wednesdays for {election.year}')
    return pd.DataFrame(events), pd.DataFrame(candidates), end_md


def compare(events, candidates, replications=10_000, seed=42):
    if replications < 2:
        raise ValueError('At least two replications required')
    rng = np.random.default_rng(seed)
    columns = []
    for year in events.year:
        group = candidates.loc[candidates.year == year, 'percentile'].to_numpy()
        if len(group) == 0:
            raise ValueError('Empty candidate stratum')
        columns.append(group[rng.integers(0, len(group), size=replications)])
    draws = np.column_stack(columns)
    actual = events.percentile.to_numpy()

    def statistics(observed, distribution):
        point = float(np.median(observed))
        center = float(np.median(distribution))
        count = int((distribution >= point).sum())
        return dict(actual_median=point, simulation_center=center, difference_pp=point-center,
                    simulation_ge_count=count, simulation_ge_fraction=count/replications,
                    simulation_q025=float(np.quantile(distribution, .025)),
                    simulation_q975=float(np.quantile(distribution, .975)))

    medians = np.median(draws, axis=1)
    summary = statistics(actual, medians)
    loo = []
    for i, year in enumerate(events.year):
        # Same per-year draws, recomputing the 13-year median for every replication.
        result = statistics(np.delete(actual, i), np.median(np.delete(draws, i, axis=1), axis=1))
        result.update(excluded_year=int(year),
                      fraction_change=result['simulation_ge_fraction']-summary['simulation_ge_fraction'],
                      difference_change_pp=result['difference_pp']-summary['difference_pp'])
        loo.append(result)
    # Define influence before looking at data: largest absolute tail-fraction change;
    # tie-break by absolute change in the observed-minus-comparison median difference.
    influence = max(loo, key=lambda x:(abs(x['fraction_change']), abs(x['difference_change_pp']), -x['excluded_year']))
    summary.update(replications=replications, seed=seed, influential_year=influence['excluded_year'],
                   influence_definition='Largest absolute change in simulation >= observed fraction; ties: absolute difference change, then earlier year',
                   loo_fraction_min=min(r['simulation_ge_fraction'] for r in loo),
                   loo_fraction_max=max(r['simulation_ge_fraction'] for r in loo))
    return summary, pd.DataFrame(loo), medians


def chart_all(study, medians, output):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.rcParams.update({'font.size':13, 'svg.fonttype':'none', 'figure.facecolor':'white',
                         'axes.facecolor':'white', 'axes.spines.top':False, 'axes.spines.right':False})
    output.mkdir(parents=True, exist_ok=True)
    events = pd.DataFrame(study['events'])
    current = events[events.year == 2026].iloc[0]

    def save(fig, name):
        fig.tight_layout()
        for ext in ('svg', 'png'):
            fig.savefig(output/f'{name}.{ext}', dpi=190, bbox_inches='tight', facecolor='white')
        plt.close(fig)

    fig, ax = plt.subplots(figsize=(5.8,4.6))
    baseline = [v['abs_return_pct'] for v in study['baseline_2026']]
    ax.hist(baseline, bins=15, color='#3b7f91', alpha=.8, label='Prior 60 valid returns')
    ax.axvline(current.abs_return_pct, color='#b24036', lw=2.5, label=f'2026 event: {current.abs_return_pct:.2f}%')
    ax.set(xlabel='Absolute daily return (%)', ylabel='Trading days', title='2026: size relative to recent moves')
    ax.legend(fontsize=10)
    save(fig, '01-2026-context')

    fig, ax = plt.subplots(figsize=(6.2,5.2))
    x = np.arange(len(events))
    for positive, color, marker, label in [(True,'#177184','^','Up'), (False,'#b24036','v','Down')]:
        mask = (events.return_pct >= 0).to_numpy() == positive
        ax.scatter(x[mask], events.percentile[mask], c=color, marker=marker, s=75, label=label)
    j = list(events.year).index(2026)
    ax.scatter([j], [current.percentile], s=240, facecolors='none', edgecolors='#111111', lw=2, label='2026')
    ax.axhline(study['summary']['actual_median'], color='#555555', ls='--', lw=1)
    ax.set(xticks=x, xticklabels=events.year.astype(str), ylim=(-3,103), yticks=[0,25,50,75,100],
           xlabel='Midterm election year', ylabel='Prior-60-return percentile', title='Post-election magnitude, 1974–2026')
    ax.tick_params(axis='x', labelrotation=90, labelsize=11)
    ax.legend(ncol=3, fontsize=10, loc='upper center', bbox_to_anchor=(.5,1.0))
    save(fig, '02-election-percentiles')

    fig, ax = plt.subplots(figsize=(5.8,4.6))
    ax.hist(medians, bins=np.arange(-.8334,101,1.6667), color='#3b7f91', alpha=.8)
    point = study['summary']['actual_median']
    ax.axvline(point, color='#b24036', lw=2.5, label=f'Election median: {point:.2f}')
    ax.set(xlabel='Median percentile (one Wednesday / year)', ylabel='Simulations',
           title='10,000 matched-Wednesday comparisons', xlim=(0,100))
    ax.legend(fontsize=10)
    save(fig, '03-comparison-medians')


def run(path, as_of='2026-11-06'):
    prices = load_prices(path, as_of)
    elections = load_elections(ROOT/'elections.csv')
    events, candidates, end_md = build_samples(prices, elections)
    summary, loo, medians = compare(events, candidates)
    current = events[events.year == 2026].iloc[0]
    day = pd.Timestamp(current.evaluation_date)
    i = prices.index.get_loc(day)
    baseline = prices.iloc[i-60:i].reset_index()
    baseline['date'] = baseline.date.dt.strftime('%Y-%m-%d')
    provenance = dict(series='NASDAQCOM', source_url=SOURCE, provider='Nasdaq, Inc. via FRED',
                      as_of=as_of, last_observation=str(prices.index.max().date()),
                      raw_sha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),
                      generated_at_utc=datetime.now(timezone.utc).isoformat(),
                      comparison_start_md='10-01', comparison_end_md=end_md,
                      comparison_rule='Observed Wednesdays, excluding Monday–Sunday election week; uniform month-day range across all 14 years',
                      numpy=np.__version__, pandas=pd.__version__, python=platform.python_version())
    download_manifest = ROOT/'data/raw/download.json'
    if download_manifest.exists():
        provenance['download'] = json.loads(download_manifest.read_text())
    study = dict(provenance=provenance, events=events.to_dict('records'),
                 candidates=candidates.to_dict('records'), candidate_counts={str(int(k)):int(v) for k,v in candidates.groupby('year').size().items()},
                 summary=summary, leave_one_out=loo.to_dict('records'), baseline_2026=baseline.to_dict('records'))
    OUT.mkdir(parents=True, exist_ok=True)
    events.to_csv(OUT/'elections.csv', index=False, float_format='%.12g')
    candidates.to_csv(OUT/'comparison-wednesdays.csv', index=False, float_format='%.12g')
    loo.to_csv(OUT/'leave-one-out.csv', index=False, float_format='%.12g')
    pd.DataFrame({'median_percentile':medians}).to_csv(OUT/'simulation-medians.csv', index=False, float_format='%.12g')
    (OUT/'study.json').write_text(json.dumps(study, ensure_ascii=False, indent=2, allow_nan=False)+'\n')
    chart_all(study, medians, CHARTS)
    logging.info('2026 return %.6f%%, percentile %.6f; median %.6f; comparison fraction %.4f',
                 current.return_pct, current.percentile, summary['actual_median'], summary['simulation_ge_fraction'])
    return study


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', default='2026-11-06')
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--csv', type=Path, default=ROOT/'data/raw/NASDAQCOM.csv')
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    if args.fetch:
        url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id=NASDAQCOM&cosd=1971-01-01&coed={args.as_of}'
        response = httpx.get(url, timeout=60, follow_redirects=True)
        response.raise_for_status()
        args.csv.parent.mkdir(parents=True, exist_ok=True)
        args.csv.write_bytes(response.content)
        manifest = dict(url=url, downloaded_at_utc=datetime.now(timezone.utc).isoformat(),
                        sha256=hashlib.sha256(response.content).hexdigest())
        (ROOT/'data/raw/download.json').write_text(json.dumps(manifest, indent=2)+'\n')
    run(args.csv, args.as_of)

if __name__ == '__main__':
    main()

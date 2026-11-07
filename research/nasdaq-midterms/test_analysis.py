"""Tests use retained real FRED data; small synthetic cases test missing dates and ties only."""
import csv
import json
from decimal import Decimal
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

import analyze

ROOT = Path(__file__).resolve().parent

@pytest.fixture(scope='module')
def prices():
    return analyze.load_prices(ROOT/'data/raw/NASDAQCOM.csv', '2026-11-06')

@pytest.fixture(scope='module')
def samples(prices):
    return analyze.build_samples(prices, analyze.load_elections(ROOT/'elections.csv'))


def test_all_fourteen_unique_midterms(samples):
    events, _, _ = samples
    assert events.year.tolist() == list(range(1974,2027,4))
    assert not events.year.duplicated().any()
    assert all(pd.to_datetime(events.election_date).dt.dayofweek == 1)


def test_each_baseline_has_exactly_60_prior_returns(prices, samples):
    events, candidates, _ = samples
    # Independently use labelled date filtering, not the production positional slice.
    for row in pd.concat([events,candidates]).itertuples():
        prior = prices[prices.index < pd.Timestamp(row.evaluation_date)].tail(60)
        assert len(prior)==60 and prior.return_pct.notna().all()
        assert prior.index[-1] < pd.Timestamp(row.evaluation_date)
        assert str(prior.index[0].date())==row.baseline_start
        assert str(prior.index[-1].date())==row.baseline_end
        expected = 100*sum(abs(v) <= row.abs_return_pct for v in prior.return_pct)/60
        assert expected==row.percentile
        assert row.baseline_n==60
    for e in events.itertuples():
        assert prices.index[prices.index>pd.Timestamp(e.election_date)][0]==pd.Timestamp(e.evaluation_date)


def test_2026_against_original_closes_with_decimal(samples):
    events, _, _ = samples
    with (ROOT/'data/raw/NASDAQCOM.csv').open() as stream:
        raw = {r['observation_date']:r['NASDAQCOM'] for r in csv.DictReader(stream)}
    e = events[events.year==2026].iloc[0]
    expected = (Decimal(raw[e.evaluation_date])/Decimal(raw[e.previous_close_date])-1)*100
    assert float(expected)==pytest.approx(e.return_pct,abs=1e-12)
    assert e.previous_close==float(raw[e.previous_close_date])
    assert e.evaluation_close==float(raw[e.evaluation_date])
    saved = pd.read_csv(analyze.OUT/'elections.csv')
    assert saved[saved.year==2026].return_pct.iloc[0]==pytest.approx(float(expected),abs=1e-10)


def test_candidates_share_range_and_exclude_election_week(samples):
    events,candidates,end_md=samples
    assert end_md=='11-05'
    for e in events.itertuples():
        group=candidates[candidates.year==e.year]
        assert len(group)>0
        monday=pd.Timestamp(e.election_date)-pd.Timedelta(days=pd.Timestamp(e.election_date).dayofweek)
        for date in pd.to_datetime(group.evaluation_date):
            assert date.dayofweek==2
            assert '10-01'<=date.strftime('%m-%d')<=end_md
            assert not monday<=date<monday+pd.Timedelta(days=7)


def test_seed_reproduction_and_leave_one_out(samples):
    events,candidates,_=samples
    first,loo,draws=analyze.compare(events,candidates)
    second,loo2,draws2=analyze.compare(events,candidates)
    assert first==second
    np.testing.assert_array_equal(draws,draws2)
    pd.testing.assert_frame_equal(loo,loo2)
    assert len(draws)==10000 and len(loo)==14
    # Independent reconstruction verifies shared year draws and each 13-year median.
    rng=np.random.default_rng(42)
    matrix=np.empty((10000,14))
    for j,year in enumerate(events.year):
        values=candidates[candidates.year==year].percentile.to_numpy()
        matrix[:,j]=rng.choice(values,10000,replace=True)
    np.testing.assert_array_equal(draws,np.median(matrix,axis=1))
    for j,row in enumerate(loo.itertuples()):
        mask=np.arange(14)!=j
        actual=np.median(events.percentile.to_numpy()[mask])
        expected=np.mean(np.median(matrix[:,mask],axis=1)>=actual)
        assert row.actual_median==actual
        assert row.simulation_ge_fraction==expected


def test_missing_prices_not_filled_and_holiday_gap(tmp_path):
    dates=pd.bdate_range('2024-01-01',periods=100)
    frame=pd.DataFrame({'observation_date':dates.strftime('%Y-%m-%d'),'NASDAQCOM':100+np.arange(100,dtype=float)})
    frame['NASDAQCOM']=frame['NASDAQCOM'].astype(object)
    frame.loc[80,'NASDAQCOM']='.'
    path=tmp_path/'prices.csv'; frame.to_csv(path,index=False)
    p=analyze.load_prices(path,'2024-12-31')
    assert dates[80] not in p.index
    row=analyze.observation(p,dates[81])
    assert row['previous_close_date']==str(dates[79].date())
    assert row['calendar_gap_days']>1
    assert row['return_pct']==pytest.approx((181/179-1)*100)


def test_ties_are_included():
    dates=pd.bdate_range('2020-01-01',periods=100)
    prices=pd.DataFrame({'close':100.,'return_pct':0.,'abs_return_pct':0.},index=dates)
    row=analyze.observation(prices,dates[-1])
    assert row['equal_count']==60 and row['less_count']==0 and row['percentile']==100


def test_snapshot_artifacts_and_single_result_source(samples):
    study=json.loads((analyze.OUT/'study.json').read_text())
    events,candidates,_=samples
    np.testing.assert_allclose([r['percentile'] for r in study['events']],events.percentile)
    assert sum(study['candidate_counts'].values())==len(candidates)
    assert len(study['baseline_2026'])==60
    for name in ('01-2026-context','02-election-percentiles','03-comparison-medians'):
        for ext in ('png','svg'):
            assert (analyze.CHARTS/f'{name}.{ext}').stat().st_size>1000
    assert '<text' in (analyze.CHARTS/'01-2026-context.svg').read_text()


def test_invalid_input_fails(tmp_path):
    path=tmp_path/'bad.csv'
    path.write_text('date,QQQ\n2026-11-04,100\n')
    with pytest.raises(ValueError): analyze.load_prices(path,'2026-11-06')
    with pytest.raises(ValueError): analyze.common_end(pd.DataFrame(index=pd.to_datetime(['2025-11-05'])))


def test_missing_election_close_is_flagged(prices):
    shortened=prices.drop(pd.Timestamp('1974-11-05')).copy()
    shortened['return_pct']=shortened.close.pct_change(fill_method=None)*100
    shortened['abs_return_pct']=shortened.return_pct.abs()
    events,_,_=analyze.build_samples(shortened,analyze.load_elections(ROOT/'elections.csv'))
    event=events[events.year==1974].iloc[0]
    assert not event.election_close_observed
    assert event.previous_close_date=='1974-11-04'
    assert event.evaluation_date=='1974-11-06'
    assert event.calendar_gap_days==2

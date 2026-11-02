import argparse
import json
import logging
import platform
from datetime import date
from pathlib import Path
import numpy as np
import pandas as pd
from .data import Ecos, prepare, spreads, load_csv
from .bootstrap import bootstrap, summarize, descriptive, benchmark
from .finance import scenarios
from .charts import finance_charts, market_charts

ROOT = Path(__file__).resolve().parents[1]
FIGURES = ROOT.parents[1]/'public/images/blog/korean-rates'

def main():
    parser=argparse.ArgumentParser(description='Korean rates research; no synthetic market fallback')
    inputs=parser.add_mutually_exclusive_group()
    inputs.add_argument('--fetch',action='store_true')
    inputs.add_argument('--csv',type=Path,help='User-supplied CSV: date, company rate, CD rate, policy rate')
    parser.add_argument('--end',default=date.today().strftime('%Y%m%d'))
    inputs.add_argument('--cached',action='store_true',help='Use previously downloaded raw ECOS observations')
    args=parser.parse_args()
    logging.basicConfig(level=logging.INFO,format='%(levelname)s %(message)s')
    out=ROOT/'results'; out.mkdir(exist_ok=True)
    rows=scenarios(); rows.to_csv(out/'financing.csv',index=False)
    finance_charts(rows,FIGURES)
    # Explicit synthetic benchmark, never included in market estimates.
    x=np.random.default_rng(42).normal(size=(500,4))
    measured=benchmark(x)
    measured['input']='Synthetic N(0,1), seed 42; engineering benchmark only'
    measured['python']=platform.python_version()
    measured['numpy']=np.__version__
    measured['platform']=platform.platform()
    (out/'benchmark.json').write_text(json.dumps(measured,indent=2))
    if not args.fetch and not args.cached and not args.csv:
        logging.info('Financing and synthetic benchmark complete. Market analysis requires --fetch or --cached.')
        return
    if args.csv:
        rates,quality=load_csv(args.csv,ROOT)
    elif args.fetch:
        raw=Ecos().collect(ROOT,args.end)
    else:
        raw={}
        for name in ('corporate','government','cd','policy'):
            records=pd.read_json(ROOT/f'data/raw/{name}.json',dtype={'TIME':str})
            raw[name]=pd.DataFrame({'date':pd.to_datetime(records.TIME,format='%Y%m%d'),name:pd.to_numeric(records.DATA_VALUE,errors='coerce')})
    if not args.csv:
        rates,quality=prepare(raw)
    frame=spreads(rates)
    windows=(None,) if args.csv else (None,5,3)
    (out/'data-quality.json').write_text(json.dumps(quality,indent=2))
    processed=ROOT/'data/processed'; processed.mkdir(exist_ok=True)
    rates.to_csv(processed/'rates-daily.csv'); frame.to_csv(processed/'spreads-daily.csv')
    monthly=rates.resample('ME').mean().dropna()
    monthly.to_csv(processed/'rates-monthly.csv'); spreads(monthly).to_csv(processed/'spreads-monthly.csv')
    results=[]; full_comparison=None; selected=None
    for frequency, observations, blocks in [('daily',frame,[1,5,20,60]),('monthly',spreads(monthly),[1,3,6,12])]:
        descriptive(observations, windows=windows).to_csv(out/f'descriptive-{frequency}.csv',index=False)
        for years in windows:
            subset=observations if years is None else observations[observations.index>observations.index.max()-pd.DateOffset(years=years)]
            tables=[]
            for block in blocks:
                if block>len(subset): continue
                logging.info('%s %s block=%s n=%s',frequency,years or 'full',block,len(subset))
                samples=bootstrap(subset.to_numpy(),block=block)
                method='IID' if block==1 else f'MBB-{block}'
                summary=summarize(subset,samples,subset.columns)
                summary['method']=method; summary['window']='full' if years is None else f'{years}y'
                summary['frequency']=frequency; summary['n']=len(subset)
                summary['start']=str(subset.index.min().date()); summary['end']=str(subset.index.max().date())
                results.append(summary); tables.append(summary)
                if frequency=='daily' and years is None and block==20:
                    selected=samples; np.save(out/'bootstrap-daily-mbb20.npy',samples)
            if frequency=='daily' and years is None: full_comparison=pd.concat(tables)
    pd.concat(results).to_csv(out/'bootstrap-summary.csv',index=False)
    market_charts(rates,frame,selected,full_comparison,FIGURES)
    # Observed 60-common-date widening is distinct from a bootstrap CI.
    stress_label='D' if 'D' in frame else 'A'
    widening=frame[stress_label].diff(60).dropna(); end=widening.idxmax(); start=frame.index[frame.index.get_loc(end)-60]
    stress={'spread':stress_label, 'interpretation':'Same-maturity credit spread' if stress_label=='D' else 'Corporate minus CD funding spread; includes maturity effects', 'start':str(start.date()),'end':str(end.date()),'observation_lag':60,
            'spread_start_bp':float(frame[stress_label].loc[start]),'spread_end_bp':float(frame[stress_label].loc[end]),
            'widening_bp':float(widening.loc[end]),'note':'Historical sensitivity anchor; not a forecast or causal attribution'}
    (out/'historical-stress.json').write_text(json.dumps(stress,indent=2))
    logging.info('Market research complete. Review generated tables before updating article conclusions.')

if __name__=='__main__': main()

import numpy as np
import pandas as pd
import pytest
import httpx
from krates.data import Ecos, EcosError, prepare, spreads
from krates.bootstrap import bootstrap, reference, summarize
from krates.finance import scenario, Project, scenarios
from krates.charts import finance_charts


def test_spreads_and_units():
    rates=pd.DataFrame({'corporate':[5.], 'government':[3.], 'cd':[4.], 'policy':[3.5]})
    s=spreads(rates)
    np.testing.assert_allclose(s.iloc[0],[100,50,150,200])
    assert s.C.iloc[0]==s.A.iloc[0]+s.B.iloc[0]

def test_asof_no_lookahead_and_missing():
    series={k:pd.DataFrame({'date':['2010-01-05','2010-01-04','2010-01-04'],k:[4,3,3]}) for k in ('corporate','government','cd')}
    series['policy']=pd.DataFrame({'date':['2009-12-31','2010-01-05'], 'policy':[2,2.5]})
    rates,quality=prepare(series)
    assert list(rates.policy)==[2,2.5]
    assert rates.index.is_monotonic_increasing
    assert quality['retained_common_dates']==2
    series['cd'].loc[2,'cd']=8
    with pytest.raises(ValueError,match='Conflicting'): prepare(series)

def test_api_errors():
    with pytest.raises(EcosError): Ecos('').request('bad',1,10)

def test_api_pagination_and_redaction():
    def respond(request):
        start=int(request.url.path.split('/')[6])
        return httpx.Response(200,json={'StatisticItemList':{'list_total_count':2,'row':[{'id':start}]}})
    client=httpx.Client(transport=httpx.MockTransport(respond))
    assert len(Ecos('test-key',client).pages('StatisticItemList','table'))==2
    bad=httpx.Client(transport=httpx.MockTransport(lambda r:httpx.Response(200,json={'RESULT':{'CODE':'ERROR-100'}})))
    with pytest.raises(EcosError,match='ERROR-100'): Ecos('secret',bad).pages('StatisticSearch','x')

def test_bootstrap_10000_reproducibility_joint_identity():
    x=np.arange(80.).reshape(20,4); x[:,2]=x[:,0]+x[:,1]
    samples=bootstrap(x)
    assert samples.shape==(10000,4)
    np.testing.assert_array_equal(samples,bootstrap(x,chunk=13))
    np.testing.assert_allclose(samples[:,2],samples[:,0]+samples[:,1])
    table=summarize(x,samples,list('ABCD'))
    np.testing.assert_allclose(table.ci_lower,np.quantile(samples,.025,axis=0))
    np.testing.assert_allclose(table.standard_error,samples.std(axis=0,ddof=1))

@pytest.mark.parametrize('block',[1,5,7,20])
def test_block_structure_matches_explicit_reference(block):
    x=np.random.default_rng(2).normal(size=(20,4))
    np.testing.assert_allclose(bootstrap(x,replications=30,block=block),reference(x,replications=30,block=block),atol=1e-12)

@pytest.mark.parametrize('kwargs',[{'block':0},{'block':21},{'chunk':0},{'replications':0}])
def test_invalid_bootstrap(kwargs):
    with pytest.raises(ValueError): bootstrap(np.ones((20,4)),**kwargs)

def test_finance():
    assert [scenario(s)['annual_interest_krw_bn'] for s in (0,50,150)]==[3,3.3,3.9]
    assert scenario(150,100,.5)['annual_interest_krw_bn']==4.2
    assert scenario(0,100,0)['rate_pct']==5
    assert scenario(0,100,.5)['margin_increase_bp']==50
    assert scenario()['dscr']==1.2
    result=scenario(project=Project(asset_value=80))
    assert result['ltc']==.6 and result['ltv']==.75
    with pytest.raises(ValueError): scenario(pass_through=2)
    with pytest.raises(ValueError): Project(cfads=-1)

def test_charts(tmp_path):
    finance_charts(scenarios(),tmp_path)
    assert len(list(tmp_path.glob('*.png')))==3
    assert len(list(tmp_path.glob('*.svg')))==3
    assert '<text' in (tmp_path/'07-debt-service.svg').read_text()

def test_market_figures_with_explicit_synthetic_input(tmp_path):
    from krates.charts import market_charts
    from krates.bootstrap import descriptive
    dates=pd.bdate_range('2020-01-01',periods=80)
    rng=np.random.default_rng(42)
    rates=pd.DataFrame(3+rng.normal(0,.1,(80,4)),index=dates,columns=['corporate','government','cd','policy'])
    frame=spreads(rates)
    samples=bootstrap(frame,block=20)
    tables=[]
    for block in (1,5,20,60):
        table=summarize(frame,bootstrap(frame,block=block),frame.columns)
        table['method']='IID' if block==1 else f'MBB-{block}'
        tables.append(table)
    market_charts(rates,frame,samples,pd.concat(tables),tmp_path)
    assert len(list(tmp_path.glob('*.svg')))==4
    assert len(list(tmp_path.glob('*.png')))==4
    assert set(descriptive(frame).window)=={'full','5y','3y'}

def test_supplied_csv_import_and_three_spreads(tmp_path):
    from pathlib import Path
    from krates.data import load_csv
    source=Path(__file__).resolve().parents[1]/'data/raw/sample-2024-2025.csv'
    rates,quality=load_csv(source,tmp_path)
    assert len(rates)==488
    assert quality['duplicate_dates']==0
    assert quality['missing_by_column']['corporate']==0
    assert source.read_bytes()==(tmp_path/'data/raw/sample-2024-2025.csv').read_bytes()
    frame=spreads(rates)
    assert list(frame)==list('ABC')
    np.testing.assert_allclose(frame.iloc[0],[15,33,48])
    assert len(rates.resample('ME').mean())==24
    samples=bootstrap(frame,block=20)
    assert samples.shape==(10000,3)
    np.testing.assert_allclose(samples[:,2],samples[:,0]+samples[:,1],atol=1e-10)

def test_three_spread_figures(tmp_path):
    from pathlib import Path
    from krates.data import load_csv
    from krates.charts import market_charts
    source=Path(__file__).resolve().parents[1]/'data/raw/sample-2024-2025.csv'
    rates,_=load_csv(source,tmp_path)
    frame=spreads(rates)
    samples=bootstrap(frame,block=20)
    summary=summarize(frame,samples,frame.columns)
    summary['method']='MBB-20'
    market_charts(rates,frame,samples,summary,tmp_path/'figures')
    assert len(list((tmp_path/'figures').glob('*.svg')))==4
    svg=(tmp_path/'figures/03-bootstrap-distributions.svg').read_text()
    assert 'D unavailable' in svg
    assert 'Bank of Korea ECOS' not in svg

def test_csv_rejects_invalid_rates(tmp_path):
    from krates.data import load_csv
    path=tmp_path/'bad.csv'
    path.write_text('date,회사채금리,CD금리,기준금리\n2024-01-02,NaN,3,2\n')
    with pytest.raises(ValueError): load_csv(path,tmp_path)

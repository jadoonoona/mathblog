"""Discover codes using official metadata; never infer item codes."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import httpx
import numpy as np
import pandas as pd

BASE = 'https://ecos.bok.or.kr/api'
TABLES = {'market': '817Y002', 'policy': '722Y001'}
NAMES = {'corporate': '회사채(3년, AA-)', 'government': '국고채(3년)',
         'cd': 'CD(91일)', 'policy': '한국은행 기준금리'}

class EcosError(RuntimeError):
    pass

class Ecos:
    def __init__(self, key=None, client=None):
        self.key = key or os.environ.get('ECOS_API_KEY')
        if not self.key:
            raise EcosError('ECOS_API_KEY is required; no synthetic market data fallback.')
        self.client = client or httpx.Client(timeout=45)

    def request(self, service, start, end, *args):
        # Never include authenticated URLs in errors or logs.
        url = '/'.join(map(str, [BASE, service, self.key, 'json', 'kr', start, end, *args]))
        try:
            response = self.client.get(url)
            response.raise_for_status()
            body = response.json()
        except (httpx.HTTPError, ValueError):
            raise EcosError('ECOS request failed (URL and key redacted)') from None
        if service not in body:
            raise EcosError('ECOS returned ' + str(body.get('RESULT', {}).get('CODE', 'invalid response')))
        return body[service]

    def pages(self, service, *args):
        rows = []
        start = 1
        while True:
            part = self.request(service, start, start + 999, *args)
            batch = part.get('row', [])
            if not batch:
                raise EcosError('Empty page before advertised total')
            rows.extend(batch)
            if len(rows) >= int(part['list_total_count']):
                return rows
            start += len(batch)

    def collect(self, root, end):
        root = Path(root)
        raw = root / 'data/raw'
        raw.mkdir(parents=True, exist_ok=True)
        metadata = {kind: self.pages('StatisticItemList', table) for kind, table in TABLES.items()}
        (raw / 'metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
        series, manifest = {}, {'downloaded_at_utc': datetime.now(timezone.utc).isoformat(),
                                'source': BASE, 'requested_start': '20100101', 'requested_end': end, 'series': {}}
        for name, label in NAMES.items():
            kind = 'policy' if name == 'policy' else 'market'
            matches = [r for r in metadata[kind] if r['ITEM_NAME'].replace(' ', '') == label.replace(' ', '')
                       and r['CYCLE'] == 'D' and r['UNIT_NAME'] in ('연%', '%')]
            if len(matches) != 1:
                raise EcosError(f'Expected one verified daily percentage series for {label}; inspect metadata.json')
            meta = matches[0]
            if meta['START_TIME'] > '20100101':
                raise EcosError(f'{label} does not cover requested start')
            rows = self.pages('StatisticSearch', TABLES[kind], 'D', '20091201' if name == 'policy' else '20100101',
                              min(end, meta['END_TIME']), meta['ITEM_CODE'])
            (raw / f'{name}.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
            frame = pd.DataFrame(rows)
            series[name] = pd.DataFrame({'date': pd.to_datetime(frame.TIME, format='%Y%m%d'),
                                         name: pd.to_numeric(frame.DATA_VALUE, errors='coerce')})
            manifest['series'][name] = meta
        (raw / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        return series

def normalize(frame, name):
    frame = frame[['date', name]].copy()
    frame['date'] = pd.to_datetime(frame.date)
    frame[name] = pd.to_numeric(frame[name], errors='coerce')
    if frame.date.isna().any():
        raise ValueError('Invalid dates')
    if frame.groupby('date')[name].nunique().gt(1).any():
        raise ValueError('Conflicting duplicate observations')
    return frame.drop_duplicates('date').sort_values('date')

def prepare(series):
    clean = {name: normalize(frame, name) for name, frame in series.items()}
    market = clean['corporate'].merge(clean['government'], on='date', how='outer').merge(clean['cd'], on='date', how='outer').sort_values('date')
    # Backward as-of only: policy information available on/before market date.
    policy = clean['policy'].dropna(subset=['policy'])
    merged = pd.merge_asof(market, policy, on='date', direction='backward')
    quality = {'union_market_dates': len(merged), 'missing_by_column': merged.isna().sum().to_dict(),
               'weekend_rows': int((merged.date.dt.dayofweek >= 5).sum())}
    merged = merged[(merged.date >= '2010-01-01') & (merged.date.dt.dayofweek < 5)].dropna()
    if len(merged) < 2 or not np.isfinite(merged.drop(columns='date')).all().all():
        raise ValueError('Insufficient finite common observations')
    quality['retained_common_dates'] = len(merged)
    return merged.set_index('date'), quality

def spreads(rates):
    out = pd.DataFrame(index=rates.index)
    out['A'] = (rates.corporate - rates.cd) * 100
    out['B'] = (rates.cd - rates.policy) * 100
    out['C'] = (rates.corporate - rates.policy) * 100
    if 'government' in rates:
        out['D'] = (rates.corporate - rates.government) * 100
    if not np.allclose(out.C, out.A + out.B):
        raise ValueError('Spread identity failed')
    return out


def load_csv(path, root):
    """Preserve supplied bytes and rebuild spreads from rates, ignoring derived columns."""
    import csv
    import hashlib
    import io
    import shutil
    path = Path(path)
    content = path.read_bytes()
    records = list(csv.reader(io.StringIO(content.decode('utf-8-sig'))))
    header = records[0]
    required = ['date', '회사채금리', 'CD금리', '기준금리']
    if header[:4] != required or any(len(row) != len(header) for row in records[1:]):
        raise ValueError('Unexpected CSV schema')
    frame = pd.DataFrame([row[:4] for row in records[1:]], columns=['date','corporate','cd','policy'])
    frame['date'] = pd.to_datetime(frame.date, format='%Y-%m-%d', errors='raise')
    for name in ('corporate','cd','policy'):
        frame[name] = pd.to_numeric(frame[name], errors='raise')
    if not np.isfinite(frame.drop(columns='date')).all().all():
        raise ValueError('Non-finite CSV rates')
    if frame.groupby('date')[['corporate','cd','policy']].nunique().gt(1).any().any():
        raise ValueError('Conflicting CSV duplicate dates')
    raw = Path(root)/'data/raw'
    raw.mkdir(parents=True, exist_ok=True)
    destination = raw/'sample-2024-2025.csv'
    if path.resolve() != destination.resolve():
        shutil.copyfile(path, destination)
    duplicates = int(frame.date.duplicated().sum())
    weekends = int((frame.date.dt.dayofweek >= 5).sum())
    rates = frame.drop_duplicates('date').sort_values('date')
    rates = rates[rates.date.dt.dayofweek < 5].set_index('date')
    quality = {'input_rows':len(frame), 'duplicate_dates':duplicates, 'weekend_rows':weekends,
               'retained_common_dates':len(rates), 'missing_by_column':frame.isna().sum().to_dict(),
               'source':'User-provided educational CSV; original provider, corporate rating and maturities unverified',
               'sha256':hashlib.sha256(content).hexdigest(), 'original_filename':path.name,
               'imported_at_utc':datetime.now(timezone.utc).isoformat(),
               'original_columns':header, 'derived_columns':'Ignored; duplicated/mislabeled headings; rebuilt from three rate columns',
               'unavailable':['government yield','Spread D'],
               'policy_alignment':'Same-row supplied policy value; effective-date correctness not externally verified'}
    (raw/'csv-manifest.json').write_text(json.dumps(quality,ensure_ascii=False,indent=2))
    return rates, quality

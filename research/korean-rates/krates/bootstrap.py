"""Joint-date IID and non-circular moving-block bootstrap of historical means."""
import time
import tracemalloc
import numpy as np
import pandas as pd
from scipy.stats import skew, kurtosis

def bootstrap(values, replications=10_000, block=1, seed=42, chunk=64):
    x = np.asarray(values, dtype=np.float64)
    if x.ndim != 2 or len(x) < 2 or not np.isfinite(x).all():
        raise ValueError('Expected finite n by p observations')
    n, p = x.shape
    if not 1 <= block <= n or replications < 2 or chunk < 1:
        raise ValueError('Invalid bootstrap configuration')
    rng = np.random.default_rng(seed)
    result = np.empty((replications, p))
    # Prefix sums avoid materializing a replication x n x p tensor for MBB.
    prefix = np.vstack([np.zeros(p), np.cumsum(x, axis=0)])
    full, remainder = divmod(n, block)
    blocks = full + bool(remainder)
    for start in range(0, replications, chunk):
        count = min(chunk, replications - start)
        indices = rng.integers(0, n - block + 1, size=(count, blocks))
        lengths = np.full(blocks, block)
        if remainder:
            lengths[-1] = remainder
        result[start:start+count] = (prefix[indices + lengths] - prefix[indices]).sum(axis=1) / n
    return result

def reference(values, replications=10_000, block=1, seed=42):
    x = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)
    n = len(x)
    result = []
    for _ in range(replications):
        starts = rng.integers(0, n-block+1, size=(n+block-1)//block)
        rows = [x[j] for start in starts for j in range(start, start+block)][:n]
        result.append([sum(row[k] for row in rows)/n for k in range(x.shape[1])])
    return np.array(result)

def summarize(values, samples, labels):
    point = np.asarray(values).mean(axis=0)
    low, high = np.quantile(samples, [.025, .975], axis=0)
    return pd.DataFrame({'spread': labels, 'historical_mean': point,
        'bootstrap_mean': samples.mean(axis=0), 'standard_error': samples.std(axis=0, ddof=1),
        'bias': samples.mean(axis=0)-point, 'ci_lower': low, 'ci_upper': high,
        'ci_width': high-low, 'bootstrap_skewness': skew(samples, axis=0, bias=False),
        'bootstrap_excess_kurtosis': kurtosis(samples, axis=0, bias=False)})

def descriptive(frame, windows=(None, 5, 3)):
    rows = []
    for window in windows:
        subset = frame if window is None else frame[frame.index > frame.index.max()-pd.DateOffset(years=window)]
        for name, s in subset.items():
            rows.append(dict(window='full' if window is None else f'{window}y', spread=name, n=len(s),
                mean=s.mean(), median=s.median(), std=s.std(), minimum=s.min(), maximum=s.max(),
                p05=s.quantile(.05), p95=s.quantile(.95), skewness=s.skew(),
                excess_kurtosis=s.kurt(), autocorrelation_lag1=s.autocorr()))
    return pd.DataFrame(rows)

def benchmark(x, replications=300):
    results, arrays = {}, []
    for label, fn in [('naive_python', reference), ('numpy_chunked', bootstrap)]:
        tracemalloc.start()
        start = time.perf_counter()
        arrays.append(fn(x, replications=replications))
        elapsed = time.perf_counter()-start
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        results[label] = dict(seconds=elapsed, peak_traced_bytes=peak)
    results['max_absolute_difference'] = float(np.max(np.abs(arrays[0]-arrays[1])))
    results['speedup'] = results['naive_python']['seconds']/results['numpy_chunked']['seconds']
    results['replications'] = replications
    results['shape'] = list(np.shape(x))
    results['memory_note'] = 'tracemalloc peak allocation, not process RSS; timings include tracing overhead'
    return results

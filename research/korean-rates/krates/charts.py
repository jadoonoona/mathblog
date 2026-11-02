from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from .finance import scenario

COLORS = ['#19778a', '#ab640f', '#70579c', '#b5374a']
plt.rcParams.update({'svg.fonttype': 'none', 'font.family': 'DejaVu Sans',
                     'figure.facecolor': 'white', 'axes.facecolor': 'white', 'font.size': 10})

def save(fig, directory, name, source):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    fig.text(.02,.015, source, fontsize=8, color='#555555')
    fig.tight_layout(rect=(0,.055,1,.95))
    for ext in ('png','svg'):
        fig.savefig(directory/f'{name}.{ext}', dpi=170, facecolor='white')
    plt.close(fig)

def finance_charts(rows, directory):
    refs = np.array([0,50,100,150,200])
    margins = np.array([0,25,50,75,100])
    grid = np.array([[scenario(r,c,1)['annual_interest_krw_bn'] for r in refs] for c in margins])
    fig, axes = plt.subplots(1,2,figsize=(12,4.6))
    for ax, data, title in zip(axes,[grid,grid-3],['Annual interest (KRW bn)','Increment vs base (KRW bn)']):
        sns.heatmap(data,annot=True,fmt='.2f',xticklabels=refs,yticklabels=margins,ax=ax,cmap='YlOrRd')
        ax.set(xlabel='Reference shock (bp)',ylabel='Effective credit margin shock (bp)',title=title)
    save(fig,directory,'05-financing-heatmap','Hypothetical assumptions: KRW 60bn constant debt; 5% base loan rate; simple annual interest.')
    fig, ax = plt.subplots(figsize=(8,4.5))
    subset = rows.iloc[:4]
    bars = ax.bar(subset.scenario,subset.annual_interest_krw_bn,color=COLORS)
    ax.bar_label(bars,labels=[f'{v:.2f} (+{p:.0f}%)' for v,p in zip(subset.annual_interest_krw_bn,subset.increase_pct)])
    ax.set(ylabel='Annual interest (KRW bn)',ylim=(0,5.5),title='Financing cost under explicit stress scenarios')
    save(fig,directory,'06-financing-scenarios','Combined = +150bp reference + 100bp credit widening x 50% pass-through. Hypothetical, not a forecast.')
    shocks = np.arange(0,401,25)
    fig, ax = plt.subplots(figsize=(8,4.5))
    ax.plot(5+shocks/100,[scenario(s)['dscr'] for s in shocks],color=COLORS[0])
    ax.axhline(1,color=COLORS[3],linestyle='--',label='DSCR = 1.0')
    ax.set(xlabel='Loan rate (%)',ylabel='DSCR (x)',title='Separate stabilized operating asset: debt service sensitivity')
    ax.legend()
    save(fig,directory,'07-debt-service','Assumptions: CFADS KRW 6bn; annual principal KRW 2bn; debt KRW 60bn. Excludes balloon at refinancing.')

def market_charts(rates, frame, distributions, comparisons, directory):
    provider = 'Bank of Korea ECOS' if 'D' in frame else 'User-supplied educational CSV (original provider unverified)'
    source = f'Source: {provider} | {rates.index.min().date()} to {rates.index.max().date()} | common observed dates'
    fig, ax = plt.subplots(figsize=(11,5))
    for (name,s),color in zip(rates.items(),COLORS):
        ax.plot(s.index,s,color=color,label=name,drawstyle='steps-post' if name=='policy' else 'default',lw=1.1)
    ax.set(title='Korean interest rate trends',ylabel='Interest rate (%)')
    ax.legend(ncol=4)
    save(fig,directory,'01-interest-rates',source)
    fig,axes=plt.subplots(2,1,figsize=(11,7),sharex=True)
    for (label, values), color in zip(frame.items(), COLORS):
        axes[0].plot(frame.index, values, color=color, lw=1, label=label)
    focus = 'D' if 'D' in frame else 'A'
    axes[1].plot(frame.index,frame[focus],color=COLORS[3],label='D: corporate minus government (3Y)' if focus=='D' else 'A: corporate minus CD (not same-maturity credit spread)')
    for ax in axes:
        ax.axhline(0,color='gray',lw=.7); ax.set_ylabel('Spread (bp)'); ax.legend()
    peak=frame[focus].idxmax()
    axes[1].annotate(f'Observed peak {frame[focus].max():.1f}bp',xy=(peak,frame[focus].max()),xytext=(12,-20),textcoords='offset points')
    fig.suptitle('Historical funding spreads' + (' and same-maturity credit spread' if focus=='D' else ' | D unavailable'))
    save(fig,directory,'02-historical-spreads',source)
    fig,axes=plt.subplots(2,2,figsize=(11,7))
    for j,(ax,label) in enumerate(zip(axes.flat,frame.columns)):
        values=distributions[:,j]; low,high=np.quantile(values,[.025,.975]); mean=values.mean()
        ax.hist(values,bins=50,density=True,color=COLORS[j],alpha=.65)
        ax.axvspan(low,high,alpha=.12,color=COLORS[j])
        for v in (low,mean,high): ax.axvline(v,color=COLORS[j],ls='--')
        ax.set(title=f'{label}: mean {mean:.2f}; CI [{low:.2f}, {high:.2f}]',xlabel='Bootstrap sample mean (bp)',ylabel='Probability density')
    if len(frame.columns)<4:
        axes.flat[3].axis('off')
        axes.flat[3].text(.1,.5,'D unavailable: government yield not supplied',wrap=True)
    fig.suptitle('Moving block bootstrap (20 observations): 10,000 historical means')
    save(fig,directory,'03-bootstrap-distributions',source+' | historical mean CI, not a prediction interval')
    fig,ax=plt.subplots(figsize=(10,6))
    methods=comparisons.method.unique()
    for k,method in enumerate(methods):
        table=comparisons[comparisons.method==method]
        y=np.arange(len(frame.columns))+k*.16
        mid=(table.ci_lower+table.ci_upper)/2
        ax.errorbar(mid,y,xerr=(table.ci_upper-table.ci_lower)/2,fmt='none',capsize=3,label=method)
        ax.scatter(table.historical_mean,y,s=12)
    ax.set(yticks=np.arange(len(frame.columns))+.24,yticklabels=list(frame.columns),xlabel='Historical mean and 95% CI (bp)',title='IID vs MBB: block-length sensitivity')
    ax.legend()
    save(fig,directory,'04-bootstrap-comparison',source)

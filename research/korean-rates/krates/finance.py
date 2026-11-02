"""Hypothetical KRW-billion financing model; rates in percent and shocks in bp."""
from dataclasses import dataclass
import numpy as np
import pandas as pd

@dataclass(frozen=True)
class Project:
    cost: float = 100
    debt: float = 60
    base_rate: float = 5
    reserve: float = 6
    asset_value: float = 100
    cfads: float = 6  # separate stabilized operating asset, NOT development PF
    annual_principal: float = 2

    def __post_init__(self):
        if min(self.cost, self.asset_value) <= 0 or min(self.debt, self.reserve, self.cfads, self.annual_principal) < 0:
            raise ValueError('Invalid project assumptions')

def scenario(reference_bp=0, credit_bp=0, pass_through=.5, project=Project()):
    if not 0 <= pass_through <= 1:
        raise ValueError('Pass-through must be between zero and one')
    rate = project.base_rate + (reference_bp + credit_bp*pass_through)/100
    interest = project.debt*rate/100
    service = interest+project.annual_principal
    if interest <= 0 or service <= 0:
        raise ValueError('Positive debt service required')
    return dict(reference_bp=reference_bp, credit_bp=credit_bp, pass_through=pass_through,
        margin_increase_bp=credit_bp*pass_through, rate_pct=rate, annual_interest_krw_bn=interest,
        incremental_interest_krw_bn=interest-project.debt*project.base_rate/100,
        increase_pct=(rate/project.base_rate-1)*100, ltc=project.debt/project.cost,
        ltv=project.debt/project.asset_value, interest_coverage=project.cfads/interest,
        dscr=project.cfads/service, reserve_runway_months=project.reserve/interest*12)

def scenarios():
    rows = []
    for name, ref, credit, pt in [('Base',0,0,0), ('Moderate',50,0,0),
                                 ('Severe',150,0,0), ('Combined',150,100,.5)]:
        rows.append(dict(scenario=name, **scenario(ref,credit,pt)))
    for credit in (50,100):
        for pt in (0,.5,1):
            rows.append(dict(scenario=f'Credit +{credit} / {pt:.0%}', **scenario(0,credit,pt)))
    return pd.DataFrame(rows)

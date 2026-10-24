import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateNPV,calculateIRR,calculatePayback,forecastInvestment,DEFAULT_INVESTMENT as P} from '../src/lib/hotel-investment.ts';
import {DEFAULT_CURRENT as A,DEFAULT_PROJECTED as B} from '../src/lib/hotel-model.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('known NPV, IRR and IRR status cases',()=>{
 close(calculateNPV([-100,110],.1),0);close(calculateNPV([-100,60,60],0),20);
 close(calculateIRR([-100,110]).value!,.1);close(calculateIRR([-100,50]).value!,-.5);
 assert.equal(calculateIRR([-100,-10]).status,'none');assert.equal(calculateIRR([0,10]).status,'none');assert.equal(calculateIRR([-100,230,-132]).status,'ambiguous');
});
test('simple and discounted payback interpolate first recovery',()=>{
 close(calculatePayback([-100,60,60])!,1+40/60);assert.equal(calculatePayback([-100,10]),null);assert.equal(calculatePayback([0,10]),0);
 const m=forecastInvestment(A,B,P);assert.ok(m.discountedPayback!>m.payback!);
});
test('default forecast and waterfall reconcile',()=>{
 const m=forecastInvestment(A,B,P);
 close(m.years[0].withRenovation.available,65700);
 for(const y of m.years){close(y.withRenovation.ebitda-y.without.ebitda,y.incrementalEBITDA);close(y.fcf,y.incrementalEBITDA-y.maintenance+y.residual);close(y.pv,y.fcf*y.discountFactor);for(const s of [y.without,y.withRenovation])close(s.totalRevenue-s.costs,s.ebitda);}
 close(m.waterfall.net,Object.values(m.waterfall).slice(0,4).reduce((s,x)=>s+x,0));close(m.waterfall.net,m.flows.reduce((s,x)=>s+x,0));close(m.waterfall.net,m.years.at(-1)!.cumulative);
 close(m.npv,-P.capex+m.years.reduce((s,y)=>s+y.pv,0));assert.equal(m.stabilised!.year,2);
});
test('zero improvement, zero capex and zero occupancy remain meaningful',()=>{
 const p={...P,renovationMonths:0,maintenance:0,residual:0};
 const flat=forecastInvestment(A,A,p);assert.ok(flat.years.every(y=>y.incrementalEBITDA===0));assert.equal(flat.npv,-P.capex);assert.equal(flat.payback,null);
 const free=forecastInvestment(A,B,{...p,capex:0});assert.ok(free.npv>0);assert.equal(free.roi,null);assert.equal(free.payback,0);
 const zero=forecastInvestment({...A,occupancy:0},{...B,occupancy:0},P);assert.ok(zero.years.every(y=>y.without.totalRevenue===0&&y.withRenovation.totalRevenue===0&&Number.isFinite(y.fcf)));assert.equal(zero.npv,calculateNPV(zero.flows,P.discountRate));
});
test('disruption is applied once, fixed costs persist, post-works year unaffected',()=>{
 const m=forecastInvestment(A,B,P),no=forecastInvestment(A,B,{...P,unavailableRooms:0});
 assert.ok(m.disruptionLoss>0);close(no.years[0].fcf-m.years[0].fcf,m.disruptionLoss);close(m.years[1].fcf,no.years[1].fcf);
 const allFixed=forecastInvestment(A,A,{...P,fixedCostShare:1});close(allFixed.years[0].without.costs,allFixed.years[0].withRenovation.costs);
 const long=forecastInvestment(A,B,{...P,renovationMonths:18});assert.ok(long.years[0].disruptionLoss>0&&long.years[1].disruptionLoss>0);assert.equal(long.years[2].disruptionLoss,0);assert.equal(long.stabilised!.year,3);
});
test('negative cases, capex and discount sensitivities',()=>{
 const m=forecastInvestment(A,B,P);assert.ok(forecastInvestment(A,B,{...P,capex:P.capex+1e6}).npv<m.npv);assert.ok(forecastInvestment(A,B,{...P,discountRate:.2}).npv<m.npv);
 const bad=forecastInvestment(A,{...A,adr:50},P);assert.ok(bad.npv<0);assert.equal(bad.payback,null);assert.equal(bad.irr.status,'none');assert.ok(bad.roi!<0);
});
test('costs inflate independently; residual received once; invalid forecasts rejected',()=>{
 const m=forecastInvestment(A,B,{...P,residual:123456});close(m.years[1].without.costs,m.years[0].without.costs*1.02);assert.notEqual(m.years[1].without.margin,m.years[0].without.margin);close(m.years.reduce((s,y)=>s+y.residual,0),123456);
 assert.throws(()=>forecastInvestment(A,B,{...P,horizon:0}));assert.throws(()=>forecastInvestment(A,B,{...P,discountRate:NaN}));assert.throws(()=>forecastInvestment(A,B,{...P,renovationMonths:121}));
});

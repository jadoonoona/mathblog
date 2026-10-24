import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAvailableRoomNights, calculateOccupiedRoomNights, calculateRoomRevenue, calculateRevPAR, calculateTotalRevenue, calculateEBITDA, calculateOperatingMetrics, calculateChange, DEFAULT_CURRENT, DEFAULT_PROJECTED } from '../src/lib/hotel-model.ts';
test('default annual underwriting reconciles', () => {
 const a = calculateOperatingMetrics(DEFAULT_CURRENT), b = calculateOperatingMetrics(DEFAULT_PROJECTED);
 assert.equal(a.available,73000); assert.equal(a.occupied,52560); assert.equal(a.roomRevenue,6570000); assert.equal(a.revpar,90); assert.equal(a.totalRevenue,8212500); assert.ok(Math.abs(a.ebitda-2299500)<1e-6);
 assert.equal(b.roomRevenue,8256300); assert.equal(b.totalRevenue,10320375); assert.equal(b.ebitda,3302520);
});
test('occupancy and ADR independently drive sold nights, revenue and RevPAR', () => {
 const a=calculateOperatingMetrics({...DEFAULT_CURRENT,occupancy:.5}); assert.equal(a.occupied,36500); assert.equal(a.roomRevenue,4562500);
 const b=calculateOperatingMetrics({...DEFAULT_CURRENT,adr:150}); assert.equal(b.revpar,108); assert.equal(b.roomRevenue,7884000);
});
test('ancillary and margin assumptions drive EBITDA', () => {
 const a=calculateOperatingMetrics({...DEFAULT_CURRENT,ancillaryRate:0,margin:.4}); assert.equal(a.totalRevenue,a.roomRevenue); assert.equal(a.ebitda,2628000);
 assert.equal(calculateTotalRevenue(100,25),125); assert.equal(calculateEBITDA(125,.32),40);
});
test('zero occupancy or capacity yields safe results and undefined growth is explicit', () => {
 for (const overrides of [{occupancy:0},{rooms:0},{days:0}]) {
 const a=calculateOperatingMetrics({...DEFAULT_CURRENT,...overrides}); assert.equal(a.roomRevenue,0); assert.equal(a.ebitda,0); assert.ok(Object.values(a).every(Number.isFinite));
 }
 assert.equal(calculateRevPAR(100,0),0); assert.equal(calculateChange(0,100).percentage,null); assert.equal(calculateChange(100,125).percentage,25);
});
test('invalid and extreme arguments do not escape as NaN or Infinity', () => {
 for(const n of [NaN,Infinity,-1,Number.MAX_VALUE]) {
 const a=calculateOperatingMetrics({rooms:n,days:n,occupancy:n,adr:n,ancillaryRate:n,margin:n});assert.ok(Object.values(a).every(Number.isFinite));
 assert.ok(Number.isFinite(calculateAvailableRoomNights(n,n))); assert.ok(Number.isFinite(calculateOccupiedRoomNights(n,n))); assert.ok(Number.isFinite(calculateRoomRevenue(n,n)));
 }
 assert.equal(calculateOccupiedRoomNights(100,2),100);assert.equal(calculateEBITDA(100,-1),0);
});

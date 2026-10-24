/** Illustrative annual operating model. All rates are decimals, not percentages. */
export interface OperatingAssumptions { rooms: number; days: number; occupancy: number; adr: number; ancillaryRate: number; margin: number }
export const DEFAULT_CURRENT: OperatingAssumptions = { rooms: 200, days: 365, occupancy: .72, adr: 125, ancillaryRate: .25, margin: .28 };
export const DEFAULT_PROJECTED: OperatingAssumptions = { ...DEFAULT_CURRENT, occupancy: .78, adr: 145, margin: .32 };
const positive = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
const rate = (n: number) => Math.min(1, positive(n));
const product = (a: number, b: number) => { const value = positive(a) * positive(b); return Number.isFinite(value) ? value : 0; };
export const calculateAvailableRoomNights = (rooms: number, days: number) => product(rooms, days);
export const calculateOccupiedRoomNights = (available: number, occupancy: number) => product(available, rate(occupancy));
export const calculateRoomRevenue = (occupied: number, adr: number) => product(occupied, adr);
export const calculateRevPAR = (revenue: number, available: number) => available > 0 && Number.isFinite(available) ? positive(revenue / available) : 0;
export const calculateTotalRevenue = (rooms: number, ancillary: number) => { const total = positive(rooms) + positive(ancillary); return Number.isFinite(total) ? total : 0; };
export const calculateEBITDA = (revenue: number, margin: number) => product(revenue, rate(margin));
export function calculateOperatingMetrics(a: OperatingAssumptions) {
    const available = calculateAvailableRoomNights(a.rooms, a.days);
    const occupied = calculateOccupiedRoomNights(available, a.occupancy);
    const roomRevenue = calculateRoomRevenue(occupied, a.adr);
    const ancillaryRevenue = product(roomRevenue, a.ancillaryRate);
    const totalRevenue = calculateTotalRevenue(roomRevenue, ancillaryRevenue);
    return { available, occupied, occupancy: rate(a.occupancy), adr: positive(a.adr), revpar: calculateRevPAR(roomRevenue, available), roomRevenue, ancillaryRevenue, totalRevenue, ebitda: calculateEBITDA(totalRevenue, a.margin), margin: rate(a.margin) };
}
export function calculateChange(current: number, projected: number) {
    const absolute = Number.isFinite(projected - current) ? projected - current : 0;
    const percentage = current === 0 ? null : absolute / Math.abs(current) * 100;
    return { absolute, percentage: percentage !== null && Number.isFinite(percentage) ? percentage : null };
}

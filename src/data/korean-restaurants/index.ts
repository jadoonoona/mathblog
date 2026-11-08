export type Recommendation = 'revisit' | 'okay' | 'disappointing' | 'pending';
export interface Visit {
    date?: string; // YYYY-MM or YYYY-MM-DD; never invent the day
    menus?: string[];
    price?: { amount: number; currency: string };
    review?: string;
}
export interface RestaurantTranslation {
    name?: string; country?: string; city?: string; address?: string; summary?: string;
    visits?: Visit[]; photos?: { src: string; alt: string }[];
}
export interface Restaurant {
    id: string;
    name: string;
    countryCode: string;
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    visits: Visit[];
    recommendation: Recommendation;
    summary?: string;
    photos?: { src: string; alt: string }[];
    mapUrl?: string;
    postUrl?: string;
    translations?: { en?: RestaurantTranslation };
}
// Only actual visits belong here. Development fixtures are never imported by the site.
export const restaurants: Restaurant[] = [
    {
        id: 'unique-restaurant-id',
        name: 'Ga Jung Jib',
        countryCode: 'FR',
        country: '프랑스',
        city: '파리',
        // Add verified numeric latitude and longitude here.
        recommendation: 'revisit',
        visits: [
            {
                date: '2026-10', // YYYY-MM or YYYY-MM-DD
                menus: ['What you ate'],
                // Optional: Gom Tang, Bibimbap
                // price: { amount: 25, currency: 'EUR' },
                review: 'The best Korean restaurant in Paris!',
            },
        ],
        summary: 'First time when I felt the food was underpriced.',
        photos: [],
        // Optional:
        // mapUrl: 'https://...',
    },
];
export const recommendations = {
    revisit: { labelEn: 'Would go again', label: '다시 가고 싶은 곳', color: '#25834b', symbol: '★' },
    okay: { labelEn: 'It was okay', label: '무난했던 곳', color: '#b95b16', symbol: '●' },
    disappointing: { labelEn: 'Disappointing', label: '아쉬웠던 곳', color: '#8653b7', symbol: '◆' },
    pending: { labelEn: 'Review to come', label: '후기 작성 전', color: '#6b7280', symbol: '…' },
} satisfies Record<Recommendation, { label: string; labelEn: string; color: string; symbol: string }>;
export const tileProvider = {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
};
export function hasCoordinates(r: Restaurant): boolean {
    return typeof r.latitude === 'number' && Number.isFinite(r.latitude) && Math.abs(r.latitude) <= 90
        && typeof r.longitude === 'number' && Number.isFinite(r.longitude) && Math.abs(r.longitude) <= 180;
}
export function uniqueRestaurants(rows: Restaurant[]): Restaurant[] {
    return [...new Map(rows.map(r => [r.id, r])).values()];
}
export function stats(rows: Restaurant[]) {
    const unique = uniqueRestaurants(rows);
    return { countries: new Set(unique.map(r => r.countryCode)).size,
        cities: new Set(unique.map(r => `${r.countryCode}:${r.city}`)).size, restaurants: unique.length };
}
export function filterRestaurants(rows: Restaurant[], query = '', country = '', status = '') {
    const q = query.normalize('NFKC').trim().toLocaleLowerCase();
    return rows.filter(r => (!country || r.countryCode === country) && (!status || r.recommendation === status)
        && [r.name, r.city, r.country, ...r.visits.flatMap(v => v.menus ?? [])].join(' ').normalize('NFKC').toLocaleLowerCase().includes(q));
}
export const assetUrl = (path: string) => path.startsWith('/') && !path.startsWith('//')
    ? `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}` : path;

export function localizedRestaurants(rows: Restaurant[], lang: 'en' | 'ko'): Restaurant[] {
    return rows.map(r => lang === 'en' ? { ...r, ...r.translations?.en } : r);
}
export function recommendationSettings(lang: 'en' | 'ko') {
    return Object.fromEntries(Object.entries(recommendations).map(([key, value]) => [key, { ...value, label: lang === 'en' ? value.labelEn : value.label }])) as typeof recommendations;
}

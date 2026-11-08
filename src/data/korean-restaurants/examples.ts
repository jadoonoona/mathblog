// FICTIONAL development fixtures, never imported by production components.
import type { Restaurant } from './index';
export const examples: Restaurant[] = [{
    id: 'fictional-fixture', name: '개발용 가상 식당 (실제 방문 아님)',
    countryCode: 'XX', country: '가상 국가', city: '가상 도시',
    latitude: 0, longitude: 0, recommendation: 'pending',
    visits: [{ date: '2000-01', menus: ['테스트 메뉴'], review: '개발 검증용 문구' }],
}];

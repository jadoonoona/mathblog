export interface Website {
    id: string;
    title: string;
    url: string;
    description: string;
    category: string;
    tags: string[];
    /** Path under public/, without a leading slash; empty string uses the text fallback. */
    thumbnail: string;
    addedAt: string;
}

// Starter entries, not personal recommendations. Add entries here without changing the UI.
export const websites: Website[] = [
    { id: 'our-trip-plan', title: 'Our Trip Plan', url: 'https://ourtripplan.com', description: '함께 여행 일정을 만들고 공유하는 여행 계획 서비스.', category: '여행', tags: ['여행 계획', '협업'], thumbnail: 'images/websites/our-trip-plan.jpg', addedAt: '2026-11-22' },
    { id: 'desmos', title: 'Desmos', url: 'https://www.desmos.com/calculator', description: '수식을 그래프로 그려 함수와 수학 개념을 직접 탐색하는 계산기.', category: '수학·통계', tags: ['그래프', '시각화', '학습'], thumbnail: 'images/websites/desmos.jpg', addedAt: '2026-11-21' },
    { id: 'geogebra', title: 'GeoGebra', url: 'https://www.geogebra.org/calculator', description: '기하, 대수와 그래프를 연결해 실험하는 인터랙티브 수학 도구.', category: '수학·통계', tags: ['그래프', '시각화', '학습'], thumbnail: 'images/websites/geogebra.jpg', addedAt: '2026-11-20' },
    { id: 'fred', title: 'FRED', url: 'https://fred.stlouisfed.org', description: '세인트루이스 연방준비은행이 제공하는 경제 시계열 데이터와 차트.', category: '금융·경제', tags: ['데이터', '리서치', '시각화'], thumbnail: 'images/websites/fred.jpg', addedAt: '2026-11-19' },
    { id: 'mdn', title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/', description: 'HTML, CSS, JavaScript와 웹 API를 찾아보는 개발 문서.', category: '개발', tags: ['문서', '웹 개발', '학습'], thumbnail: 'images/websites/mdn.jpg', addedAt: '2026-11-18' },
    { id: 'astro', title: 'Astro', url: 'https://astro.build', description: '콘텐츠 중심 웹사이트를 만드는 웹 프레임워크. 이 블로그에도 사용합니다.', category: '개발', tags: ['웹 개발', '오픈소스'], thumbnail: 'images/websites/astro.jpg', addedAt: '2026-11-17' },
    { id: 'github', title: 'GitHub', url: 'https://github.com', description: '코드를 관리하고 오픈소스 프로젝트를 탐색하며 협업하는 플랫폼.', category: '개발', tags: ['오픈소스', '협업'], thumbnail: 'images/websites/github.jpg', addedAt: '2026-11-16' },
    { id: 'observable', title: 'Observable', url: 'https://observablehq.com', description: '데이터를 탐색하고 인터랙티브 시각화를 만들고 공유하는 플랫폼.', category: '데이터·시각화', tags: ['데이터', '시각화', '협업'], thumbnail: 'images/websites/observable.jpg', addedAt: '2026-11-15' },
];

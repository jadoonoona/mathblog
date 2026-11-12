import type { FeaturedProject, InterestArea } from './home';

export const INTEREST_AREAS_KO: InterestArea[] = [
    { number: '01', title: '수학과 통계', description: '더 나은 질문과 명확한 판단을 위한 정량적 기반을 공부합니다.', topics: ['선형대수', '확률', '회귀분석', '정량적 방법론'], link: 'ko/projects/mathematics/', projectCategory: 'mathematics', linkLabel: '분야 살펴보기' },
    { number: '02', title: '금융', description: '자본과 시장, 현실적인 제약이 가치에 미치는 영향을 살펴봅니다.', topics: ['주식', '부동산', '거시경제', '가치평가'], link: 'ko/projects/finance/', projectCategory: 'finance', linkLabel: '프로젝트 보기' },
    { number: '03', title: '데이터 및 리스크 분석', description: '금융 관련 질문을 측정하고 반복 가능한 분석으로 바꿉니다.', topics: ['Python', 'SQL', '시장 리스크', '변동성', '자동화'], link: 'ko/projects/data-risk/', projectCategory: 'data-risk', linkLabel: '분야 살펴보기' },
    { number: '04', title: '앱/웹 개발', description: '분석과 세심한 제품 설계가 만나는 유용한 도구를 만듭니다.', topics: ['모바일 앱 개발', 'React Native', 'Supabase', '제품 설계'], link: 'ko/projects/app-web/', projectCategory: 'app-web', linkLabel: '프로젝트 보기' },
];

export const FEATURED_PROJECTS_KO: FeaturedProject[] = [
    { number: '05', title: '순전파와 역전파', description: '간단한 로지스틱 회귀 예제로 순전파, 역전파와 경사하강법을 숫자 계산과 함께 설명하는 수학 노트입니다.', tags: ['머신러닝', '미분', '로지스틱 회귀'], link: 'math-notes/forward-and-backpropagation/', linkLabel: '노트 읽기', category: 'mathematics', status: '학습 노트 · 2026년 11월 12일' },
    { number: '01', title: '호텔 자산 관리 및 자본적 지출 투자 분석', description: '객실 요금, 점유율, 매출과 EBITDA를 비교하는 인터랙티브 호텔 운영 모델입니다.', tags: ['금융', '호텔', '모델링'], link: 'ko/projects/hotel-asset-management/', linkLabel: '운영 모델 열기', category: 'finance', status: '1–5단계 공개' },
    { number: '02', title: 'Our Trip Plan', description: '함께하는 여행 일정을 더 쉽게 계획하고 관리할 수 있도록 만든 협업 여행 계획 서비스입니다.', tags: ['모바일', 'React Native', 'Travel app'], link: 'https://ourtripplan.com', linkLabel: '프로젝트 보기', category: 'app-web', status: '운영 중' },
    { number: '03', title: '한국 금리 및 신용 스프레드 분석', description: '2024~2025년 조달 스프레드의 부트스트랩 분석과 부동산금융 스트레스 테스트입니다.', tags: ['금융', '부트스트랩', '신용 리스크'], link: 'projects/korean-interest-rate-credit-spread/', linkLabel: '연구 글 읽기', category: 'finance', status: '2024~2025년 CSV 분석' },
    { number: '04', title: '미국 중간선거 다음 날, 나스닥은 평소보다 크게 움직일까?', description: 'FRED NASDAQCOM으로 중간선거 14회의 변동 폭을 분석하고, 수요일 무작위 비교를 10,000회 실행합니다.', tags: ['통계', '시뮬레이션', '금융 리스크'], link: 'ko/projects/nasdaq-after-us-midterm-elections/', linkLabel: '연구 글 읽기', category: 'mathematics', status: '1974~2026년 · 재현 가능한 분석' },
];

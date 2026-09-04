import type { FeaturedProject, InterestArea } from './home';

export const INTEREST_AREAS_KO: InterestArea[] = [
    { number: '01', title: '수학과 통계', description: '배운 내용을 정리한 곳입니다', topics: ['선형대수', '확률', '회귀분석', '정량적 방법론'], link: 'ko/math-notes/' },
    { number: '02', title: '금융과 투자', description: '금융과 관련된 내용들을 기록한 공간입니다', topics: ['주식', '부동산', '거시경제', '가치평가'], link: 'blog/' },
    { number: '03', title: '데이터와 리스크 분석', description: '현업을 바탕으로 이런 저런 내용을 다뤄봅니다.', topics: ['Python', 'SQL', '시장 리스크', '변동성', '자동화'], link: 'blog/' },
    { number: '04', title: '제품과 개발', description: '분석적 사고와 세심한 제품 설계가 만나는 유용한 도구를 만듭니다.', topics: ['모바일 개발', 'React Native', 'Supabase', '제품 설계'], link: '#projects' },
];

export const FEATURED_PROJECTS_KO: FeaturedProject[] = [
    { number: '01', title: '시장 리스크 분석', description: '변동성과 낙폭, 시장 수익률 뒤에 있는 리스크를 탐구하는 작업 공간입니다.', tags: ['Python', 'Risk', 'Data'], link: 'blog/', linkLabel: '글 살펴보기', featured: true },
    { number: '02', title: '부동산 투자 모델', description: '부동산 현금흐름과 가정, 가치평가를 실용적으로 생각하기 위한 프레임워크입니다.', tags: ['Property', 'Valuation'], link: 'blog/', linkLabel: '노트로 곧 공개' },
    { number: '03', title: '프로젝트 파이낸스 사례 연구', description: '장기 프로젝트의 구조와 리스크 배분, 프로젝트를 움직이게 하는 숫자를 기록합니다.', tags: ['Project finance', 'Modelling'], link: 'blog/', linkLabel: '노트로 곧 공개' },
    { number: '04', title: 'Our Trip Plan', description: '함께하는 여행 일정을 더 쉽게 계획하기 위해 만든 협업 여행 계획 제품입니다.', tags: ['Mobile', 'React Native', 'Supabase'], link: '#our-trip-plan', linkLabel: '소개 보기' },
];
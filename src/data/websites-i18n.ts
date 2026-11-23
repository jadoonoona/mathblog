export type CatalogLanguage = 'en' | 'ko';

const english: Record<string, string> = {
    '블로그': 'Blog', '웹사이트 모음': 'Bookmarks',
    '유용한 웹사이트와 도구를 한곳에서 찾아보세요.': 'Explore useful websites and tools in one place.',
    '사이트 검색': 'Search websites', '이름, 설명, 도메인, 태그 검색': 'Search names, descriptions, domains or tags',
    '정렬': 'Sort', '최신 등록순': 'Newest first', '이름순': 'Name',
    '전체': 'All', '검색 결과': 'Results', '웹사이트 필터': 'Website filters',
    '필터': 'Filters', '카테고리': 'Categories', '태그': 'Tags',
    '선택한 태그를 모두 포함': 'Match all selected tags', '즐겨찾기만 보기': 'Favorites only',
    '초기화': 'Reset', '웹사이트 목록': 'Website list', '선택한 필터': 'Selected filters',
    '모든 사이트를 표시합니다. 검색·필터·즐겨찾기는 JavaScript를 켜면 사용할 수 있습니다.': 'All websites are shown. Enable JavaScript to search, filter and save favorites.',
    '미리보기': 'Preview', '새 탭에서 열기': 'Open in a new tab', '웹사이트 미리보기': 'Website preview',
    '즐겨찾기': 'Favorites', '카테고리와 태그': 'Category and tags',
    '조건에 맞는 웹사이트가 없습니다.': 'No websites match your filters.',
    '검색어를 바꾸거나 필터를 초기화해 보세요.': 'Try another search or reset the filters.',
    '교체·추가할 수 있는 시작용 목록입니다. 즐겨찾기는 이 브라우저에 저장됩니다.': 'A starter collection you can expand. Favorites are saved in this browser.',
    '브라우저 저장소를 사용할 수 없어 즐겨찾기는 현재 화면에서만 유지됩니다.': 'Browser storage is unavailable. Favorites will only be kept for this visit.',
    '즐겨찾기를 저장하지 못했습니다. 현재 화면에서는 사용할 수 있습니다.': 'Favorites could not be saved. You can still use them during this visit.',
    '필터 해제': 'Remove filter', '검색': 'Search',
    '데이터·시각화': 'Data & visualization', '여행': 'Travel', '수학·통계': 'Mathematics & statistics',
    '금융·경제': 'Finance & economics', '개발': 'Development', '부동산': 'Real estate',
    '데이터': 'Data', '공공데이터': 'Public data', '리서치': 'Research', '여행 계획': 'Travel planning',
    '협업': 'Collaboration', '그래프': 'Graphs', '시각화': 'Visualization', '학습': 'Learning',
    '문서': 'Documentation', '웹 개발': 'Web development', '오픈소스': 'Open source', '통계': 'Statistics',
};

export function websiteText(lang: CatalogLanguage, text: string): string {
    return lang === 'en' ? english[text] ?? text : text;
}

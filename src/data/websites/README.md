# 웹사이트 모음 관리

영어 페이지: `/mathblog/blog/websites/` (Bookmarks). 한국어 페이지: `/mathblog/ko/blog/websites/` (웹사이트 모음). Astro 정적 페이지이며 외부 API나 서버가 필요하지 않습니다.

## 사이트 추가

`src/data/websites.ts`의 `websites` 배열에 항목을 추가합니다. 카테고리·태그 필터와 전체 사이트 수는 자동 생성됩니다. 여러 태그를 선택하면 **모두 포함**하는 사이트만 표시합니다. 검색어의 각 단어도 함께 적용됩니다.

```ts
{
    id: 'my-tool', // 고유하고 변경하지 않는 ID: 브라우저 즐겨찾기에 사용
    title: 'My Tool',
    url: 'https://example.com',
    description: '이 사이트에서 할 수 있는 일을 한두 문장으로 설명합니다.',
    category: '개발',
    tags: ['웹 개발', '학습'],
    thumbnail: 'images/websites/my-tool.jpg',
    addedAt: '2026-11-22', // YYYY-MM-DD, 등록일
},
```

`src/data/websites.ts`의 `englishEntries`에 같은 ID로 영어 제목(선택)과 설명을 추가합니다. 새 카테고리·태그의 영어 표기는 `src/data/websites-i18n.ts`에서 관리합니다. 사이트 ID는 두 언어에서 동일하게 유지하므로 즐겨찾기를 공유합니다.

사이트 목록·카테고리·태그 외의 UI 코드를 수정할 필요는 없습니다. 초기 예시 항목은 교체할 수 있는 시작용 데이터이며 Our Trip Plan 링크는 기존 프로젝트 목록에서 가져왔습니다.

## 썸네일 등록·교체

1. 웹페이지를 직접 캡처하거나 사용 가능한 대표 미리보기 이미지를 준비합니다.
2. `public/images/websites/`에 파일을 저장합니다. 권장 크기는 **1280 × 800**, JPG 또는 WebP입니다.
3. 데이터의 `thumbnail`에 `images/websites/my-tool.jpg`처럼 `public/` 기준 경로를 적습니다. `/mathblog/`는 컴포넌트에서 붙입니다.

빈 문자열은 사이트 이름·도메인이 있는 대체 썸네일을 표시합니다. 이미지 로딩 실패에도 같은 대체 화면이 나타납니다. 이미지 비율은 16:10으로 고정되고 지연 로딩됩니다. 외부 HTTPS 이미지 URL도 가능하지만 가용성·접근 정책에 영향을 받으므로 로컬 파일을 권장합니다.

초기 썸네일은 2026-11-22 각 데이터 URL의 실제 웹페이지를 1280 × 800 브라우저 화면으로 캡처한 정적 스냅샷입니다. 사이트가 바뀌면 수동으로 교체하세요. 자동 수집이나 런타임 스크린샷 서비스는 사용하지 않습니다. **Open Graph 이미지는 사이트가 지정한 대표 이미지이고 실제 웹페이지 캡처와는 다릅니다.** 어느 쪽이든 수동 등록할 수 있으며 자동 갱신하지 않습니다.

즐겨찾기는 `mathblog.website-favorites.v1` 키로 현재 브라우저의 localStorage에 저장합니다. 저장소 사용이 차단되면 안내 후 현재 화면에서만 유지합니다. 초기화는 검색·필터·정렬을 초기화하며 저장한 즐겨찾기를 삭제하지 않습니다.

## 검증

```sh
npm test
npm run build
```

브라우저 검증은 Astro 개발 서버(4321)와 Chromium CDP(9224)가 실행 중인 상태에서 `node scripts/check-websites-browser.mjs`로 실행합니다. 테스트는 해당 출처의 카탈로그 즐겨찾기 키를 잠시 변경한 후 원래 값으로 복구합니다. 결과 스크린샷은 `/private/tmp/mathblog-websites-qa/`에 저장합니다.

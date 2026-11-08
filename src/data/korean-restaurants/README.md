# 해외에서 만난 한식당

영어 글: `/mathblog/blog/korean-restaurants/`, 한국어 글: `/mathblog/ko/blog/korean-restaurants/`. 기존 Blog 목록의 Travel 태그와 글 사이드바에서 접근합니다. 상단 EN / 한국어 버튼으로 같은 글의 언어를 전환합니다.

## 실제 식당 추가

`index.ts`의 `restaurants` 배열에 `template.json`의 객체를 복사한 뒤 실제 방문 자료만 채우세요. 템플릿과 `examples.ts`는 공개 데이터로 import하지 않습니다. 예시의 이름·좌표·방문월은 가상이며 실제 기록으로 복사하지 마세요.

- `id`: 식당마다 고유하고 변하지 않는 영문 ID (예: `my-restaurant-01`). 재방문은 새 식당 대신 기존 객체의 `visits`에 추가합니다. 같은 id는 통계와 목록에서 하나로 처리됩니다.
- `name`, `countryCode` (ISO 국가 코드), `country`, `city`, `recommendation`, `visits`를 채웁니다.
- `recommendation`: `revisit`, `okay`, `disappointing`, `pending`. 모두 방문한 식당입니다.
- `latitude` / `longitude`: 직접 확인한 숫자 좌표. 모르면 두 필드를 생략하세요. 잘못된 좌표도 지도만 제외되며 카드는 표시됩니다. 주소 자동 지오코딩은 하지 않습니다.
- `visits`: `{ date: '2026-05', menus: ['실제로 먹은 메뉴'], price: { amount: 12.5, currency: 'GBP' }, review: '방문 당시 개인 후기' }` 형태. 월만 알면 `YYYY-MM`, 날짜까지 알면 `YYYY-MM-DD`. 모르는 항목은 생략합니다. 가격은 실제 지불한 값과 통화 코드입니다.
- `summary`, `address`, `mapUrl`, `postUrl`은 선택입니다. 링크에는 신뢰하는 HTTPS 주소 또는 사이트 내부 경로를 사용하세요.
- `photos`: `{ src: '/images/restaurants/파일명.jpg', alt: '실제 사진의 구체적인 설명' }`. 파일은 `public/images/restaurants/`에 둡니다. `/mathblog/`는 자동 반영되므로 경로에 중복 입력하지 마세요. 사진이 없으면 `photos`를 생략하거나 빈 배열로 둡니다. 공개 허가를 받은 사진만 추가하세요.

## 색상·지도 설정

추천 라벨·색상·기호는 `index.ts`의 `recommendations` 한 곳에서 범례·마커·카드·필터가 공유합니다. 국가별·여행별 방식으로 전환할 때 이 설정과 분류 키를 함께 변경하세요.

지도 라이브러리: Leaflet 1.9.4 (BSD-2-Clause), Leaflet.markercluster 1.5.3 (MIT). npm으로 자체 번들하며 브라우저에서 지도 영역 근처에 도달한 뒤 불러옵니다. 지도 타일 공급자는 라이브러리와 별개로 `tileProvider`에서 설정합니다.

기본 타일은 https://tile.openstreetmap.org/{z}/{x}/{y}.png 이며 © OpenStreetMap contributors 출처를 지도에 표시합니다. https://operations.osmfoundation.org/policies/tiles/ 를 준수해야 합니다. 사전 다운로드·오프라인 저장·캐시 무효화를 하지 않으며 브라우저의 기본 Referer와 HTTP 캐시를 사용합니다. Referrer-Policy로 Referer를 차단하지 마세요. 대량 트래픽을 운영한다면 정책에 맞는 다른 공급자로 변경하세요. 별도 가입/API 키는 없습니다. 외부 타일 요청이 실패해도 정적 후기 목록은 유지됩니다.

## 로컬 확인

`npm test`, `npm run build`를 실행합니다. `npm run dev`에서 글 주소를 엽니다. 개발 시에만 임시로 fixtures를 연결해 빈 배열, 단일 좌표, 근접 좌표, 좌표 없는 식당, 사진 없음, 여러 방문을 확인한 후 공개 배열을 복구하세요. 예시를 공개하는 토글은 제공하지 않습니다.

## 영어 번역

화면 문구는 `i18n.ts`, 추천 상태의 영어 라벨은 `index.ts`의 `recommendations.labelEn`에서 관리합니다. 식당 데이터는 두 언어에서 같은 ID와 위치를 공유합니다.

식당별로 `translations: { en: { name: '...', country: '...', city: '...', summary: '...', visits: [...], photos: [...] } }`를 추가하면 영어 카드와 팝업에 사용합니다. `visits`의 후기·메뉴와 `photos`의 alt도 번역할 수 있습니다. 배열은 전체를 제공하고 실제 방문일·가격·사진 경로는 원본과 동일하게 유지하세요. 번역하지 않은 필드는 원문을 표시합니다. 기록 자체를 임의로 자동 번역하거나 생성하지 않습니다.

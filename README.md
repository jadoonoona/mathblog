# Jamon's blog

금융·수학에 관한 글, 학습 노트와 인터랙티브 분석 도구를 모은 개인 블로그입니다. [Astro Scholar](https://github.com/whydevils/astro-scholar)를 바탕으로 Astro와 TypeScript로 구현했습니다.

- 사이트: [jadoonoona.github.io/mathblog](https://jadoonoona.github.io/mathblog/)
- 한국어 홈: [jadoonoona.github.io/mathblog/ko](https://jadoonoona.github.io/mathblog/ko/)

## 현재 구성

- **Home / About**: 관심 분야, 프로젝트 소개와 프로필.
- **Blog**: 여행·식당 방문 기록과 지도. 수학·통계·컴퓨터공학 글은 Projects의 Mathematics 카테고리에 있습니다.
- **Projects**: Mathematics / Finance / App-Web 분야별 프로젝트 탐색.
- **주요 분석 도구**: Brinson 성과 귀속(BHB/BF), 호텔 운영·Capex 투자·포트폴리오 분석.
- **연구 글**: 한국 금리·신용 스프레드 부트스트랩 분석, 미국 중간선거 이후 Nasdaq 수익률 분석.
- **학습 노트**: 벡터, 행렬, 순열·조합, 원핫 인코딩, 순전파·역전파.

주요 페이지와 일부 글은 영어·한국어 버전을 제공합니다. 영어 경로는 `/mathblog/`, 한국어 경로는 `/mathblog/ko/`이며, 모든 글이 번역되어 있는 것은 아닙니다. 수식은 `remark-math`와 `rehype-mathjax`, 식당 지도는 Leaflet을 사용합니다.

## 로컬 실행

Node.js **22.12 이상**이 필요하며, GitHub Actions 빌드와 동일한 **Node.js 24** 사용을 권장합니다.

```sh
npm ci
npm run dev
# http://localhost:4321/mathblog/
```

| 명령어 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 정적 사이트를 `dist/`에 생성 |
| `npm run preview` | 빌드 결과 미리보기 (`/mathblog/` 경로) |
| `npm test` | TypeScript 모델·데이터 테스트 실행 |

사이트 빌드에는 Python이나 API 키가 필요하지 않습니다. 다만 `npm test`의 Brinson 검증은 생성한 Python 코드를 실제 실행하므로 pandas가 설치된 Python 환경이 필요합니다. 기본 실행 파일은 `.venv/bin/python`이며, 다른 환경은 다음처럼 지정합니다.

```sh
BRINSON_PYTHON=/absolute/path/to/python npm test
```

## 콘텐츠 수정

### 프로필·홈·탐색 메뉴

- `src/constants.ts`: 블로그 이름, 소개 문구, 소셜 링크와 사이트 URL.
- `src/pages/about.astro`, `src/pages/ko/about.astro`: 언어별 소개.
- `src/data/home.ts`, `src/data/home-ko.ts`: 언어별 관심 분야와 프로젝트 목록.
- `src/components/Navigation.astro`: 메뉴 링크.
- `src/components/LanguageSwitcher.astro`: 언어별 대응 경로. 번역 페이지를 추가할 때 함께 확인합니다.
- `src/styles/global.css`: 공통 색상·폰트·테마.

### 블로그·수학 노트

일반 글은 `src/pages/blog/`에 Markdown 파일을 추가합니다.

```markdown
---
layout: '../../layouts/BlogPost.astro'
title: '글 제목'
date: '2026-11-21'
description: '목록에 표시할 짧은 소개'
tags: ['finance']
---

본문을 작성합니다.
```

수학·통계·컴퓨터공학 글은 `src/pages/projects/mathematics/`에 추가합니다. `layout: '../../../layouts/BlogPost.astro'`, `section: 'mathematics'`, `category: 'Linear algebra'` 등의 메타데이터를 지정하면 영어·한국어 프로젝트 카테고리 목록에 자동으로 표시됩니다. 기존 `/math-notes/` 주소는 새 프로젝트 주소로 연결됩니다.

`hidden: true`는 목록과 사이드바에서만 제외합니다. 해당 페이지는 계속 빌드되어 URL로 접근할 수 있으므로 비공개 자료 보관 용도로 사용하지 않습니다.

이미지는 `public/images/blog/`에 저장합니다. Markdown에서는 `/mathblog/images/blog/filename.png`처럼 배포 base를 포함하고, Astro 컴포넌트에서는 `import.meta.env.BASE_URL`을 사용합니다. 배포 경로를 바꾸면 Markdown의 이미지 경로도 확인해야 합니다.

인터랙티브 글은 `.astro` 페이지와 별도 컴포넌트·데이터로 구성됩니다. `.astro` 파일을 추가하는 것만으로 Markdown 기반 블로그 목록에 등록되지는 않으므로 해당 목록의 메타데이터도 연결해야 합니다. 식당 기록 입력 규칙은 [식당 데이터 안내](src/data/korean-restaurants/README.md)를 참고하세요.

### 프로젝트·연구

프로젝트 페이지는 `src/pages/projects/`, 한국어 대응 페이지는 `src/pages/ko/projects/`에 있습니다. 프로젝트 목록은 `src/data/home.ts`와 `src/data/home-ko.ts`에서 관리합니다.

연구 데이터 재생성과 별도 검증에는 Python 환경이 필요합니다. 설치 방법, 데이터 출처·기준일과 분석 한계는 각 문서를 확인하세요. 저장된 결과가 현재 시점의 시장 데이터로 자동 갱신되지는 않습니다.

- [Brinson 구현·검증 안내](research/brinson-attribution/README.md)
- [한국 금리·신용 스프레드 연구](research/korean-rates/README.md)
- [Nasdaq 중간선거 연구](research/nasdaq-midterms/README.md)

원본 템플릿의 `publications.astro`와 `src/data/publications.json`도 남아 있지만 현재 주 메뉴에는 포함하지 않습니다. 데이터 형식은 [Publications 안내](src/data/README.md)에 있습니다.

## 배포

현재 배포 대상은 **GitHub Pages**입니다. `.github/workflows/deploy.yaml`은 `main` 브랜치 push 또는 수동 실행 시 Node.js 24로 사이트를 빌드하고 배포합니다. 저장소의 **Settings → Pages → Build and deployment → Source**는 **GitHub Actions**로 설정해야 합니다.

`astro.config.mjs`의 현재 주소 설정:

```javascript
site: 'https://jadoonoona.github.io',
base: '/mathblog/',
```

도메인이나 저장소 경로를 변경하면 이 설정과 `src/constants.ts`의 `siteUrl`, 콘텐츠에 직접 작성한 `/mathblog/` 링크를 함께 수정합니다.

## 프로젝트 구조

```text
src/
├── constants.ts          # 사이트 정보
├── components/          # 공통 UI와 인터랙티브 도구
├── data/                # 프로젝트·식당·글 메타데이터
├── layouts/             # 공통·블로그·금융 글 레이아웃
├── lib/                 # 성과 귀속·호텔 분석 모델
├── pages/
│   ├── blog/            # 일반 글과 식당 기록
│   ├── projects/        # 프로젝트·연구·mathematics 학습 글
│   └── ko/              # 한국어 페이지
├── scripts/             # 브라우저 상호작용
└── styles/              # 공통·페이지별 스타일
public/                  # 이미지·연구 결과 등 정적 자산
research/                # 연구별 Python 코드·데이터·재현 안내
scripts/                 # 브라우저 검증 등 보조 도구
tests/                   # TypeScript 테스트
.github/workflows/       # GitHub Pages 배포
```

## 라이선스

MIT — [LICENSE](LICENSE) 참고. 원본 템플릿 제작: [whydevils](https://github.com/whydevils). 연구에 사용한 외부 데이터의 출처와 이용 조건은 각 연구 문서를 확인하세요.

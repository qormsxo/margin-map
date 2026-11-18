# MarginMap

음식점·카페 메뉴별 원가와 **공헌이익**을 계산·추적하는 서비스입니다.

웹 MVP(관리·대시보드·시뮬·PWA)를 사용할 수 있는 수준까지 구현되어 있습니다.  
Android Play 출시는 [docs/14-android-release.md](./docs/14-android-release.md)에 **패키징 비교·공식 요건**만 정리되어 있으며, 네이티브 프로젝트/스토어 업로드는 **아직 완료되지 않았습니다**.

## 기술 스택

- Next.js App Router + TypeScript + Tailwind CSS
- PostgreSQL (로컬 설치 또는 선택적 Docker Compose)
- Prisma ORM 7 (`prisma.config.ts` + `@prisma/adapter-pg`) + Zod + Vitest
- PWA (manifest, 아이콘, shell-only service worker, 설치 안내)

## 주요 화면

| 경로 | 내용 |
|------|------|
| `/login` | 가입·로그인 |
| `/dashboard` | 공헌이익·가격영향·차이·주간알림·기여도 |
| `/ingredients` | 식재료 관리 |
| `/menus` | 메뉴 관리 |
| `/alerts` | 주간 이상 징후 |
| `/simulation` | 가격·수수료 시뮬레이션 (운영 데이터 미변경) |
| `/sales` | 월별 판매량 (메뉴 × 홀·배민·쿠팡이츠), 배달 주문 건수, 판매 채널 수수료 |
| `/contribution` | 판매량×공헌 분석 + 실제 남는 돈(영업이익·손익분기) |
| `/fixed-costs` | 월 고정비 (인건비·임대료·공과금) |
| `/purchases` | 매입 기준 이론 vs 실제 원가, 실사 우선순위 |

## 디렉터리 구조

```text
src/
  app/                 # UI 라우트 + /api/v1 HTTP 어댑터
  components/          # 반응형 레이아웃, PWA, UI
  domain/              # 순수 비즈니스 로직 (React/Prisma 금지)
  server/              # DB·세션을 쓰는 애플리케이션 서비스
  lib/                 # env, prisma, errors, api helpers, auth
prisma/                # 스키마·마이그레이션
docs/                  # 제품·설계·Android 출시 근거
```

## 사전 요구

- Node.js 20+
- PostgreSQL (로컬 DB 권장)
- npm

## 로컬 실행

```bash
npm install
cp .env.example .env   # DATABASE_URL을 로컬 Postgres에 맞게
npm run db:migrate
npm run dev
```

- 앱: http://localhost:3000  
- PWA SW는 **production** (`npm run build && npm start`)에서만 등록됩니다.

Docker Compose(`npm run db:up`)는 선택 사항입니다.

## PWA 캐시 정책

- `/api/*` 및 대시보드·재료·메뉴 등 **민감 라우트는 캐시하지 않습니다.**
- 오프라인 시 `public/offline.html`만 제공합니다.
- PWA 홈 화면 설치와 Google Play 출시는 **별개**입니다.

## Android

근거·절차·Play 공식 요건 요약: [docs/14-android-release.md](./docs/14-android-release.md)

- 단기 후보: TWA (Bubblewrap)
- 카메라 네이티브 확장 시: Capacitor 재평가
- **미완료:** Bubblewrap/Capacitor 프로젝트, Play 업로드, 네이티브 카메라 플러그인

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` / `start` | 프로덕션 빌드·실행 |
| `npm test` | Vitest |
| `npm run lint:oxlint` | anti-slop 포함 린트 |
| `npm run db:migrate` | Prisma 마이그레이션 |
| `node scripts/seed-demo.mjs [url] [--reset 또는 --clean]` | 예시 매장 3곳 자동 입력 (직접 입력 안내: [docs/sample-data.md](./docs/sample-data.md)) |

## 명시적 제외

- 메뉴별 조리시간·인건비 배분 (손질 수율·매장 고정비는 구현됨: [docs/15](./docs/15-scope-change-yield-fixed-costs-purchases.md))
- 네이티브 Android 앱 완성 / Play 스토어 게시 완료 주장

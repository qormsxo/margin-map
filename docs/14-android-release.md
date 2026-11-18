# MarginMap Android 출시 기반 (Stage 6)

| 항목 | 내용 |
|------|------|
| 목적 | 웹 MVP와 **분리된** Android 패키징·출시 트랙 정리 |
| 상태 | **문서·근거만**. Capacitor/TWA 프로젝트 생성·네이티브 카메라 구현·Play 업로드는 **미완료** |
| 관련 | [08-architecture](08-architecture.md), PWA `public/manifest.webmanifest` / `public/sw.js` |

**중요:** PWA 홈 화면 설치 ≠ Google Play 출시. 둘을 같은 작업으로 취급하지 않는다.

---

## 1. 패키징 방식 비교와 선택

| 방식 | 요약 | 장점 | 단점 | MarginMap 적합도 |
|------|------|------|------|------------------|
| **Trusted Web Activity (Bubblewrap / PWABuilder)** | Chrome Custom Tab으로 HTTPS PWA를 전체화면 실행. Digital Asset Links로 검증 | 웹·도메인 로직 그대로, 유지보수 단순, Play 배포 가능 | 네이티브 UI/플러그인 제한적, 오프라인·카메라 등은 웹 Capability에 의존 | **단기 Play 배포에 1순위 후보** |
| **Capacitor** | WebView에 웹 자산을 싣고 네이티브 플러그인 브리지 | Camera 등 플러그인 확장 용이, 스토어 패키징 익숙 | 빌드 파이프라인·권한·업데이트 채널 추가 부담, 서버 URL/쿠키 정책 설계 필요 | **카메라·푸시 등 네이티브가 확정되면 전환** |
| **Cordova** | 구형 WebView 래퍼 | 레거시 생태계 | 신규 권장도 낮음, Capacitor로 대체되는 추세 | 비권장 |
| **React Native / 네이티브 재작성** | UI·로직 재구현 | 성능·네이티브 UX | `domain/` 재사용은 가능하나 UI·API 클라이언트 전면 재작성 | MVP 이후 |

### 선택 근거 (현재)

1. **동일 백엔드·비즈니스 로직 재사용**이 최우선이다. 원가·공헌이익은 이미 `src/domain` + `/api/v1`에 있다.
2. MVP 차별화(A–E)는 **결정론적 서버/도메인 계산**이지 네이티브 센서가 아니다.
3. 따라서 **1단계: HTTPS 배포 + PWA + (선택) TWA/Bubblewrap으로 Play에 웹 래퍼 게시**를 기본 경로로 둔다.
4. **카메라로 영수증/가격표 촬영 → 확인 후 반영**이 제품 로드맵에 확정되면 **2단계: Capacitor(또는 TWA 유지 + 웹 `getUserMedia`/`input capture`)로 재평가**한다.

**아직 하지 않은 것:** Bubblewrap 프로젝트 생성, `assetlinks.json` 배포, Capacitor `npx cap add android`, Play Console 앱 등록.

---

## 2. 모바일 화면·탐색 검증 체크리스트

웹(반응형)에서 확인할 항목. Android WebView/TWA에서도 동일 URL로 회귀한다.

- [ ] `/login` 가입·로그인, 세션 쿠키 유지
- [ ] 하단 탭(모바일): 홈·재료·메뉴·알림·시뮬
- [ ] `/ingredients` 목록·추가, 네트워크 오류 배너
- [ ] `/menus` 목록·추가, costing 표시(레시피 있을 때)
- [ ] `/dashboard` 섹션별 빈 상태·기간/기준 문구
- [ ] `/simulation` 전후 비교, 운영 데이터 미변경
- [ ] `/alerts` 주간 run · 데이터 부족 시 확정 알림 없음
- [ ] PWA 설치 배너(지원 브라우저), standalone 표시

---

## 3. 카메라 이미지 촬영 — 구현 가능성 (미구현)

| 경로 | 가능 여부 | 비고 |
|------|-----------|------|
| 웹 `<input type="file" accept="image/*" capture="environment">` | 가능(대부분 모바일 브라우저) | 추가 네이티브 코드 없이 촬영/갤러리 |
| 웹 `MediaDevices.getUserMedia` | 가능(HTTPS 필수) | 권한 UX·미리보기 직접 구현 |
| Capacitor Camera plugin | 가능 | 네이티브 권한·설정 필요. **현재 미도입** |
| TWA만 | 웹 Capability에 종속 | 별도 Camera API 브리지 없음 |

**결론:** 촬영 자체는 웹만으로도 가능. OCR·가격 자동 추출은 별도 파이프라인(모델/API)이며 **미구현**. 촬영 결과를 식재료 단가에 넣을 때는 기존처럼 **사용자 확인 후 history append** 규칙을 유지해야 한다.

---

## 4. 네트워크 오류·로딩

- 클라이언트: `src/lib/client-api.ts` — fetch 실패 시 `NETWORK_ERROR` 메시지.
- UI: `StatusBanner`로 로딩/오류 표시 (`ingredients` / `menus` / `alerts` / `login` / `simulation`).
- SW: `/api/*` 및 민감 라우트는 **캐시 금지**, 실패 시 `offline.html`만 제공.

---

## 5. Android 빌드·기기 테스트 방법 (예정 절차)

### 5.1 TWA (Bubblewrap) — 기본 후보

1. 프로덕션 HTTPS에 웹 배포 (PWA installability 충족).
2. `/.well-known/assetlinks.json`에 Play 앱 서명 SHA-256 등록.
3. [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)로 프로젝트 생성 (`bubblewrap init` / `bubblewrap build`).
4. 생성된 AAB/APK를 내부 테스트 트랙에 업로드.
5. 실제 기기에서 Custom Tab/TWA 전체화면, 로그인 쿠키, 하단 내비 확인.

### 5.2 Capacitor — 네이티브 확장 시

1. `npm i @capacitor/core @capacitor/cli` 후 `npx cap init`.
2. `npx cap add android`, 웹 빌드 산출물을 `webDir`로 연결.
3. API는 절대 URL(프로덕션) + CORS/쿠키 `SameSite` 정책 점검.
4. Android Studio에서 에뮬레이터·실기기 Run.
5. Camera 등 플러그인은 **필요 확정 후** 추가.

### 5.3 공통 기기 테스트

- Chrome remote debugging / Android Studio Logcat.
- 비행기 모드에서 민감 데이터가 디스크 캐시에 남지 않는지 확인.
- 세로 기본, 작은 폭(360px) 레이아웃.

---

## 6. Google Play — 공식 문서로 확인한 요건

아래는 확인 시점의 **Play Console 고객센터** 내용을 요약한 것이다. 계정 유형·생성 시점에 따라 다르며, **미확인 항목은 단정하지 않는다.**

### 6.1 개발자 계정 등록

출처: [Play Console 시작하기](https://support.google.com/googleplay/android-developer/answer/6112435)

- Google 계정으로 Play Console 등록
- Developer Distribution Agreement 수락
- **일회성 등록비 USD 25** (카드 종류·지역 제한 있음. 선불카드 미지원 명시)
- 계정 유형: **개인(personal)** 또는 **조직(organization)** ([유형 선택](https://support.google.com/googleplay/android-developer/answer/13634885))
- 신원 확인(정부 발급 신분증 등). 조직은 D-U-N-S 등 추가 가능 ([신원 확인](https://support.google.com/googleplay/android-developer/answer/10841920))

### 6.2 개인 계정 기기 확인

출처: [기기 확인 요건](https://support.google.com/googleplay/android-developer/answer/14316361)

- 신규 개인 계정은 Play Console 모바일 앱으로 **실제 Android 기기 접근 확인**이 필요할 수 있다.

### 6.3 개인 계정 테스트 후 프로덕션 (2023-11-13 이후 생성 계정)

출처: [개인 개발자 계정 앱 테스트 요구사항](https://support.google.com/googleplay/android-developer/answer/14151465) (한국어 동일)

- Google Play에 공개 배포하려면 **비공개(closed) 테스트**가 필요하다.
- 프로덕션 신청 시: **최소 12명의 테스터**가 **직전 14일 동안 연속으로** 테스트에 참여 중이어야 한다.
- 기준 충족 후 Play Console 대시보드에서 **프로덕션 액세스 신청** 및 질문 응답.
- 내부 테스트는 선택·권장. 공개 테스트는 프로덕션 액세스 이후.
- 검토 기간은 문서상 보통 7일 이내이나 더 걸릴 수 있다고 안내됨.

### 6.4 단정하지 않는 것

- 조직 계정에 동일 12/14 규칙이 적용되는지 여부 → **계정 유형별 콘솔 안내를 재확인**할 것.
- 수수료·정책·스토어 등록정보 필수 항목의 최신 목록 전부 → 출시 직전 공식 문서로 재확인.
- 본 문서 작성 이후 Play 정책 변경.

---

## 7. PWA vs Play 작업 분리

| 작업 | 산출물 | 스토어 |
|------|--------|--------|
| PWA | manifest, 아이콘, SW(shell-only), 설치 배너 | 없음 (브라우저 홈 화면) |
| Play (TWA/Capacitor) | 서명 AAB, 스토어 등록정보, 테스트 트랙 | Google Play |

둘 다 “모바일에서 쓰기”이지만 **배포 채널·심사·계정 요건이 다르다.**

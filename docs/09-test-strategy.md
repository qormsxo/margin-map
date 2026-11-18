# MarginMap 테스트 전략

| 항목 | 내용 |
|------|------|
| 단위/도메인 | Vitest |
| 관련 문서 | [07 공식](07-formulas.md), [06 API](06-api-spec.md), [10 구현 계획](10-implementation-plan.md) |

---

## 1. 목표

- 원가·공헌이익·차별화 규칙이 [07-formulas.md](07-formulas.md)와 **비트 단위로 가깝게** 일치
- “데이터 없음 → 분석 미생성” 회귀를 막음
- 수율·인건비 API/스키마가 실수로 들어가지 않음을 검사할 수 있는 기준 제공

---

## 2. 테스트 피라미드

| 계층 | 도구 | 대상 | 시기 |
|------|------|------|------|
| 도메인 단위 | Vitest | `domain/` 계산·규칙 | Phase 0부터 |
| API 통합 | Vitest + 테스트 DB | Route Handlers, Zod, Store 스코프 | Phase 1~ |
| UI 컴포넌트 | Vitest/RTL (선택) | 빈 상태·폼 검증 | 필요 시 |
| E2E | Playwright | 핵심 해피 패스 | Phase 안정화 후 |
| PWA/TWA | 수동 + 체크리스트 | 설치, assetlinks | Phase 3·5 |

---

## 3. 도메인 테스트 (필수)

골든 픽스처는 [07-formulas.md](07-formulas.md) §12와 동일 ID를 사용한다.

| ID | 검증 |
|----|------|
| G1 | unitCost |
| G2 | prepUnitCost |
| G3 | contribution, contributionMargin |
| G4 | DF-B deltaCost |
| G5 | variance: 실데이터 없으면 결과 없음 / 에러 코드 |
| G6 | weekly: 주 부족 시 alerts 빈 배열, dataSufficient=false |

추가 케이스:

- 프렙 중첩 1단·2단 전개
- 레시피 순환 → 에러
- 목표 공헌이익률 → \( P^* \) (분모 ≤ 0이면 에러)
- E1–E4 임계값 경계 (ちょうど 임계)

---

## 4. API 통합 테스트

- 인증 없이 401
- 타 Store 리소스 403/404
- Ingredient 단가 변경 → price-history 행 증가
- `GET /variance` 판매량·실제 없이 `DATA_INSUFFICIENT`
- `POST /weekly/run` 데이터 부족 시 alerts `[]`
- 요청 body에 `yieldRate` / `laborCost` 등 → VALIDATION_ERROR
- MVP에서 두 번째 Store 생성 시도 → 거부

---

## 5. 데이터 정직성 회귀 (필수)

다음을 CI에서 막는다.

1. 실제 사용·판매량 팩토리 없이 variance/contribution-analysis가 200 + 숫자 배열을 반환하지 않음
2. weekly가 부족한 주에 임의 알림을 만들지 않음
3. simulation preview가 Ingredient.currentUnitCost를 변경하지 않음

---

## 6. E2E (후순위)

최소 시나리오:

1. 가입 → 재료·프렙·메뉴 등록 → 대시보드에 공헌이익 표시
2. 재료가 변경 → 영향 메뉴 화면
3. 실제 사용 입력 후 차이 표시
4. 시뮬레이션 후 운영 단가 불변

---

## 7. PWA·Android 검증

| 항목 | 방법 |
|------|------|
| Manifest/SW | Chromium Application 패널 |
| 설치 | 실기기 또는 에뮬레이터 |
| assetlinks | `https://digitalassetlinks.googleapis.com/v1/statements:list?...` 또는 공식 확인 도구 |
| Play 내부 테스트 | TWA 풀스크린(주소창 없음) |

자동화보다 체크리스트 + 릴리스 전 수동을 우선한다.

---

## 8. 품질 게이트 (PR)

- `domain` 관련 변경: 골든 테스트 통과 필수
- 스키마 변경: 제외 필드 체크리스트 ([05-data-model.md](05-data-model.md) §6) 리뷰
- 계산 공식 문서와 테스트 기대값 동시 수정

---

## 9. 비범위

- AI 추출 정확도 SLA (후순위 기능)
- 대규모 부하 테스트 (초기 불필요)
- iOS 테스트

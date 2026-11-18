# MarginMap API 명세

| 항목 | 내용 |
|------|------|
| Base path | `/api/v1` |
| 스타일 | REST, JSON |
| 검증 | Zod (요청·응답) |
| Stage 1 확정본 | **[12-stage1-api-design.md](12-stage1-api-design.md)** (충돌 시 Stage 1 우선) |
| 관련 문서 | [05 데이터 모델](05-data-model.md), [07 공식](07-formulas.md), [08 아키텍처](08-architecture.md), [13 수집 가능성](13-data-collectability.md) |

> Stage 0 개요 문서다. 요청·응답 스키마·`/variance/runs`·`metricType` 등은 Stage 1 문서를 따른다.

---

## 1. 공통 규칙

### 1.1 인증·스코프

- 인증된 사용자만 접근 (세션 또는 Bearer — 구현 시 Auth 방식 확정).
- 모든 업무 API는 현재 사용자의 **Store** 스코프로 필터링한다.
- MVP: Organization당 Store 1개. `POST /stores` 추가 생성은 **405 또는 403**.

### 1.2 응답 형식

성공:

```json
{ "data": { } }
```

목록:

```json
{ "data": [ ], "meta": { "total": 0 } }
```

오류:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "사람이 읽을 수 있는 메시지",
    "details": []
  }
}
```

### 1.3 공통 오류 코드

| code | HTTP | 의미 |
|------|------|------|
| UNAUTHORIZED | 401 | 미인증 |
| FORBIDDEN | 403 | 타 Store 또는 권한 없음 |
| NOT_FOUND | 404 | 리소스 없음 |
| VALIDATION_ERROR | 400 | Zod 실패 |
| CONFLICT | 409 | 유니크·순환 레시피 등 |
| DATA_INSUFFICIENT | 422 | 분석에 필요한 실데이터 부족 (추정 생성 안 함) |
| NOT_IMPLEMENTED_MVP | 403/405 | 다매장 등 MVP 제외 |

### 1.4 계산 API 원칙

- 계산은 `domain/` 순수 함수만 호출한다.
- 서버가 판매량·실제 사용을 **추정해 저장하지 않는다**.
- `DATA_INSUFFICIENT`일 때 가짜 수치 배열을 반환하지 않는다.

---

## 2. Auth·Store

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/register` | 가입 → User + Organization + Store 1 + Member |
| POST | `/auth/login` | 로그인 |
| POST | `/auth/logout` | 로그아웃 |
| GET | `/me` | 현재 사용자·organization·store |
| GET | `/store` | 현재 매장 |
| PATCH | `/store` | 매장명 등 수정 |

---

## 3. Ingredients

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ingredients` | 목록 |
| POST | `/ingredients` | 생성 (unitCost 계산) |
| GET | `/ingredients/:id` | 상세 |
| PATCH | `/ingredients/:id` | 수정. 단가 관련 변경 시 history append + DF-B 재계산 트리거 가능 |
| DELETE | `/ingredients/:id` | 삭제 (레시피 참조 시 CONFLICT) |
| GET | `/ingredients/:id/price-history` | 가격 이력 |
| GET | `/ingredients/:id/price-impact` | DF-B: 최근 또는 `?historyId=` 기준 영향 메뉴 |

### POST/PATCH body (요약)

```json
{
  "name": "양파",
  "baseUnit": "g",
  "purchaseQty": 10000,
  "purchasePrice": 25000,
  "taxType": "EXEMPT"
}
```

`price-impact` 응답 예:

```json
{
  "data": {
    "ingredientId": "...",
    "previousUnitCost": 2.5,
    "newUnitCost": 3.0,
    "menus": [
      {
        "menuItemId": "...",
        "name": "된장찌개",
        "ingredientCostBefore": 1200,
        "ingredientCostAfter": 1350,
        "deltaCost": 150,
        "deltaCostRate": 0.125,
        "contributionBefore": 4800,
        "contributionAfter": 4650
      }
    ]
  }
}
```

---

## 4. Prep Recipes·Menus·Recipe Lines

| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/prep-recipes` | 프렙 목록/생성 |
| GET/PATCH/DELETE | `/prep-recipes/:id` | |
| PUT | `/prep-recipes/:id/lines` | 라인 일괄 치환 |
| GET/POST | `/menus` | 메뉴 |
| GET/PATCH/DELETE | `/menus/:id` | |
| PUT | `/menus/:id/lines` | 레시피 라인 |
| GET | `/menus/:id/costing` | 이론 원가·공헌이익 (채널 쿼리 가능) |
| GET | `/menus/:id/price-history` | 판매가 이력 |

레시피 라인:

```json
{
  "lines": [
    { "ingredientId": "...", "qty": 50, "unit": "g" },
    { "componentPrepId": "...", "qty": 30, "unit": "g" }
  ]
}
```

수율·인건비 필드 수용 시 **VALIDATION_ERROR**.

---

## 5. Sales Channels

| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/channels` | |
| PATCH/DELETE | `/channels/:id` | |
| PUT | `/menus/:id/channel-prices` | 채널별 판매가 |

---

## 6. Dashboard

| Method | Path | 설명 |
|--------|------|------|
| GET | `/dashboard/profitability` | 메뉴별 원가·공헌이익 요약 |
| GET | `/dashboard/alerts` | DF-E 미확인 알림 |

쿼리: `?channelId=`

---

## 7. DF-A Variance (이론 vs 실제)

| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/actual-usage-periods` | 기간 |
| PUT | `/actual-usage-periods/:id/lines` | 실제 사용 라인 |
| GET | `/variance` | `?periodId=` 이론·실제·차이. 부족 시 DATA_INSUFFICIENT |
| GET | `/variance/trend` | 기간별 추이 (입력 있는 기간만) |

`GET /variance` — 판매량으로 이론량을 못 만들면:

```json
{
  "error": {
    "code": "DATA_INSUFFICIENT",
    "message": "이론 소비량 계산에 필요한 판매량 또는 실제 사용 입력이 없습니다."
  }
}
```

---

## 8. DF-C Sales

| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/sales-periods` | |
| PUT | `/sales-periods/:id/lines` | 메뉴별 수량 |
| POST | `/sales-periods/:id/import` | CSV (Phase 2). MVP 말 수동만 가능하면 import는 501 |
| GET | `/contribution-analysis` | `?periodId=` 판매량×공헌이익 |

판매량 없이 분석 요청 → `DATA_INSUFFICIENT`.

---

## 9. DF-D Simulations

| Method | Path | 설명 |
|--------|------|------|
| POST | `/simulations/preview` | 비영속 what-if. body에 오버라이드 |
| GET/POST | `/simulations/scenarios` | 초안 저장 (고도화) |
| POST | `/simulations/required-price` | 목표 공헌이익률 → 필요 판매가 |
| POST | `/simulations/scenarios/:id/apply` | 운영 반영 (이력 규칙 적용, 명시적) |

`preview`는 DB에 시나리오를 쓰지 않는다.

---

## 10. DF-E Weekly Alerts

| Method | Path | 설명 |
|--------|------|------|
| POST | `/weekly/run` | 해당 주 스냅샷 산출·규칙 평가 |
| GET | `/weekly/snapshots` | |
| GET | `/alerts` | |
| POST | `/alerts/:id/acknowledge` | 확인 |

데이터 부족 시:

```json
{
  "data": {
    "dataSufficient": false,
    "alerts": [],
    "message": "연속 주간 데이터가 부족해 이상 징후를 생성하지 않았습니다."
  }
}
```

---

## 11. 버전·호환

- 웹·PWA·Android(TWA)는 동일 `/api/v1` 사용.
- Breaking change 시 `/api/v2` 또는 협의된 deprecation.

---

## 12. 제외 API (구현하지 않음)

- 수율 계산, 인건비·조리시간 관련 엔드포인트
- 다매장 전환·Store 다중 생성 (MVP)
- AI가 결과를 직접 확정 저장하는 엔드포인트 (보조 추출은 별도 draft + 사용자 확인)

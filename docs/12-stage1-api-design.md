# Stage 1: API 설계 (도메인별 요청·응답 스키마)

| 항목 | 내용 |
|------|------|
| Base | `/api/v1` |
| 검증 | Zod (구현 시 본 스키마와 1:1) |
| 데이터 | [11 데이터 설계](11-stage1-data-design.md) |
| 수집 | [13 수집 가능성](13-data-collectability.md) |
| 금지 | 수율·인건비 필드, `netProfit`, 추정 판매량 생성 |

---

## 1. 공통

### 1.1 Envelope

```ts
// 성공
type Ok<T> = { data: T };
type OkList<T> = { data: T[]; meta: { total: number } };

// 오류
type Err = {
  error: {
    code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "CONFLICT"
      | "DATA_INSUFFICIENT"
      | "NOT_IMPLEMENTED_MVP";
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
};
```

### 1.2 공통 헤더·컨텍스트

- 인증 필수 (세션 쿠키 또는 Bearer — 구현 시 확정).
- Store는 서버가 membership으로 해석. 클라이언트가 임의 `storeId`로 타매장 접근 불가.
- 금액: 정수 원(number) 또는 decimal string — **구현 시 decimal string 권장**. 본 문서 예시는 number.

### 1.3 지표 명명 (조건 10)

응답에 포함하는 수익 지표는 다음만 허용한다.

- `ingredientCost`, `channelCost`, `contribution`, `contributionMargin`
- **금지:** `netProfit`, `netMargin`, `operatingProfit`

### 1.4 수수료 객체 (조건 9)

```ts
type ChannelFees = {
  channelFeeRate: number;   // 0–1
  paymentFeeRate: number;   // 0–1
  deliveryFeeRate: number;  // 0–1
  deliveryFeeFixed: number; // KRW ≥ 0
  feeBasis: "PER_MENU_ITEM";
};
// channelCost = P*(channel+payment+delivery rates) + deliveryFeeFixed
// 동일 성격 이중 기입 금지 (서버는 합산만 수행, 의미 검증은 경고 가능)
```

---

## 2. Domain: Auth / Store

### POST `/auth/register`

**Request**

```ts
{ email: string; password: string; storeName: string; organizationName?: string }
```

**Response 201**

```ts
{
  data: {
    user: { id: string; email: string };
    organization: { id: string; name: string };
    store: { id: string; name: string; currency: "KRW" };
  }
}
```

### POST `/auth/login` → `{ data: { user, store } }`  
### GET `/me` → 현재 user + organization + store  
### GET/PATCH `/store` → `{ name }` 수정

`POST /stores` → `NOT_IMPLEMENTED_MVP`

---

## 3. Domain: Ingredients & Price History

### POST `/ingredients`

**Request**

```ts
{
  name: string;
  baseUnit: "G" | "ML" | "EA";
  purchaseQty: number;    // > 0
  purchasePrice: number;  // ≥ 0
  taxType: "TAXABLE" | "EXEMPT";
  notes?: string;
}
```

**Response 201**

```ts
{
  data: {
    id: string;
    name: string;
    baseUnit: "G" | "ML" | "EA";
    purchaseQty: number;
    purchasePrice: number;
    taxType: "TAXABLE" | "EXEMPT";
    currentUnitCost: number; // purchasePrice/purchaseQty
    notes: string | null;
  }
}
```

거부: `yieldRate`, `laborCost` 등 추가 키 → `VALIDATION_ERROR`

### PATCH `/ingredients/:id`

단가 관련 필드 변경 시 history append + `currentUnitCost` 갱신.

**Response**는 Ingredient + `priceHistoryId` (신규 이력 id).

### GET `/ingredients/:id/price-history`

```ts
{
  data: Array<{
    id: string;
    previousUnitCost: number;
    newUnitCost: number;
    effectiveAt: string; // ISO
    recordedAt: string;
    source: "MANUAL" | "CSV_IMPORT" | "AI_ASSIST_CONFIRMED";
  }>;
  meta: { total: number };
}
```

### GET `/ingredients/:id/price-impact?historyId=`

DF-B. history 없으면 최신 1건.

```ts
{
  data: {
    ingredientId: string;
    historyId: string;
    previousUnitCost: number;
    newUnitCost: number;
    metricType: "CONTRIBUTION"; // 명시
    menus: Array<{
      menuItemId: string;
      name: string;
      usageQty: number; // 전개 사용량
      ingredientCostBefore: number;
      ingredientCostAfter: number;
      deltaCost: number;
      deltaCostRate: number | null;
      contributionBefore: number;
      contributionAfter: number;
      deltaContribution: number;
    }>;
  }
}
```

---

## 4. Domain: Menus / Prep / Recipes

### POST `/prep-recipes`

```ts
{ name: string; yieldQty: number; yieldUnit: "G" | "ML" | "EA" }
```

`yieldQty` = 산출량. 수율 비율 필드 없음.

### PUT `/prep-recipes/:id/lines` · `PUT /menus/:id/lines`

**Request**

```ts
{
  lines: Array<
    | { ingredientId: string; qty: number; unit: "G" | "ML" | "EA" }
    | { componentPrepId: string; qty: number; unit: "G" | "ML" | "EA" }
  >;
}
```

순환 → `CONFLICT`

### POST `/menus`

```ts
{
  name: string;
  sellingPrice: number;
  vatInclusive: boolean;
  defaultChannelId?: string;
  isActive?: boolean;
}
```

### GET `/menus/:id/costing?channelId=`

**지금** 기준 실시간 이론 원가 (Master). 과거 분석용 아님.

```ts
{
  data: {
    menuItemId: string;
    channelId: string;
    sellingPrice: number;
    ingredientCost: number;
    channelCost: number;
    contribution: number;
    contributionMargin: number | null;
    metricType: "CONTRIBUTION";
    costAsOf: "CURRENT_MASTER";
    lines: Array<{
      componentType: "INGREDIENT" | "PREP";
      refId: string;
      name: string;
      qty: number;
      unitCost: number;
      lineCost: number;
    }>;
  }
}
```

---

## 5. Domain: Sales Channels

### POST `/channels`

```ts
{
  name: string;
  channelFeeRate: number;
  paymentFeeRate: number;
  deliveryFeeRate: number;
  deliveryFeeFixed: number;
  isDefault?: boolean;
}
```

서버가 `feeBasis: "PER_MENU_ITEM"` 고정 설정.

### PUT `/menus/:id/channel-prices`

```ts
{
  prices: Array<{ salesChannelId: string; sellingPrice: number }>;
}
```

수수료 필드 포함 시 `VALIDATION_ERROR`.

---

## 6. Domain: Sales Volume (기간별 판매량)

### POST `/sales-periods`

```ts
{
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // exclusive 권장
  grain: "DAY" | "WEEK" | "CUSTOM";
}
```

### PUT `/sales-periods/:id/lines`

```ts
{
  lines: Array<{
    menuItemId: string;
    qty: number; // > 0
    salesChannelId?: string;
  }>;
  source: "MANUAL";
}
```

- 빈 배열 허용 (전체 삭제 후 재저장 의미는 구현 정책: **replace all**).
- `qty` 누락·0 → VALIDATION_ERROR. 미판매 메뉴는 배열에서 제외.

### POST `/sales-periods/:id/import`

**Request:** multipart CSV  
**Columns (확정):** `menu_name` 또는 `menu_id`, `qty`, optional `channel_name`

```ts
{
  data: {
    imported: number;
    skipped: Array<{ line: number; reason: string }>;
    source: "CSV_IMPORT";
  }
}
```

추정 채움 없음. 매칭 실패 행은 skipped.

### GET `/contribution-analysis?periodId=&channelId=`

```ts
{
  data: {
    periodId: string;
    metricType: "CONTRIBUTION";
    costAsOf: "CURRENT_MASTER" | "SNAPSHOT";
    costBasisSnapshotId: string | null;
    menus: Array<{
      menuItemId: string;
      name: string;
      salesQty: number;
      contributionPerUnit: number;
      totalContribution: number;
    }>;
    excludedMenuCount: number; // 판매량 없어 제외된 활성 메뉴 수
  }
}
```

SalesLine 0건 → `DATA_INSUFFICIENT` (menus를 가짜로 채우지 않음).

---

## 7. Domain: Actual Usage & Variance (이론 vs 실제)

### POST `/actual-usage-periods`

```ts
{
  periodStart: string;
  periodEnd: string;
  alignedSalesPeriodId?: string;
  note?: string;
}
```

### PUT `/actual-usage-periods/:id/lines`

```ts
{
  lines: Array<{
    ingredientId: string;
    actualQty?: number;
    actualCost?: number;
    unit?: "G" | "ML" | "EA";
  }>;
  source: "MANUAL" | "CSV_IMPORT";
}
```

각 라인: `actualQty` 또는 `actualCost` 필수.

### POST `/actual-usage-periods/:id/import`

판매량 import와 동일 정책. CSV 컬럼: `ingredient_id` 또는 `ingredient_name`, `actual_qty`+`unit` 또는 `actual_cost`.  
`source: "CSV_IMPORT"`. 매칭 실패는 skip. 추정 채움 없음.

### POST `/variance/runs`

분석 실행. 스냅샷을 생성·고정한다 (조건 2·8).

**Request**

```ts
{
  actualUsagePeriodId: string;
  salesPeriodId: string;
  channelId?: string;
  asOfAt?: string; // default = periodEnd
}
```

**Response 200 — 성공**

```ts
{
  data: {
    analysisRunId: string;
    status: "COMPLETED";
    costBasisSnapshotId: string;
    metricType: "CONTRIBUTION"; // 차이 금액 산출 기준 단가 추적
    results: Array<{
      ingredientId: string;
      name: string;
      theoQty: number;
      theoAmt: number;
      actualQty: number | null;
      actualCost: number | null;
      actualAmt: number | null;
      varianceQty: number | null;
      varianceAmt: number | null;
      varianceRate: number | null;
      unitCostUsed: number;
    }>;
    evidence: {
      salesLineCount: number;
      actualLineCount: number;
      menusWithSales: number;
      menusExcludedNoSales: number;
    };
  }
}
```

**Response — 부족**

```ts
{
  data: {
    analysisRunId: string;
    status: "INSUFFICIENT_DATA";
    costBasisSnapshotId: string | null;
    results: [];
    insufficientReason: "NO_SALES" | "NO_ACTUAL_USAGE" | "NO_RECIPES";
    evidence: { /* counts */ };
  }
}
```

또는 HTTP 422 `DATA_INSUFFICIENT` — **구현은 200+status 권장**(감사 run 남김). 클라이언트는 `results` 빈 배열을 숫자로 해석하지 말 것.

### GET `/variance/trend?from=&to=`

입력이 있는 기간의 run만 반환.

---

## 8. Domain: Simulation (운영 분리)

### POST `/simulations/preview`

DB 미기록.

**Request**

```ts
{
  channelId: string;
  menuIds?: string[]; // default: all active
  overrides: {
    menuPrices?: Record<string, number>;
    ingredientUnitCosts?: Record<string, number>;
    channelFees?: Partial<ChannelFees>;
  };
}
```

**Response**

```ts
{
  data: {
    persisted: false;
    metricType: "CONTRIBUTION";
    menus: Array<{
      menuItemId: string;
      before: {
        sellingPrice: number;
        ingredientCost: number;
        channelCost: number;
        contribution: number;
        contributionMargin: number | null;
      };
      after: { /* same shape */ };
    }>;
  }
}
```

### POST `/simulations/required-price`

```ts
// request
{ menuItemId: string; channelId: string; targetContributionMargin: number; ingredientCostOverride?: number }
// response
{ data: { requiredSellingPrice: number; metricType: "CONTRIBUTION" } }
```

### POST `/simulations/scenarios` · GET · PATCH

`draft` 저장. 운영 테이블 불변.

### POST `/simulations/scenarios/:id/apply`

**Request:** `{ confirm: true }`  
**Effect:** draft의 가격·단가를 운영에 반영 + history append.  
**Response:** 생성된 `ingredientPriceHistoryIds`, `menuPriceHistoryIds`.

---

## 9. Domain: Weekly Anomalies & Alerts

### POST `/weekly/run`

**Request**

```ts
{
  weekStart: string; // ISO Monday YYYY-MM-DD
  channelId?: string;
}
```

**Response**

```ts
{
  data: {
    weeklySnapshotId: string;
    weekStart: string;
    weekEnd: string;
    channelId: string;
    basisVersion: "weekly-rules-v1";
    costBasisSnapshotId: string | null;
    priorWeekStart: string | null;
    dataSufficient: boolean;
    insufficientReason: string | null;
    alerts: Array<{
      id: string;
      ruleId: "E1" | "E2" | "E3" | "E4";
      severity: "INFO" | "WARN";
      title: string;
      body: string;
      entityType: "MENU" | "INGREDIENT" | null;
      entityId: string | null;
      evidence: {
        currentValue: number;
        priorValue: number | null;
        threshold: number;
        relatedHistoryId?: string;
        analysisRunId?: string;
      };
    }>;
  }
}
```

`dataSufficient=false` → `alerts: []` (조건 7·허위 금지).

### GET `/alerts?acknowledged=false`  
### POST `/alerts/:id/acknowledge` → `{ data: { id, acknowledgedAt } }`

### GET `/dashboard/profitability?channelId=`

현재 Master 기준 목록. `metricType: "CONTRIBUTION"`.

### GET `/dashboard/alerts`

미확인 알림 요약.

---

## 10. 도메인별 라우트 맵

| Domain | Prefix / 주요 경로 |
|--------|-------------------|
| Auth/Store | `/auth/*`, `/me`, `/store` |
| Ingredients | `/ingredients`, `.../price-history`, `.../price-impact` |
| Recipes | `/prep-recipes`, `/menus`, `.../lines`, `.../costing` |
| Channels | `/channels`, `/menus/:id/channel-prices` |
| Sales | `/sales-periods`, `.../lines`, `.../import`, `/contribution-analysis` |
| Actual/Variance | `/actual-usage-periods`, `/variance/runs`, `/variance/trend` |
| Simulation | `/simulations/preview`, `required-price`, `scenarios` |
| Weekly/Alerts | `/weekly/run`, `/alerts`, `/dashboard/*` |

---

## 11. Stage 0 API 대비 변경점

1. `POST /variance/runs`로 실행·스냅샷·evidence 명시 (단순 GET만으로 부족).
2. 모든 수익 응답에 `metricType: "CONTRIBUTION"`.
3. Sales/Actual에 `source` 필수.
4. Weekly 응답에 `basisVersion`, `priorWeekStart`, `evidence`.
5. Simulation `persisted: false` 및 apply 분리.
6. `netProfit` 미정의.

충돌 시 본 문서가 Stage 0 [06-api-spec.md](06-api-spec.md)보다 우선한다.

# MarginMap 계산 공식 및 예시

| 항목 | 내용 |
|------|------|
| 통화 | KRW |
| 원칙 | 결정론적. 반올림 규칙은 아래 “정밀도” 절 |
| 관련 문서 | [01 PRD](01-product-requirements.md), [05 데이터 모델](05-data-model.md) |
| 제외 | 수율(손질 손실), 인건비·조리시간 비용 |

---

## 1. 정밀도

- 금액: 원 단위 반올림 (계산 중간은 Decimal, 표시·저장 시 원).
- 비율: 소수점 4자리까지 내부 계산, 표시는 % 소수점 1자리.
- 단위 환산은 동일 baseUnit 기준. 환산 불가 시 계산 거부.

---

## 2. 식재료 단위원가

\[
unitCost = \frac{purchasePrice}{purchaseQty}
\]

`purchaseQty`는 `baseUnit`으로 환산된 수량이다.

### 예시

- 양파 10 kg = 10,000 g, 구매가 25,000원  
- \( unitCost = 25000 / 10000 = 2.5 \) 원/g

면/과세는 **표시·리포트용**으로 보존한다. 공헌이익 기본식의 분자·분모 정의(부가세 포함 판매가 여부)는 메뉴의 `vatInclusive` 플래그를 UI에 명시하고, MVP 기본은 **사용자가 입력한 판매가 그대로** 사용한다.

---

## 3. 프렙(반제품) 단위원가

프렙 총원가:

\[
prepTotalCost = \sum_i (lineQty_i \times componentUnitCost_i)
\]

프렙 단위원가:

\[
prepUnitCost = \frac{prepTotalCost}{yieldQty}
\]

`yieldQty`는 산출량이다. **손질 수율(손실률)로 나누거나 곱하지 않는다.**

### 예시 — 떡볶이 소스 프렙

| 재료 | 투입 | 단가 | 원가 |
|------|------|------|------|
| 고춧가루 | 8 g | 12원/g | 96원 |
| 물엿 | 15 g | 3원/g | 45원 |
| **합계** | | | **141원** |
| 산출량 | 93 g | | |

\[
prepUnitCost = 141 / 93 \approx 1.5161 \text{ 원/g}
\]

---

## 4. 메뉴 식재료원가

\[
ingredientCost = \sum_j (lineQty_j \times unitCost_j)
\]

`unitCost_j`는 식재료 `currentUnitCost` 또는 하위 프렙 `prepUnitCost`다. 중첩 프렙은 재귀적으로 전개하되 순환이면 오류.

### 예시 — 메뉴 “매콤떡볶이” (단순화)

| 라인 | 수량 | 단가 | 원가 |
|------|------|------|------|
| 밀떡 | 150 g | 4원/g | 600원 |
| 떡볶이 소스(프렙) | 100 g | 1.5161원/g | 152원 |
| 양파 | 30 g | 2.5원/g | 75원 |
| **식재료원가** | | | **827원** |

---

## 5. 채널·결제·배달 비용

판매가 \( P \), 채널수수료율 \( r_c \), 결제수수료율 \( r_p \), 배달 비율 \( r_d \), 고정 배달비 \( F_d \):

\[
channelCost = P \times (r_c + r_p + r_d) + F_d
\]

MVP에서 배달비 적용 단위(메뉴 1건)는 채널 설정에 따르고, UI에 단위를 표시한다.

### 예시

- \( P = 9000 \), \( r_c = 0.06 \), \( r_p = 0.03 \), \( r_d = 0 \), \( F_d = 0 \)  
- \( channelCost = 9000 \times 0.09 = 810 \)원

---

## 6. 공헌이익·공헌이익률

\[
contribution = P - ingredientCost - channelCost
\]

\[
contributionMargin = \frac{contribution}{P}
\]

\( P = 0 \)이면 공헌이익률은 정의하지 않고 오류/미표시.

**순이익과 구분:** 공헌이익은 인건비·임차료·기타 고정비를 빼지 않는다. 스키마·API·UI에서 이 값을 순이익으로 부르거나 `netProfit` 필드로 노출하지 않는다 ([11](11-stage1-data-design.md) 조건 10).

### 예시

- \( P = 9000 \), \( ingredientCost = 827 \), \( channelCost = 810 \)  
- \( contribution = 9000 - 827 - 810 = 7363 \)원  
- \( contributionMargin = 7363 / 9000 \approx 81.8\% \)

---

## 7. DF-A 이론 vs 실제

기간 메뉴 판매량 \( q_m \), 레시피 식재료 투입량 \( r_{m,i} \):

\[
theoQty_i = \sum_m (q_m \times r_{m,i})
\]

(프렙 경유 투입은 전개 후 식재료로 합산.)

실제 수량 \( actualQty_i \), 이론 단가(기간 대표 단가) \( u_i \):

\[
varianceQty_i = actualQty_i - theoQty_i
\]

\[
varianceAmt_i = varianceQty_i \times u_i
\]

실제 금액을 직접 입력한 경우:

\[
theoAmt_i = theoQty_i \times u_i,\quad varianceAmt_i = actualCost_i - theoAmt_i
\]

\[
varianceRate_i = \frac{varianceAmt_i}{theoAmt_i} \quad (theoAmt_i \neq 0)
\]

판매량·실제 입력이 없으면 위 값을 **계산·저장하지 않는다**.

### 예시

- 이론 양파 소비 5,000 g, 실제 5,800 g, \( u = 2.5 \)  
- \( varianceQty = 800 \), \( varianceAmt = 2000 \), \( varianceRate = 800/5000 = 16\% \)

---

## 8. DF-B 가격 변동 영향

식재료 \( i \)의 단가가 \( u^{old} \) → \( u^{new} \)일 때, 메뉴 \( m \)에서 전개된 사용량 \( r_{m,i} \):

\[
\Delta ingredientCost_m = r_{m,i} \times (u^{new} - u^{old})
\]

(동일 재료가 프렙을 통해 여러 번 들어가면 전개 합산량 사용.)

\[
\Delta contribution_m = - \Delta ingredientCost_m
\]

(판매가·수수료 불변 가정. 시뮬레이션에서 판매가를 같이 바꾸면 별도 재계산.)

\[
\Delta costRate_m = \frac{\Delta ingredientCost_m}{ingredientCost_m^{old}} \quad (분모 \neq 0)
\]

### 예시

- 메뉴에 양파 30 g, 단가 2.5 → 3.0  
- \( \Delta ingredientCost = 30 \times 0.5 = 15 \)원  
- 공헌이익 15원 감소

---

## 9. DF-C 판매량 × 공헌이익

\[
totalContribution_m = contribution_m \times salesQty_m
\]

고판매·저공헌 / 저판매·고공헌은 중앙값 또는 사용자 임계값으로 사분면 분류한다. 판매량 없으면 분석 없음.

---

## 10. DF-D 목표 공헌이익률 → 필요 판매가

목표 공헌이익률 \( t \) (0–1), 식재료원가 \( C \), 고정 배달비 \( F_d \), 비율 수수료 합 \( r = r_c + r_p + r_d \):

\[
contribution = P - C - (P \cdot r + F_d) = P(1-r) - C - F_d
\]

\[
\frac{contribution}{P} = t \implies P(1-r) - C - F_d = t P
\]

\[
P(1 - r - t) = C + F_d
\]

\[
P^* = \frac{C + F_d}{1 - r - t} \quad (1 - r - t > 0)
\]

### 예시

- \( C = 827 \), \( F_d = 0 \), \( r = 0.09 \), \( t = 0.70 \)  
- \( P^* = 827 / (1 - 0.09 - 0.70) = 827 / 0.21 \approx 3938 \)원  

(실제 운영 판매가 9,000원이면 목표 70%는 여유. 목표가 높거나 원가가 크면 \( P^* \)가 상승.)

---

## 11. DF-E 주간 규칙 (기본값 제안)

\( X_{w} \) = 이번 주 지표, \( X_{w-1} \) = 이전 주.

| 규칙 | 조건 | 비고 |
|------|------|------|
| E1 | \( ingredientCost_w / ingredientCost_{w-1} - 1 \ge 0.05 \) | 메뉴별 |
| E2 | \( contributionMargin_w - contributionMargin_{w-1} \le -0.03 \) | pp |
| E3 | 차이율 악화가 임계 이상 | **실데이터 있는 재료·메뉴만** |
| E4 | 해당 주 단가 상승 이력 있는 재료를 쓰는 메뉴 | DF-B 연계 |

연속 2주 데이터·`dataSufficient=true`가 아니면 알림 리스트는 빈 배열.

임계값은 Store 설정으로 덮어쓸 수 있게 설계한다 (MVP는 상수 기본값).

---

## 12. 검증용 골든 케이스 (테스트 공유)

| ID | 입력 요약 | 기대 |
|----|-----------|------|
| G1 | purchase 25000/10000g | unitCost 2.5 |
| G2 | 프렙 141원/93g | prepUnitCost ≈ 1.5161 |
| G3 | 메뉴 원가 827, P 9000, r 0.09 | contribution 7363, CM ≈ 0.8181 |
| G4 | 양파 30g, +0.5원/g | deltaCost 15 |
| G5 | 실제 없이 variance API | DATA_INSUFFICIENT / 빈 결과 |
| G6 | 주 1개만 weekly run | alerts=[], dataSufficient=false |

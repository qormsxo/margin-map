"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";
import { parseAmount } from "@/lib/parse-amount";
import { useNumericInputMode } from "@/lib/use-numeric-input-mode";

type SalesPeriod = { id: string; periodStart: string; periodEnd: string; grain: string };

type Purchase = {
  id: string;
  purchasedOn: string;
  amount: number;
  supplier: string | null;
  note: string | null;
};

type Priority = {
  ingredientId: string;
  name: string;
  theoAmt: number;
  share: number;
  cumulativeShare: number;
};

type VarianceResult =
  | {
      status: "COMPLETED";
      basis: "PURCHASES_ONLY" | "PURCHASES_WITH_INVENTORY";
      theoreticalCost: number;
      purchasesTotal: number;
      actualCost: number;
      varianceAmt: number;
      varianceRate: number | null;
      countPriorities: Priority[];
      evidence: { menusWithoutRecipe: number };
    }
  | {
      status: "INSUFFICIENT_DATA";
      countPriorities: Priority[];
      emptyState: { message: string; requiredInput: string };
    };

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

export default function PurchasesPage() {
  const inputModes = useNumericInputMode();
  const [periods, setPeriods] = useState<SalesPeriod[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [result, setResult] = useState<VarianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasedOn, setPurchasedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [supplier, setSupplier] = useState("");
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");

  const [appliedInventory, setAppliedInventory] = useState<{
    opening: number;
    closing: number;
  } | null>(null);

  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const period = periods.find((p) => p.id === periodId) ?? null;

  // Keep the date inside the selected period (today if it falls inside, else the 1st).
  useEffect(() => {
    if (!period) return;

    const today = new Date().toISOString().slice(0, 10);

    setPurchasedOn(today >= period.periodStart && today <= period.periodEnd ? today : period.periodStart);
  }, [period]);

  // Suppliers used before, most frequent first.
  useEffect(() => {
    void (async () => {
      const res = await apiFetch<Purchase[]>("/api/v1/purchases");

      if (!res.ok) return;

      const counts = new Map<string, number>();

      for (const p of res.data) {
        if (p.supplier) counts.set(p.supplier, (counts.get(p.supplier) ?? 0) + 1);
      }

      setSuppliers([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s));
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<SalesPeriod[]>("/api/v1/sales-periods");
      setLoading(false);

      if (!res.ok) {
        setError(res.status === 401 ? "로그인이 필요합니다." : res.message);

        return;
      }

      setPeriods(res.data);
      setPeriodId(res.data[0]?.id ?? "");
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!period) return;

    const list = await apiFetch<Purchase[]>(
      `/api/v1/purchases?from=${period.periodStart}&to=${period.periodEnd}`,
    );

    if (list.ok) setPurchases(list.data);

    const params = new URLSearchParams({ periodId: period.id });

    if (appliedInventory) {
      params.set("openingInventory", String(appliedInventory.opening));
      params.set("closingInventory", String(appliedInventory.closing));
    }

    const variance = await apiFetch<VarianceResult>(`/api/v1/purchase-variance?${params}`);

    if (!variance.ok) {
      setError(variance.message);

      return;
    }

    setError(null);
    setResult(variance.data);
  }, [period, appliedInventory]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const amountValue = parseAmount(amount);

  async function addPurchase() {
    if (amountValue === null || amountValue < 0) return;

    const res = await apiFetch<Purchase>("/api/v1/purchases", {
      method: "POST",
      body: JSON.stringify({
        purchasedOn,
        amount: amountValue,
        supplier: supplier.trim() || undefined,
      }),
    });

    if (!res.ok) {
      setError(res.message);

      return;
    }

    const name = supplier.trim();

    if (name && !suppliers.includes(name)) setSuppliers((list) => [...list, name]);

    // Same day, next receipt: keep the date, clear amount and supplier.
    setAmount("");
    setSupplier("");
    amountRef.current?.focus();
    await refresh();
  }

  const purchasesTotal = purchases.reduce((sum, p) => sum + p.amount, 0);

  async function removePurchase(id: string) {
    await apiFetch(`/api/v1/purchases/${id}`, { method: "DELETE" });
    await refresh();
  }

  const openingValue = parseAmount(opening);
  const closingValue = parseAmount(closing);
  const inventoryHalf = (openingValue === null) !== (closingValue === null);

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <header className="space-y-2">
        <p className="eyebrow uppercase">Purchases</p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">매입으로 보는 실제 원가</h1>
        <p className="text-sm text-muted">
          재고를 셀 필요 없습니다. 한 달 동안 산 재료 영수증 금액을 넣으면, 레시피대로 썼을 때의
          재료비와 비교해서 새는 돈이 있는지 보여 줍니다.
        </p>
      </header>

      {loading ? <StatusBanner kind="loading" message="불러오는 중…" /> : null}
      {error ? <StatusBanner kind="error" message={error} /> : null}

      {!loading && periods.length === 0 && !error ? (
        <StatusBanner
          kind="info"
          message="판매 기간이 없습니다. 먼저 판매 기간(월 단위 권장)과 판매량을 입력하세요."
        />
      ) : null}

      {periods.length > 0 ? (
        <label className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          판매 기간
          <select
            className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.grain === "MONTH"
                  ? `${p.periodStart.slice(0, 4)}년 ${Number(p.periodStart.slice(5, 7))}월`
                  : `${p.periodStart} ~ ${p.periodEnd}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {period ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void addPurchase();
            }}
            className="space-y-3 rounded-xl border border-line bg-surface p-4"
          >
            <h2 className="text-sm font-medium text-ink">매입 추가</h2>
            <p className="text-xs text-faint">
              레시피에 들어가는 식재료 매입만 넣으세요. 포장재를 재료로 등록하지 않았다면 포장재
              매입은 빼야 비교가 맞습니다.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                type="date"
                className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                value={purchasedOn}
                min={period.periodStart}
                max={period.periodEnd}
                onChange={(e) => setPurchasedOn(e.target.value)}
              />
              <input
                ref={amountRef}
                className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                placeholder="금액 (예: 268만)"
                inputMode={inputModes.numeric}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <input
                className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                placeholder="거래처 (선택)"
                list="supplier-list"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
              <datalist id="supplier-list">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            {suppliers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suppliers.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSupplier(s);
                      amountRef.current?.focus();
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${supplier === s ? "border-accent text-accent" : "border-line-strong text-muted"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={amountValue === null || amountValue < 0}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
            >
              추가 (Enter)
            </button>
            {purchases.length > 0 ? (
              <ul className="divide-y divide-line text-sm">
                <li className="flex justify-between py-2 text-muted">
                  <span>이 기간 매입 {purchases.length}건</span>
                  <span className="font-medium text-ink">{won(purchasesTotal)}</span>
                </li>
                {purchases.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span className="text-ink-soft">
                      {p.purchasedOn} {p.supplier ? `· ${p.supplier}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-ink">{won(p.amount)}</span>
                      <button
                        type="button"
                        onClick={() => void removePurchase(p.id)}
                        className="rounded px-2 py-1 text-xs text-loss hover:bg-subtle"
                      >
                        삭제
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>

          <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <button
              type="button"
              onClick={() => setShowInventory((v) => !v)}
              className="flex w-full items-center justify-between text-sm text-ink"
            >
              <span>더 정확하게: 달 초·달 말 남은 재료 금액 (선택)</span>
              <span className="text-xs text-faint">{showInventory ? "접기" : "펼치기"}</span>
            </button>
            {showInventory ? (
            <>
            <p className="text-xs leading-relaxed text-faint">
              이번 달에 산 재료가 다 이번 달에 쓰이는 건 아닙니다. 지난달에 사 둔 걸 이번 달에 쓰기도 하고,
              이번 달에 산 게 냉장고에 남기도 합니다. 그래서 <b className="text-ink-soft">달 초에 남아 있던 재료</b>와
              <b className="text-ink-soft"> 달 말에 남은 재료</b>를 대충이라도 돈으로 치면 실제 쓴 금액이 정확해집니다.
              (실제 쓴 금액 = 달 초 재고 + 이번 달 매입 − 달 말 재고) 모르면 비워 두세요.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                placeholder="달 초 남아 있던 재료 (예: 80만)"
                inputMode={inputModes.numeric}
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
              <input
                className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                placeholder="달 말 남은 재료 (예: 95만)"
                inputMode={inputModes.numeric}
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
              />
              <button
                type="button"
                disabled={inventoryHalf}
                onClick={() =>
                  setAppliedInventory(
                    openingValue !== null && closingValue !== null
                      ? { opening: openingValue, closing: closingValue }
                      : null,
                  )
                }
                className="rounded-lg border border-accent px-3 py-2 text-sm text-accent-ink disabled:opacity-40"
              >
                다시 계산
              </button>
            </div>
            {inventoryHalf ? (
              <p className="text-xs text-warn">달 초·달 말 둘 다 넣어야 반영됩니다.</p>
            ) : null}
            </>
            ) : null}
          </section>

          {result?.status === "COMPLETED" ? (
            <section className="space-y-3 rounded-xl border border-line card p-4">
              <h2 className="text-sm font-medium text-ink">
                레시피 재료비 vs 실제 매입{" "}
                <span className="text-xs text-faint">
                  ({result.basis === "PURCHASES_ONLY" ? "매입 기준 근사" : "매입 + 재고 증감"})
                </span>
              </h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-faint">레시피대로 썼을 때 재료비</dt>
                  <dd className="text-lg text-ink">{won(result.theoreticalCost)}</dd>
                </div>
                <div>
                  <dt className="text-faint">실제 쓴 재료비 (매입 기준)</dt>
                  <dd className="text-lg text-ink">{won(result.actualCost)}</dd>
                </div>
                <div>
                  <dt className="text-faint">차이</dt>
                  <dd
                    className={`text-lg ${result.varianceAmt > 0 ? "text-loss" : "text-gain"}`}
                  >
                    {result.varianceAmt > 0 ? "+" : ""}
                    {won(result.varianceAmt)} ({pct(result.varianceRate)})
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-faint">
                {result.varianceRate !== null && result.varianceRate < -0.15
                  ? "실제가 레시피 원가보다 훨씬 적습니다. 매입 영수증이 빠졌거나, 지난달에 사 둔 재료를 이번 달에 쓴 경우입니다. 빠진 매입을 넣거나 달 초·달 말 재료 금액을 넣어 보세요."
                  : result.varianceRate !== null && result.varianceRate > 0.05
                    ? "실제가 레시피 원가보다 많습니다. 버린 재료(로스), 레시피보다 많이 담기, 레시피에 빠진 재료, 판매량 누락 중 하나입니다."
                    : result.varianceRate !== null && result.varianceRate < -0.05
                      ? "실제가 레시피 원가보다 조금 적습니다. 빠진 매입이 없는지 확인해 보세요."
                      : "레시피 원가와 거의 같습니다. 레시피대로 잘 쓰고 있습니다."}
                {result.evidence.menusWithoutRecipe > 0
                  ? ` 레시피 없는 판매 메뉴 ${result.evidence.menusWithoutRecipe}개는 이론 원가에서 빠졌습니다.`
                  : ""}
              </p>
            </section>
          ) : null}

          {result?.status === "INSUFFICIENT_DATA" ? (
            <StatusBanner
              kind="info"
              message={`${result.emptyState.message} 필요 입력: ${result.emptyState.requiredInput}`}
            />
          ) : null}

          {result && result.countPriorities.length > 0 ? (
            <section className="space-y-2 rounded-xl border border-line bg-surface p-4">
              <h2 className="text-sm font-medium text-ink">이것만 세면 됩니다</h2>
              <p className="text-xs text-faint">
                이 기간 이론 원가 비중이 큰 재료입니다. 재료별로 어디서 새는지 보려면 이 몇 개만
                실사해서 실사용량을 입력하세요.
              </p>
              <ol className="space-y-1 text-sm">
                {result.countPriorities.map((p, i) => (
                  <li key={p.ingredientId} className="flex justify-between">
                    <span className="text-ink">
                      {i + 1}. {p.name}
                    </span>
                    <span className="text-muted">
                      {won(p.theoAmt)} · {pct(p.share)} (누적 {pct(p.cumulativeShare)})
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : null}

      <Link href="/dashboard" className="text-sm text-accent-ink">
        ← 대시보드
      </Link>
    </div>
  );
}

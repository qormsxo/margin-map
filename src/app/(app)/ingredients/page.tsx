"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/ui/status-banner";
import { findBusinessType, type SuggestedIngredient } from "@/lib/business-types";
import { apiFetch } from "@/lib/client-api";
import { parseAmount } from "@/lib/parse-amount";
import { useNumericInputMode } from "@/lib/use-numeric-input-mode";

type BaseUnit = "G" | "ML" | "EA";

type PurchaseUnit = "G" | "KG" | "ML" | "L" | "EA";

type Ingredient = {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  purchaseQty: number;
  purchasePrice: number;
  taxType: "TAXABLE" | "EXEMPT";
  currentUnitCost: number;
  yieldRate: number;
  effectiveUnitCost: number;
};

const UNIT_LABEL: Record<BaseUnit, string> = { G: "g", ML: "ml", EA: "개" };

const PURCHASE_UNITS: Array<{ value: PurchaseUnit; label: string; base: BaseUnit }> = [
  { value: "KG", label: "kg", base: "G" },
  { value: "G", label: "g", base: "G" },
  { value: "L", label: "L", base: "ML" },
  { value: "ML", label: "ml", base: "ML" },
  { value: "EA", label: "개", base: "EA" },
];

const formatUnitCost = (v: number) =>
  v.toLocaleString("ko-KR", { maximumFractionDigits: v < 100 ? 2 : 0 });

/** 5000g → "5kg", 18000ml → "18L", otherwise base unit. */
function formatPurchaseQty(qty: number, unit: BaseUnit) {
  if (unit !== "EA" && qty >= 1000 && qty % 100 === 0) {
    return `${(qty / 1000).toLocaleString("ko-KR")}${unit === "G" ? "kg" : "L"}`;
  }

  return `${qty.toLocaleString("ko-KR")}${UNIT_LABEL[unit]}`;
}

export default function IngredientsPage() {
  const inputModes = useNumericInputMode();
  const nameRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState<PurchaseUnit>("KG");
  const [yieldPercent, setYieldPercent] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedIngredient[]>([]);
  const priceRef = useRef<HTMLInputElement>(null);
  const unitFromSuggestion = useRef(false);

  const load = useCallback(async () => {
    const result = await apiFetch<Ingredient[]>("/api/v1/ingredients");

    setLoading(false);

    if (!result.ok) {
      setError(result.status === 401 ? "로그인이 필요합니다." : result.message);
      setItems([]);

      return;
    }

    setItems(result.data);
  }, []);

  useEffect(() => {
    void load();

    if (new URLSearchParams(window.location.search).has("welcome")) {
      setInfo("판매 채널을 준비했어요. 이제 재료부터 넣어 볼까요? 아래 칩을 누르면 빨라요.");
    }

    void apiFetch<{ businessType: string | null }>("/api/v1/store").then((res) => {
      if (res.ok) setSuggestions(findBusinessType(res.data.businessType)?.ingredients ?? []);
    });
  }, [load]);

  // Tap a suggestion: name, unit and usual pack size are filled; only the price is left.
  function applySuggestion(s: SuggestedIngredient) {
    setName(s.name);
    setPurchaseUnit(s.unit);
    unitFromSuggestion.current = true;
    setPurchaseQty(String(s.qty));
    priceRef.current?.focus();
  }

  const qtyValue = parseAmount(purchaseQty);
  const priceValue = parseAmount(purchasePrice);
  const canSubmit = !busy && name.trim() !== "" && (qtyValue ?? 0) > 0 && (priceValue ?? -1) >= 0;

  async function create(event: React.FormEvent) {
    event.preventDefault();

    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    const unit = PURCHASE_UNITS.find((u) => u.value === purchaseUnit)!;
    const yieldValue = parseAmount(yieldPercent);

    const result = await apiFetch<Ingredient>("/api/v1/ingredients", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        baseUnit: unit.base,
        purchaseUnit,
        purchaseQty: qtyValue,
        purchasePrice: priceValue,
        taxType: "TAXABLE",
        yieldRate: (yieldValue === null ? 100 : yieldValue) / 100,
      }),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    // Keep a unit the owner picked (the next item is usually bought the same way),
    // but not one a suggestion chip filled in: 포장용기 "개" must not carry over to 대파.
    if (unitFromSuggestion.current) setPurchaseUnit("KG");

    unitFromSuggestion.current = false;
    setName("");
    setPurchaseQty("");
    setPurchasePrice("");
    setYieldPercent("");
    setItems((list) => [...list, result.data].sort((a, b) => a.name.localeCompare(b.name, "ko")));
    nameRef.current?.focus();
  }

  async function patch(item: Ingredient, body: Record<string, number>, done: string) {
    setError(null);
    setInfo(null);

    const result = await apiFetch<Ingredient>(`/api/v1/ingredients/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setItems((list) => list.map((i) => (i.id === item.id ? result.data : i)));
    setInfo(done);
  }

  function updatePrice(item: Ingredient, text: string) {
    const price = parseAmount(text);

    if (price === null || price < 0 || price === item.purchasePrice) return;

    void patch(
      item,
      { purchasePrice: price },
      price > item.purchasePrice
        ? `${item.name} 가격이 올라서 이상징후에 알림을 남겼습니다.`
        : `${item.name} 가격을 바꿨습니다.`,
    );
  }

  function updateYield(item: Ingredient, text: string) {
    const percent = parseAmount(text);

    if (percent === null || !(percent > 0 && percent <= 100) || percent === Math.round(item.yieldRate * 1000) / 10) {
      return;
    }

    void patch(item, { yieldRate: percent / 100 }, `${item.name} 수율을 바꿨습니다.`);
  }

  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const visible = search.trim()
    ? items.filter((i) => i.name.includes(search.trim()))
    : items;

  const pendingSuggestions = suggestions.filter((sg) => !items.some((i) => i.name === sg.name));

  const input = "min-w-0 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm";

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <header className="space-y-2">
        <p className="eyebrow uppercase">Ingredients</p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">식재료</h1>
        <p className="text-sm text-muted">
          한 번에 사는 양과 가격을 넣으면 1g·1ml·1개당 단가가 계산됩니다. 값이 바뀌면 목록에서 가격만
          고치세요. 이력이 남고, 오르면 바로 알림이 생깁니다.
        </p>
      </header>

      {loading ? <StatusBanner kind="loading" message="불러오는 중…" /> : null}
      {error ? <StatusBanner kind="error" message={error} /> : null}
      {info ? <StatusBanner kind="info" message={info} /> : null}

      <form
        onSubmit={(e) => void create(e)}
        className="space-y-3 rounded-xl border border-line bg-surface p-4"
      >
        <h2 className="text-sm font-medium text-ink">새 식재료</h2>
        {pendingSuggestions.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-faint">자주 쓰는 재료 · 누르면 양과 단위가 채워지고 가격만 넣으면 됩니다</p>
            <div className="flex flex-wrap gap-1.5">
              {pendingSuggestions.map((sg) => (
                <button
                  key={sg.name}
                  type="button"
                  onClick={() => applySuggestion(sg)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    name === sg.name
                      ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                      : "border-line-strong bg-surface text-ink-soft hover:border-brand hover:text-brand"
                  }`}
                >
                  + {sg.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_6rem_1.5fr_6rem]">
          <input
            ref={nameRef}
            className={input}
            placeholder="이름 (예: 양파)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={input}
            inputMode={inputModes.decimal}
            placeholder="한 번에 사는 양"
            value={purchaseQty}
            onChange={(e) => setPurchaseQty(e.target.value)}
          />
          <select
            aria-label="단위"
            className={input}
            value={purchaseUnit}
            onChange={(e) => {
              const next = PURCHASE_UNITS.find((u) => u.value === e.target.value);

              if (!next) return;

              setPurchaseUnit(next.value);
              unitFromSuggestion.current = false;
            }}
          >
            {PURCHASE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
          <input
            ref={priceRef}
            className={input}
            inputMode={inputModes.numeric}
            placeholder="그 가격 (예: 13.4만)"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />
          <input
            aria-label="손질 수율 %"
            className={input}
            inputMode={inputModes.decimal}
            placeholder="수율 100%"
            value={yieldPercent}
            onChange={(e) => setYieldPercent(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
          >
            추가 (Enter)
          </button>
          <span className="text-xs text-faint">
            수율은 손질 후 남는 비율입니다. 비워 두면 100%. 예: 양파 껍질 벗기면 90%
          </span>
        </div>
      </form>

      {items.length > 5 ? (
        <input
          className={`${input} w-full`}
          placeholder="재료 찾기"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      ) : null}

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="font-medium text-ink">{item.name}</div>
              <div className="text-xs text-accent-ink">
                1{UNIT_LABEL[item.baseUnit]}당 {formatUnitCost(item.currentUnitCost)}원
                {item.yieldRate < 1 ? (
                  <span className="ml-2 text-warn">
                    → 손질 후 {formatUnitCost(item.effectiveUnitCost)}원
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{formatPurchaseQty(item.purchaseQty, item.baseUnit)}에</span>
              <input
                key={`${item.id}-p-${item.purchasePrice}`}
                aria-label={`${item.name} 구매가`}
                className="w-28 rounded border border-line-strong bg-surface px-2 py-1 text-right text-sm text-ink"
                inputMode={inputModes.numeric}
                defaultValue={item.purchasePrice.toLocaleString("ko-KR")}
                onKeyDown={blurOnEnter}
                onBlur={(e) => updatePrice(item, e.target.value)}
              />
              <span>원 · 수율</span>
              <input
                key={`${item.id}-y-${item.yieldRate}`}
                aria-label={`${item.name} 수율`}
                className="w-14 rounded border border-line-strong bg-surface px-2 py-1 text-right text-sm text-ink"
                inputMode={inputModes.decimal}
                defaultValue={String(Math.round(item.yieldRate * 1000) / 10)}
                onKeyDown={blurOnEnter}
                onBlur={(e) => updateYield(item, e.target.value)}
              />
              <span>%</span>
            </div>
          </li>
        ))}
        {!loading && items.length === 0 && !error ? (
          <li className="px-4 py-6 text-sm text-faint">식재료가 없습니다. 위에서 추가하세요.</li>
        ) : null}
      </ul>

      <Link href="/dashboard" className="text-sm text-accent-ink">
        ← 대시보드
      </Link>
    </div>
  );
}

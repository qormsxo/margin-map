"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";
import { parseAmount } from "@/lib/parse-amount";
import { useNumericInputMode } from "@/lib/use-numeric-input-mode";

type Category = "LABOR" | "RENT" | "UTILITIES" | "OTHER";

type FixedCost = {
  id: string;
  name: string;
  category: Category;
  monthlyAmount: number;
};

type FixedCostList = { items: FixedCost[]; monthlyTotal: number };

const CATEGORY_LABEL: Record<Category, string> = {
  LABOR: "인건비",
  RENT: "임대료",
  UTILITIES: "공과금",
  OTHER: "기타",
};

function isCategory(value: string): value is Category {
  return value === "LABOR" || value === "RENT" || value === "UTILITIES" || value === "OTHER";
}

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;

export default function FixedCostsPage() {
  const inputModes = useNumericInputMode();
  const [data, setData] = useState<FixedCostList>({ items: [], monthlyTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("LABOR");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const presets = (
    [
    { name: "직원·알바 인건비", category: "LABOR" },
    { name: "월세", category: "RENT" },
    { name: "전기·가스·수도", category: "UTILITIES" },
    { name: "포스·인터넷·통신", category: "OTHER" },
    { name: "보험·세무", category: "OTHER" },
    ] satisfies Array<{ name: string; category: Category }>
  ).filter((p) => !data.items.some((item) => item.name === p.name));

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<FixedCostList>("/api/v1/fixed-costs");
    setLoading(false);

    if (!result.ok) {
      setError(result.status === 401 ? "로그인이 필요합니다." : result.message);

      return;
    }

    setError(null);
    setData(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);

    const result = await apiFetch<FixedCost>("/api/v1/fixed-costs", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), category, monthlyAmount: parseAmount(amount) }),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setName("");
    setAmount("");
    await load();
  }

  async function updateAmount(item: FixedCost, text: string) {
    const value = parseAmount(text);

    if (value === null || value < 0 || value === item.monthlyAmount) return;

    const result = await apiFetch<FixedCost>(`/api/v1/fixed-costs/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ monthlyAmount: value }),
    });

    if (!result.ok) setError(result.message);

    await load();
  }

  async function remove(item: FixedCost) {
    const result = await apiFetch(`/api/v1/fixed-costs/${item.id}`, { method: "DELETE" });

    if (!result.ok) setError(result.message);

    await load();
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400/80">Fixed costs</p>
        <h1 className="text-3xl font-semibold text-white">월 고정비</h1>
        <p className="text-sm text-slate-400">
          인건비·임대료처럼 판매량과 무관하게 나가는 돈입니다. 메뉴에 나눠 붙이지 않고, 판매 기간의
          총 공헌이익에서 빼서 <strong className="text-slate-200">실제 남는 돈(영업이익)</strong>과
          손익분기 매출을 계산합니다.
        </p>
      </header>

      {loading ? <StatusBanner kind="loading" message="불러오는 중…" /> : null}
      {error ? <StatusBanner kind="error" message={error} /> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();

          if (!busy && name.trim() && parseAmount(amount) !== null) void create();
        }}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
      >
        <h2 className="text-sm font-medium text-slate-200">항목 추가</h2>
        {presets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setName(p.name);
                  setCategory(p.category);
                  amountRef.current?.focus();
                }}
                className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-500/60"
              >
                {p.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="이름 (예: 알바 2명)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={category}
            onChange={(e) => {
              if (isCategory(e.target.value)) setCategory(e.target.value);
            }}
          >
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            ref={amountRef}
            placeholder="월 금액 (예: 237만)"
            inputMode={inputModes.numeric}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !name.trim() || parseAmount(amount) === null}
          className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-40"
        >
          추가 (Enter)
        </button>
      </form>

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
        {data.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium text-slate-100">{item.name}</div>
              <div className="text-xs text-slate-500">{CATEGORY_LABEL[item.category]}</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                key={`${item.id}-${item.monthlyAmount}`}
                className="w-32 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right text-slate-200"
                inputMode={inputModes.numeric}
                defaultValue={item.monthlyAmount.toLocaleString("ko-KR")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                onBlur={(e) => void updateAmount(item, e.target.value)}
              />
              <span className="text-slate-500">원/월</span>
              <button
                type="button"
                onClick={() => void remove(item)}
                className="rounded px-2 py-1 text-xs text-rose-300 hover:bg-slate-800"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
        {!loading && data.items.length === 0 && !error ? (
          <li className="px-4 py-6 text-sm text-slate-500">
            고정비가 없습니다. 인건비·임대료부터 넣어 보세요.
          </li>
        ) : null}
        {data.items.length > 0 ? (
          <li className="flex justify-between bg-slate-900 px-4 py-3 text-sm">
            <span className="text-slate-400">월 합계</span>
            <span className="font-semibold text-white">{won(data.monthlyTotal)}</span>
          </li>
        ) : null}
      </ul>

      <div className="flex gap-4 text-sm">
        <Link href="/contribution" className="text-sky-300">
          실제 이익 보기 →
        </Link>
        <Link href="/dashboard" className="text-slate-400">
          ← 대시보드
        </Link>
      </div>
    </div>
  );
}

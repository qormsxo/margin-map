"use client";

import { useState } from "react";
import { parseAmount } from "@/lib/parse-amount";

type Line = { id: number; name: string; cost: string };

type Channel = { id: string; label: string; feeRate: number; perOrder: number };

/** Example rates for a quick estimate; the guide explains how to get the real ones. */
const CHANNELS: Channel[] = [
  { id: "hall", label: "홀 (카드 1.5%)", feeRate: 0.015, perOrder: 0 },
  { id: "delivery", label: "배달앱 (예시: 수수료 10.8% + 배달비 2,900원)", feeRate: 0.108, perOrder: 2900 },
  { id: "custom", label: "직접 입력", feeRate: 0, perOrder: 0 },
];

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function MenuCostCalculator() {
  const [price, setPrice] = useState("");

  const [lines, setLines] = useState<Line[]>([
    { id: 1, name: "", cost: "" },
    { id: 2, name: "", cost: "" },
    { id: 3, name: "", cost: "" },
  ]);

  const [channelId, setChannelId] = useState("hall");
  const [customRate, setCustomRate] = useState("");
  const [customPerOrder, setCustomPerOrder] = useState("");

  const sellingPrice = parseAmount(price) ?? 0;
  const ingredientCost = lines.reduce((sum, l) => sum + (parseAmount(l.cost) ?? 0), 0);
  const channel = CHANNELS.find((c) => c.id === channelId) ?? CHANNELS[0]!;
  const feeRate = channelId === "custom" ? (parseAmount(customRate) ?? 0) / 100 : channel.feeRate;
  const perOrder = channelId === "custom" ? (parseAmount(customPerOrder) ?? 0) : channel.perOrder;
  const fees = sellingPrice * feeRate + perOrder;
  const left = sellingPrice - ingredientCost - fees;
  const ready = sellingPrice > 0;

  function update(id: number, patch: Partial<Line>) {
    setLines((list) => list.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  const input = "w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[15px]";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <form className="card space-y-5 p-5 sm:p-6" onSubmit={(e) => e.preventDefault()} aria-label="메뉴 원가 입력">
        <div>
          <label htmlFor="calc-price" className="text-sm font-bold text-heading">
            판매가
          </label>
          <input
            id="calc-price"
            className={`${input} mt-1.5`}
            placeholder="예: 5,000 또는 5천"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-bold text-heading">재료비 (메뉴 1개에 들어가는 만큼)</legend>
          <div className="mt-1.5 space-y-2">
            {lines.map((l, i) => (
              <div key={l.id} className="grid grid-cols-[1fr_8rem_2rem] gap-2">
                <input
                  aria-label={`재료 ${i + 1} 이름`}
                  className={input}
                  placeholder={i === 0 ? "예: 떡볶이떡 250g" : "재료 이름"}
                  value={l.name}
                  onChange={(e) => update(l.id, { name: e.target.value })}
                />
                <input
                  aria-label={`재료 ${i + 1} 금액`}
                  className={`${input} text-right`}
                  placeholder="750"
                  value={l.cost}
                  onChange={(e) => update(l.id, { cost: e.target.value })}
                />
                <button
                  type="button"
                  aria-label={`재료 ${i + 1} 지우기`}
                  onClick={() => setLines((list) => list.filter((x) => x.id !== l.id))}
                  className="rounded-lg text-faint hover:bg-subtle hover:text-ink"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLines((list) => [...list, { id: Date.now(), name: "", cost: "" }])}
            className="mt-2 text-sm font-semibold text-brand hover:text-heading"
          >
            + 재료 추가
          </button>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold text-heading">어디서 팔았나요?</legend>
          <div className="mt-1.5 space-y-1.5">
            {CHANNELS.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                <input
                  type="radio"
                  name="channel"
                  value={c.id}
                  checked={channelId === c.id}
                  onChange={() => setChannelId(c.id)}
                  className="accent-[var(--color-accent)]"
                />
                {c.label}
              </label>
            ))}
          </div>
          {channelId === "custom" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                aria-label="수수료율 %"
                className={input}
                placeholder="수수료 % (예: 10.8)"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
              />
              <input
                aria-label="주문당 배달비 원"
                className={input}
                placeholder="주문당 배달비 (원)"
                value={customPerOrder}
                onChange={(e) => setCustomPerOrder(e.target.value)}
              />
            </div>
          ) : null}
        </fieldset>
      </form>

      <section aria-live="polite" aria-labelledby="calc-result" className="rounded-3xl bg-pine-900 p-6 text-white sm:p-7">
        <h2 id="calc-result" className="text-sm text-pine-200">
          메뉴 1개 팔면 남는 돈
        </h2>
        <p className={`mt-2 text-4xl font-bold tracking-tight ${left < 0 ? "text-[#ff9a7a]" : ""}`}>
          {ready ? won(left) : "—"}
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-pine-700 pt-5 text-sm">
          <div>
            <dt className="text-pine-300">재료비</dt>
            <dd className="mt-0.5 text-lg font-semibold">{won(ingredientCost)}</dd>
          </div>
          <div>
            <dt className="text-pine-300">원가율</dt>
            <dd className="mt-0.5 text-lg font-semibold">{ready ? pct(ingredientCost / sellingPrice) : "—"}</dd>
          </div>
          <div>
            <dt className="text-pine-300">수수료·배달비</dt>
            <dd className="mt-0.5 text-lg font-semibold">{won(fees)}</dd>
          </div>
          <div>
            <dt className="text-pine-300">남는 비율</dt>
            <dd className="mt-0.5 text-lg font-semibold">{ready ? pct(left / sellingPrice) : "—"}</dd>
          </div>
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-pine-300">
          배달비는 주문 1건 기준입니다. 한 주문에 메뉴가 여러 개면 메뉴당 배달비 부담은 줄어듭니다.
        </p>
      </section>
    </div>
  );
}

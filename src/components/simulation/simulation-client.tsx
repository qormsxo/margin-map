"use client";

import { useEffect, useState } from "react";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";
import { useNumericInputMode } from "@/lib/use-numeric-input-mode";

type PreviewMenu = {
  menuItemId: string;
  name: string;
  before: {
    sellingPrice: number;
    ingredientCost: number;
    channelCost: number;
    contribution: number;
    contributionMargin: number | null;
  };
  after: {
    sellingPrice: number;
    ingredientCost: number;
    channelCost: number;
    contribution: number;
    contributionMargin: number | null;
  };
};

type PreviewData = { menus: PreviewMenu[]; persisted: boolean };

type Channel = { id: string; name: string; isDefault: boolean };

type Menu = { id: string; name: string };

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;

export function SimulationClient() {
  const inputModes = useNumericInputMode();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [channelId, setChannelId] = useState("");
  const [priceDelta, setPriceDelta] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [targetPercent, setTargetPercent] = useState("");
  const [menuId, setMenuId] = useState("");
  const [preview, setPreview] = useState<PreviewMenu[] | null>(null);
  const [requiredPrice, setRequiredPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [channelRes, menuRes] = await Promise.all([
        apiFetch<Channel[]>("/api/v1/channels"),
        apiFetch<Menu[]>("/api/v1/menus"),
      ]);

      if (!channelRes.ok) {
        setError(channelRes.status === 401 ? "로그인이 필요합니다." : channelRes.message);

        return;
      }

      setChannels(channelRes.data);
      setChannelId((channelRes.data.find((c) => c.isDefault) ?? channelRes.data[0])?.id ?? "");

      if (menuRes.ok) {
        setMenus(menuRes.data);
        setMenuId(menuRes.data[0]?.id ?? "");
      }
    })();
  }, []);

  async function runPreview() {
    setBusy(true);
    setError(null);

    const overrides =
      feePercent === ""
        ? {}
        : { channelFees: { channelFeeRate: Number(feePercent) / 100 } };

    const first = await apiFetch<PreviewData>("/api/v1/simulations/preview", {
      method: "POST",
      body: JSON.stringify({ channelId, overrides }),
    });

    if (!first.ok) {
      setBusy(false);
      setError(first.message);
      setPreview(null);

      return;
    }

    const delta = Number(priceDelta) || 0;
    let rows = first.data.menus;

    if (delta !== 0) {
      const withPrices: Record<string, number> = {};

      for (const m of rows) {
        withPrices[m.menuItemId] = m.before.sellingPrice + delta;
      }

      const second = await apiFetch<PreviewData>("/api/v1/simulations/preview", {
        method: "POST",
        body: JSON.stringify({
          channelId,
          overrides: {
            channelFees:
              "channelFees" in overrides ? overrides.channelFees : undefined,
            menuPrices: withPrices,
          },
        }),
      });

      if (!second.ok) {
        setBusy(false);
        setError(second.message);
        setPreview(null);

        return;
      }

      rows = second.data.menus;
    }

    setPreview(rows);
    setBusy(false);
  }

  async function runRequiredPrice() {
    setBusy(true);
    setError(null);

    const result = await apiFetch<{ requiredSellingPrice: number }>(
      "/api/v1/simulations/required-price",
      {
        method: "POST",
        body: JSON.stringify({
          menuItemId: menuId,
          channelId,
          targetContributionMargin: Number(targetPercent) / 100,
        }),
      },
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      setRequiredPrice(null);

      return;
    }

    setRequiredPrice(result.data.requiredSellingPrice);
  }

  const inputClass = "w-full rounded-lg border border-line-strong bg-subtle px-3 py-2";

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <p className="text-sm text-muted">
        여기서 바꾼 값은 저장되지 않습니다. 마음껏 바꿔 보세요.
      </p>

      {busy ? <StatusBanner kind="loading" message="계산 중…" /> : null}
      {error ? <StatusBanner kind="error" message={error} /> : null}

      {!error && channels.length === 0 ? (
        <StatusBanner kind="info" message="판매 채널(홀·배달 등)을 먼저 등록해야 계산할 수 있습니다." />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted">판매 채널</span>
          <select
            className={inputClass}
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">모든 메뉴 가격을 (원) 올리거나 내리기</span>
          <input
            className={inputClass}
            inputMode={inputModes.numeric}
            placeholder="예: 500 (내리려면 -500)"
            value={priceDelta}
            onChange={(e) => setPriceDelta(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">채널 수수료를 바꿔 보기 (%, 선택)</span>
          <input
            className={inputClass}
            inputMode={inputModes.decimal}
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
            placeholder="예: 10"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={busy || !channelId}
        onClick={() => void runPreview()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
      >
        바꾸기 전후 비교
      </button>

      {preview ? (
        <div className="overflow-auto rounded-xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-subtle text-muted">
              <tr>
                <th className="px-3 py-2">메뉴</th>
                <th className="px-3 py-2">지금 남는 돈</th>
                <th className="px-3 py-2">바꾼 뒤</th>
                <th className="px-3 py-2">차이</th>
                <th className="px-3 py-2">바꾼 뒤 마진율</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => {
                const diff = row.after.contribution - row.before.contribution;

                return (
                  <tr key={row.menuItemId} className="border-t border-line">
                    <td className="px-3 py-2 text-ink">{row.name}</td>
                    <td className="px-3 py-2">{won(row.before.contribution)}</td>
                    <td className="px-3 py-2">{won(row.after.contribution)}</td>
                    <td className={`px-3 py-2 ${diff < 0 ? "text-loss" : "text-gain"}`}>
                      {diff > 0 ? "+" : ""}
                      {won(diff)}
                    </td>
                    <td className="px-3 py-2">
                      {row.after.contributionMargin === null
                        ? "—"
                        : `${(row.after.contributionMargin * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">
          원하는 마진율을 내려면 얼마에 팔아야 할까?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted">메뉴</span>
            <select
              className={inputClass}
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">목표 마진율 (%)</span>
            <input
              className={inputClass}
              inputMode={inputModes.decimal}
              placeholder="예: 70"
              value={targetPercent}
              onChange={(e) => setTargetPercent(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy || !channelId || !menuId || targetPercent === ""}
          onClick={() => void runRequiredPrice()}
          className="rounded-lg border border-accent/50 px-4 py-2 text-sm text-accent-ink disabled:opacity-40"
        >
          필요한 판매가 계산
        </button>
        {requiredPrice !== null ? (
          <p className="text-lg text-ink">{won(requiredPrice)}</p>
        ) : null}
      </section>
    </div>
  );
}

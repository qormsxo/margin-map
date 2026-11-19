"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";
import { CHANNEL_PRESETS } from "@/lib/business-types";
import { parseAmount } from "@/lib/parse-amount";
import { useNumericInputMode } from "@/lib/use-numeric-input-mode";

type Channel = {
  id: string;
  name: string;
  channelFeeRate: number;
  paymentFeeRate: number;
  deliveryFeeRate: number;
  deliveryFeeFixed: number;
  isDefault: boolean;
};

type Menu = { id: string; name: string; sellingPrice: number; isActive: boolean };

type Period = {
  id: string;
  periodStart: string;
  periodEnd: string;
  grain: string;
  lines: Array<{ menuItemId: string; salesChannelId: string | null; qty: number }>;
  orderCounts: Array<{ salesChannelId: string; orderCount: number }>;
};

const PRESETS = CHANNEL_PRESETS;

const cellKey = (menuId: string, channelId: string) => `${menuId}:${channelId}`;

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();

  return { periodStart: `${month}-01`, periodEnd: `${month}-${String(last).padStart(2, "0")}` };
}

function periodLabel(p: Period) {
  if (p.grain === "MONTH") {
    const [y, m] = p.periodStart.split("-");

    return `${y}년 ${Number(m)}월`;
  }

  return `${p.periodStart} ~ ${p.periodEnd}`;
}

const toNumber = (text: string) => {
  const value = parseAmount(text);

  return value !== null && value > 0 ? value : 0;
};

const pct = (rate: number) => String(Math.round(rate * 1000) / 10);

export default function SalesPage() {
  const inputModes = useNumericInputMode();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [cells, setCells] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showChannels, setShowChannels] = useState(false);

  // Owners usually enter a month's totals after it ends → default to last month.
  const [newMonth, setNewMonth] = useState(() => {
    const now = new Date();
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    return last.toISOString().slice(0, 7);
  });

  const load = useCallback(async () => {
    const [c, m, p] = await Promise.all([
      apiFetch<Channel[]>("/api/v1/channels"),
      apiFetch<Menu[]>("/api/v1/menus"),
      apiFetch<Period[]>("/api/v1/sales-periods"),
    ]);

    setLoading(false);

    if (!c.ok || !m.ok || !p.ok) {
      const failed = [c, m, p].find((r) => !r.ok);

      setError(failed && !failed.ok && failed.status === 401 ? "로그인이 필요합니다." : "불러오지 못했습니다.");

      return;
    }

    setChannels(c.data);
    setMenus(m.data.filter((menu) => menu.isActive));
    setPeriods(p.data);
    setPeriodId((current) => current || p.data[0]?.id || "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const period = periods.find((p) => p.id === periodId) ?? null;

  // Fill the grid from the saved period.
  useEffect(() => {
    if (!period) return;

    const nextCells: Record<string, string> = {};

    for (const line of period.lines) {
      if (!line.salesChannelId) continue;

      nextCells[cellKey(line.menuItemId, line.salesChannelId)] = String(line.qty);
    }

    const nextOrders: Record<string, string> = {};

    for (const c of period.orderCounts) nextOrders[c.salesChannelId] = String(c.orderCount);

    setCells(nextCells);
    setOrders(nextOrders);
    setDirty(false);
  }, [period]);

  const deliveryChannels = channels.filter((c) => c.deliveryFeeFixed > 0);

  const totals = useMemo(() => {
    const byMenu: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    let all = 0;

    for (const menu of menus) {
      for (const channel of channels) {
        const qty = toNumber(cells[cellKey(menu.id, channel.id)] ?? "");

        byMenu[menu.id] = (byMenu[menu.id] ?? 0) + qty;
        byChannel[channel.id] = (byChannel[channel.id] ?? 0) + qty;
        all += qty;
      }
    }

    return { byMenu, byChannel, all };
  }, [cells, menus, channels]);

  const previousPeriod =
    period === null
      ? null
      : (periods
          .filter((p) => p.periodStart < period.periodStart && p.lines.length > 0)
          .sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0] ?? null);

  function copyPrevious() {
    if (!previousPeriod) return;

    const nextCells: Record<string, string> = {};

    for (const line of previousPeriod.lines) {
      if (line.salesChannelId) nextCells[cellKey(line.menuItemId, line.salesChannelId)] = String(line.qty);
    }

    const nextOrders: Record<string, string> = {};

    for (const c of previousPeriod.orderCounts) nextOrders[c.salesChannelId] = String(c.orderCount);

    setCells(nextCells);
    setOrders(nextOrders);
    setDirty(true);
    setInfo(`${periodLabel(previousPeriod)} 숫자를 가져왔습니다. 바뀐 것만 고치고 저장하세요.`);
  }

  /** Enter / ↓ moves down a row in the same channel column, ↑ moves up. */
  function moveFocus(e: React.KeyboardEvent<HTMLInputElement>, mi: number, ci: number) {
    const delta = e.key === "Enter" || e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;

    if (delta === 0) return;

    e.preventDefault();

    const target = document.querySelector<HTMLInputElement>(`[data-cell="${mi + delta}:${ci}"]`);

    target?.focus();
    target?.select();
  }

  /** Paste a block copied from Excel/POS (tabs between columns, newlines between rows). */
  function pasteBlock(e: React.ClipboardEvent<HTMLInputElement>, mi: number, ci: number) {
    const text = e.clipboardData.getData("text");

    if (!/[\t\n]/.test(text.trim())) return;

    e.preventDefault();

    const grid = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((line, i, all) => line !== "" || i < all.length - 1)
      .map((line) => line.split("\t"));

    setCells((prev) => {
      const next = { ...prev };

      grid.forEach((cols, r) => {
        const menu = menus[mi + r];

        if (!menu) return;

        cols.forEach((value, c) => {
          const channel = channels[ci + c];

          if (channel) next[cellKey(menu.id, channel.id)] = value.trim();
        });
      });

      return next;
    });

    setDirty(true);
  }

  async function createMonth() {
    setError(null);
    setInfo(null);

    const existing = periods.find(
      (p) => p.periodStart === monthRange(newMonth).periodStart && p.grain === "MONTH",
    );

    if (existing) {
      setPeriodId(existing.id);

      return;
    }

    const res = await apiFetch<Period>("/api/v1/sales-periods", {
      method: "POST",
      body: JSON.stringify({ ...monthRange(newMonth), grain: "MONTH" }),
    });

    if (!res.ok) {
      setError(res.message);

      return;
    }

    setPeriods((list) => [res.data, ...list].sort((a, b) => b.periodStart.localeCompare(a.periodStart)));
    setPeriodId(res.data.id);
  }

  async function save() {
    if (!period) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    const lines = menus.flatMap((menu) =>
      channels
        .map((channel) => ({
          menuItemId: menu.id,
          salesChannelId: channel.id,
          qty: toNumber(cells[cellKey(menu.id, channel.id)] ?? ""),
        }))
        .filter((line) => line.qty > 0),
    );

    const counts = deliveryChannels.map((channel) => ({
      salesChannelId: channel.id,
      orderCount: Math.round(toNumber(orders[channel.id] ?? "")),
    }));

    const linesRes = await apiFetch<Period>(`/api/v1/sales-periods/${period.id}/lines`, {
      method: "PUT",
      body: JSON.stringify({ lines, source: "MANUAL" }),
    });

    if (!linesRes.ok) {
      setBusy(false);
      setError(linesRes.message);

      return;
    }

    const countsRes = await apiFetch<Period>(`/api/v1/sales-periods/${period.id}/order-counts`, {
      method: "PUT",
      body: JSON.stringify({ counts }),
    });

    setBusy(false);

    if (!countsRes.ok) {
      setError(countsRes.message);

      return;
    }

    setPeriods((list) => list.map((p) => (p.id === countsRes.data.id ? countsRes.data : p)));
    setDirty(false);
    setInfo("저장했습니다.");
  }

  async function addChannel(preset: (typeof PRESETS)[number]) {
    const res = await apiFetch<Channel>("/api/v1/channels", {
      method: "POST",
      body: JSON.stringify({ ...preset, deliveryFeeRate: 0, isDefault: channels.length === 0 }),
    });

    if (!res.ok) {
      setError(res.message);

      return;
    }

    setChannels((list) => [...list, res.data]);
  }

  async function updateChannel(channel: Channel, patch: Partial<Channel>) {
    const res = await apiFetch<Channel>(`/api/v1/channels/${channel.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      setError(res.message);

      return;
    }

    setChannels((list) =>
      list.map((c) =>
        c.id === res.data.id ? res.data : patch.isDefault ? { ...c, isDefault: false } : c,
      ),
    );
  }

  async function removeChannel(channel: Channel) {
    if (!window.confirm(`'${channel.name}' 채널을 지울까요? 이 채널로 입력한 판매량은 채널 구분이 사라집니다.`)) {
      return;
    }

    const res = await apiFetch(`/api/v1/channels/${channel.id}`, { method: "DELETE" });

    if (!res.ok) {
      setError(res.message);

      return;
    }

    setChannels((list) => list.filter((c) => c.id !== channel.id));
  }

  const missingPresets = PRESETS.filter((p) => !channels.some((c) => c.name === p.name));
  const input = "w-full rounded border border-line-strong bg-surface px-2 py-1 text-right text-sm text-ink";

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <header className="space-y-2">
        <p className="eyebrow uppercase">Sales</p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">판매량</h1>
        <p className="text-sm text-muted">
          한 달에 한 번, 메뉴별로 홀·배달앱에서 몇 개 팔렸는지 넣으세요. 채널마다 수수료가 달라서
          따로 넣어야 실제 남는 돈이 맞게 나옵니다.
        </p>
      </header>

      {loading ? <StatusBanner kind="loading" message="불러오는 중…" /> : null}
      {error ? <StatusBanner kind="error" message={error} /> : null}
      {info ? <StatusBanner kind="info" message={info} /> : null}

      {!loading && channels.length === 0 && !error ? (
        <section className="space-y-3 rounded-xl border border-dashed border-line-strong p-4">
          <p className="text-sm text-ink-soft">먼저 어디서 파는지 골라 주세요.</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => void addChannel(p)}
                className="rounded-lg border border-accent/50 px-3 py-1.5 text-sm text-accent-ink"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {channels.length > 0 && channels.length < 3 && missingPresets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">다른 데서도 파나요?</span>
          {missingPresets.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => void addChannel(p)}
              className="rounded-lg border border-accent/50 px-3 py-1 text-accent-ink"
            >
              + {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {channels.length > 0 && periods.length === 0 && newMonth ? (
        <section className="card flex flex-wrap items-center justify-between gap-4 border-accent/30 bg-accent-soft p-5">
          <div>
            <p className="font-bold text-accent-ink">아직 판매량을 넣은 달이 없어요</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              지난달({Number(newMonth.split("-")[1])}월) 표부터 만들어 드릴게요. 다른 달은 아래에서 고를 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void createMonth()}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {Number(newMonth.split("-")[1])}월 판매량 넣기
          </button>
        </section>
      ) : null}

      {channels.length > 0 ? (
        <section className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="block text-muted">기간</span>
            <select
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
              value={periodId}
              onChange={(e) => {
                if (dirty && !window.confirm("저장하지 않은 입력이 있습니다. 다른 달로 옮길까요?")) return;
                setPeriodId(e.target.value);
              }}
            >
              {periods.length === 0 ? <option value="">기간 없음</option> : null}
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {periodLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-muted">새 달</span>
            <input
              type="month"
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!newMonth}
            onClick={() => void createMonth()}
            className="rounded-lg border border-accent/50 px-3 py-2 text-sm text-accent-ink disabled:opacity-40"
          >
            추가
          </button>
        </section>
      ) : null}

      {period && menus.length === 0 ? (
        <StatusBanner kind="info" message="메뉴가 없습니다. 메뉴를 먼저 등록하세요." />
      ) : null}

      {period && menus.length > 0 && channels.length > 0 ? (
        <section className="space-y-3">
          {previousPeriod && totals.all === 0 ? (
            <button
              type="button"
              onClick={copyPrevious}
              className="rounded-lg border border-accent/50 px-3 py-1.5 text-sm text-accent-ink"
            >
              {periodLabel(previousPeriod)} 숫자 그대로 가져와서 고치기
            </button>
          ) : null}
          <p className="text-xs text-faint">
            Enter·↑↓로 칸 이동. 엑셀이나 포스 화면에서 숫자 여러 칸을 복사해 붙여넣으면 한 번에 채워집니다.
          </p>
          <div className="overflow-auto rounded-xl border border-line">
            <table className="min-w-full text-sm">
              <thead className="bg-subtle text-muted">
                <tr>
                  <th className="sticky left-0 z-10 min-w-24 whitespace-nowrap bg-subtle px-3 py-2 text-left font-semibold">메뉴</th>
                  {channels.map((c) => (
                    <th key={c.id} className="min-w-24 px-2 py-2 text-right">
                      {c.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">합계</th>
                </tr>
              </thead>
              <tbody>
                {menus.map((menu, mi) => (
                  <tr key={menu.id} className="border-t border-line">
                    <td className="sticky left-0 z-10 min-w-24 whitespace-nowrap bg-surface px-3 py-1.5 text-ink">{menu.name}</td>
                    {channels.map((c, ci) => {
                      const key = cellKey(menu.id, c.id);

                      return (
                        <td key={c.id} className="px-2 py-1.5">
                          <input
                            aria-label={`${menu.name} ${c.name} 판매량`}
                            data-cell={`${mi}:${ci}`}
                            onKeyDown={(e) => moveFocus(e, mi, ci)}
                            onPaste={(e) => pasteBlock(e, mi, ci)}
                            className={input}
                            inputMode={inputModes.numeric}
                            placeholder="0"
                            value={cells[key] ?? ""}
                            onChange={(e) => {
                              setCells((prev) => ({ ...prev, [key]: e.target.value }));
                              setDirty(true);
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-right text-ink-soft">
                      {(totals.byMenu[menu.id] ?? 0).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line-strong card text-ink-soft">
                  <td className="sticky left-0 z-10 min-w-24 whitespace-nowrap bg-subtle px-3 py-2">합계</td>
                  {channels.map((c) => (
                    <td key={c.id} className="px-2 py-2 text-right">
                      {(totals.byChannel[c.id] ?? 0).toLocaleString("ko-KR")}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium text-ink">
                    {totals.all.toLocaleString("ko-KR")}
                  </td>
                </tr>
                {deliveryChannels.length > 0 ? (
                  <tr className="border-t border-line">
                    <td className="sticky left-0 z-10 min-w-24 whitespace-nowrap bg-surface px-3 py-2 text-warn">
                      주문 건수
                    </td>
                    {channels.map((c) => (
                      <td key={c.id} className="px-2 py-1.5">
                        {c.deliveryFeeFixed > 0 ? (
                          <input
                            aria-label={`${c.name} 주문 건수`}
                            className={input}
                            inputMode={inputModes.numeric}
                            placeholder="건"
                            value={orders[c.id] ?? ""}
                            onChange={(e) => {
                              setOrders((prev) => ({ ...prev, [c.id]: e.target.value }));
                              setDirty(true);
                            }}
                          />
                        ) : null}
                      </td>
                    ))}
                    <td />
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {deliveryChannels.length > 0 ? (
            <p className="text-xs text-faint">
              배달비는 메뉴 개수가 아니라 주문 1건마다 나갑니다. 배달앱 정산 화면의 주문 건수를 넣으면
              정확해지고, 비워 두면 메뉴 1개마다 배달비를 빼서 실제보다 덜 남는 것으로 계산됩니다.
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => void save()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
            >
              저장
            </button>
            {dirty ? <span className="text-xs text-warn">저장하지 않은 입력이 있습니다</span> : null}
            <Link href="/contribution" className="ml-auto text-sm text-accent-ink">
              실제 이익 보기 →
            </Link>
          </div>
        </section>
      ) : null}

      {channels.length > 0 ? (
        <section className="rounded-xl border border-line bg-surface">
          <button
            type="button"
            onClick={() => setShowChannels((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm text-ink"
          >
            <span>판매 채널과 수수료</span>
            <span className="text-faint">{showChannels ? "접기" : "펼치기"}</span>
          </button>
          {showChannels ? (
            <div className="space-y-3 border-t border-line p-4">
              <p className="text-xs text-faint">
                처음 넣은 값은 예시입니다. 계약서나 정산 화면의 실제 요율로 고쳐 주세요.
              </p>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">채널</th>
                      <th className="px-2 py-1 text-right">중개수수료 %</th>
                      <th className="px-2 py-1 text-right">결제수수료 %</th>
                      <th className="px-2 py-1 text-right">배달비 (주문 1건당 원)</th>
                      <th className="px-2 py-1 text-center">기본</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((c) => (
                      <tr key={`${c.id}-${c.channelFeeRate}-${c.paymentFeeRate}-${c.deliveryFeeFixed}`} className="border-t border-line">
                        <td className="px-2 py-1.5 text-ink">{c.name}</td>
                        <td className="px-2 py-1.5">
                          <input
                            className={input}
                            inputMode={inputModes.decimal}
                            defaultValue={pct(c.channelFeeRate)}
                            onBlur={(e) => {
                              const v = Number(e.target.value) / 100;

                              if (v !== c.channelFeeRate && v >= 0 && v <= 1) void updateChannel(c, { channelFeeRate: v });
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={input}
                            inputMode={inputModes.decimal}
                            defaultValue={pct(c.paymentFeeRate)}
                            onBlur={(e) => {
                              const v = Number(e.target.value) / 100;

                              if (v !== c.paymentFeeRate && v >= 0 && v <= 1) void updateChannel(c, { paymentFeeRate: v });
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={input}
                            inputMode={inputModes.numeric}
                            defaultValue={String(c.deliveryFeeFixed)}
                            onBlur={(e) => {
                              const v = Number(e.target.value.replace(/,/g, ""));

                              if (v !== c.deliveryFeeFixed && v >= 0) void updateChannel(c, { deliveryFeeFixed: v });
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="radio"
                            name="default-channel"
                            aria-label={`${c.name} 기본 채널`}
                            checked={c.isDefault}
                            onChange={() => void updateChannel(c, { isDefault: true })}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => void removeChannel(c)}
                            className="text-xs text-loss"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {missingPresets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {missingPresets.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => void addChannel(p)}
                      className="rounded-lg border border-line-strong px-3 py-1.5 text-xs text-ink-soft"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

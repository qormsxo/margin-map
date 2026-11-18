"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";

type Alert = {
  id: string;
  weekStart: string;
  ruleId: string;
  severity: string;
  title: string;
  body: string;
  acknowledgedAt: string | null;
};

/** Monday (YYYY-MM-DD) of the week containing `dateStr`. */
function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const offset = (date.getUTCDay() + 6) % 7;

  date.setUTCDate(date.getUTCDate() - offset);

  return date.toISOString().slice(0, 10);
}

export default function AlertsPage() {
  const [items, setItems] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date().toISOString().slice(0, 10)));
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<Alert[]>(
      "/api/v1/alerts?acknowledged=false",
    );

    setLoading(false);

    if (!result.ok) {
      setError(
        result.status === 401 ? "로그인이 필요합니다." : result.message,
      );
      setItems([]);

      return;
    }

    setItems(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runWeekly() {
    setBusy(true);
    setInfo(null);
    setError(null);

    const result = await apiFetch<{
      dataSufficient: boolean;
      insufficientReason: string | null;
      alerts: Alert[];
    }>("/api/v1/weekly/run", {
      method: "POST",
      body: JSON.stringify({ weekStart }),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    if (!result.data.dataSufficient) {
      setInfo(
        "비교할 지난주 데이터가 없어 아직 점검할 수 없습니다. 다음 주에 다시 점검하면 이번 주와 비교합니다.",
      );
    } else {
      setInfo(
        result.data.alerts.length === 0
          ? "점검 완료. 이상 징후가 없습니다."
          : `점검 완료. 확인할 항목 ${result.data.alerts.length}건.`,
      );
    }

    await load();
  }

  async function acknowledge(id: string) {
    const result = await apiFetch(`/api/v1/alerts/${id}/acknowledge`, {
      method: "POST",
    });

    if (!result.ok) {
      setError(result.message);

      return;
    }

    await load();
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400/80">Alerts</p>
        <h1 className="text-3xl font-semibold text-white">이상징후 알림</h1>
        <p className="text-sm text-slate-400">
          <b className="text-slate-200">재료 가격을 올리면 바로</b> 여기에 알림이 생깁니다 (식재료 화면에서
          구매가를 고치면 됨). 아래 주간 점검은 메뉴 원가·마진이 지난주보다 나빠졌는지 보는 것으로,
          매주 한 번 누르면 다음 주부터 비교됩니다.
        </p>
      </header>

      {loading ? <StatusBanner kind="loading" message="불러오는 중…" /> : null}
      {error ? <StatusBanner kind="error" message={error} /> : null}
      {info ? <StatusBanner kind="info" message={info} /> : null}

      <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1 text-sm">
          <span className="text-slate-400">점검할 주 (아무 날짜나 고르면 그 주 월요일 기준)</span>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={weekStart}
            onChange={(e) => {
              if (e.target.value) setWeekStart(mondayOf(e.target.value));
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runWeekly()}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-40"
        >
          점검하기
        </button>
      </section>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-100">{item.title}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{item.body}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">{item.weekStart} 주</span>
              <button
                type="button"
                className="text-xs text-sky-300"
                onClick={() => void acknowledge(item.id)}
              >
                확인
              </button>
            </div>
          </li>
        ))}
        {!loading && items.length === 0 && !error ? (
          <li className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">
            확인할 알림이 없습니다.
          </li>
        ) : null}
      </ul>

      <Link href="/dashboard" className="text-sm text-sky-300">
        ← 대시보드
      </Link>
    </div>
  );
}

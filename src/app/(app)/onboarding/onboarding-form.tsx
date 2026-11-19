"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBanner } from "@/components/ui/status-banner";
import { BUSINESS_TYPES, CHANNEL_PRESETS, findBusinessType } from "@/lib/business-types";
import { apiFetch } from "@/lib/client-api";

function feeLabel(name: string) {
  const preset = CHANNEL_PRESETS.find((p) => p.name === name);

  if (!preset) return "";

  if (preset.channelFeeRate === 0) return `카드 ${(preset.paymentFeeRate * 100).toFixed(1)}%`;

  return `중개 ${(preset.channelFeeRate * 100).toFixed(1)}% · 배달비 ${preset.deliveryFeeFixed.toLocaleString("ko-KR")}원`;
}

export function OnboardingForm() {
  const router = useRouter();
  const [typeId, setTypeId] = useState<string | null>(null);
  const [channels, setChannels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickType(id: string) {
    setTypeId(id);
    setChannels(findBusinessType(id)?.channels ?? ["홀"]);
  }

  function toggleChannel(name: string) {
    setChannels((list) => (list.includes(name) ? list.filter((c) => c !== name) : [...list, name]));
  }

  async function submit() {
    if (!typeId) return;

    setBusy(true);
    setError(null);

    const res = await apiFetch("/api/v1/store/onboarding", {
      method: "POST",
      body: JSON.stringify({ businessType: typeId, channels }),
    });

    if (!res.ok) {
      setBusy(false);
      setError(res.message);

      return;
    }

    router.replace("/ingredients?welcome=1");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">1분이면 끝나요</p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">어떤 가게를 하세요?</h1>
        <p className="text-sm text-muted">
          업종에 맞춰 판매 채널과 자주 쓰는 재료를 미리 준비해 둘게요. 나중에 언제든 바꿀 수 있습니다.
        </p>
      </header>

      {error ? <StatusBanner kind="error" message={error} /> : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BUSINESS_TYPES.map((t) => {
          const active = t.id === typeId;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pickType(t.id)}
              aria-pressed={active}
              aria-label={t.label}
              className={`card flex flex-col items-start gap-2 p-4 text-left ${
                active ? "border-accent ring-2 ring-accent/30" : "hover:-translate-y-0.5 hover:shadow-lift"
              }`}
            >
              <span className="text-3xl" aria-hidden="true">
                {t.emoji}
              </span>
              <span className={`text-[15px] font-bold ${active ? "text-accent-ink" : "text-heading"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </section>

      {typeId ? (
        <section className="card space-y-4 p-5 animate-rise">
          <div>
            <h2 className="text-base font-bold text-heading">어디서 팔고 있나요?</h2>
            <p className="mt-0.5 text-xs text-faint">
              수수료는 흔한 예시예요. 실제 계약과 다르면 판매량 화면에서 고칠 수 있습니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CHANNEL_PRESETS.map((p) => {
              const on = channels.includes(p.name);

              return (
                <label
                  key={p.name}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                    on ? "border-brand-solid bg-brand-soft" : "border-line hover:border-line-strong"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleChannel(p.name)}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink">{p.name}</span>
                    <span className="block text-xs text-faint">{feeLabel(p.name)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            disabled={busy || channels.length === 0}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "준비하는 중…" : "재료 넣으러 가기 →"}
          </button>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";

type Me = { user: { email: string }; store: { name: string } };

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiFetch<Me>("/api/v1/me").then((res) => {
      if (res.ok) setMe(res.data);
      else setError(res.message);
    });
  }, []);

  const canDelete = !busy && password !== "" && me !== null && storeName.trim() === me.store.name.trim();

  async function remove() {
    if (!canDelete) return;

    setBusy(true);
    setError(null);

    const res = await apiFetch<{ deleted: boolean }>("/api/v1/account/delete", {
      method: "POST",
      body: JSON.stringify({ password, storeName }),
    });

    setBusy(false);

    if (!res.ok) {
      setError(res.message);

      return;
    }

    router.replace("/?deleted=1");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-2">
        <p className="eyebrow uppercase">Account</p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">계정</h1>
      </header>

      {error ? <StatusBanner kind="error" message={error} /> : null}

      <section className="card space-y-3 p-5">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted">이메일</span>
          <span className="font-medium text-ink">{me?.user.email ?? "…"}</span>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted">매장</span>
          <span className="font-medium text-ink">{me?.store.name ?? "…"}</span>
        </div>
      </section>

      <section className="rounded-2xl border border-loss/30 bg-loss-soft p-5">
        <h2 className="font-bold text-loss">회원 탈퇴</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          계정과 매장의 모든 기록(식재료, 메뉴·레시피, 판매량, 고정비, 매입, 알림, 분석 결과)이 바로 삭제되며 되돌릴 수
          없습니다.
        </p>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 rounded-lg border border-loss/40 bg-surface px-4 py-2 text-sm font-semibold text-loss hover:bg-loss-soft"
          >
            탈퇴하기
          </button>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void remove();
            }}
          >
            <label className="block space-y-1 text-sm">
              <span className="text-ink-soft">비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-ink-soft">
                확인을 위해 매장 이름 <b className="text-ink">{me?.store.name}</b>을 그대로 입력하세요
              </span>
              <input
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!canDelete}
                className="rounded-lg bg-loss px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "삭제하는 중…" : "모든 기록 삭제하고 탈퇴"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPassword("");
                  setStoreName("");
                }}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-ink"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";

export function LoginForm({ initialMode = "login" }: { initialMode?: "login" | "register" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);

    const path =
      mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";

    const body =
      mode === "login"
        ? { email, password }
        : { email, password, storeName: storeName || "내 매장", agreedToTerms: agreed };

    const result = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    router.replace(mode === "register" ? "/onboarding" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="card mx-auto max-w-md space-y-6 p-6 sm:mt-6 sm:p-8">
      <div className="space-y-2">
        <p className="eyebrow">{mode === "login" ? "다시 오셨네요" : "3초면 끝나요"}</p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">
          {mode === "login" ? "로그인" : "무료로 시작하기"}
        </h1>
        <p className="text-sm text-muted">
          로그인하면 휴대폰과 PC 어디서나 같은 매장 데이터를 볼 수 있습니다.
        </p>
      </div>

      {error ? <StatusBanner kind="error" message={error} /> : null}
      {busy ? <StatusBanner kind="loading" message="처리 중…" /> : null}

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();

          if (busy || !email || !password || (mode === "register" && !agreed)) return;

          void submit();
        }}
      >
        <input
          className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px]"
          placeholder="이메일"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px]"
          placeholder={mode === "register" ? "비밀번호 (8자 이상)" : "비밀번호"}
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "register" ? (
          <input
            className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px]"
            placeholder="매장명"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        ) : null}
        {mode === "register" ? (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-subtle px-4 py-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              <Link href="/terms" target="_blank" className="font-semibold text-accent-ink underline">
                이용약관
              </Link>
              과{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-accent-ink underline">
                개인정보처리방침
              </Link>
              에 동의합니다 (필수)
            </span>
          </label>
        ) : null}
        <button
          type="submit"
          disabled={busy || !email || !password || (mode === "register" && !agreed)}
          className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
        >
          {mode === "login" ? "로그인" : "가입하고 시작"}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="text-sm font-semibold text-brand hover:text-heading"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "계정이 없나요? 가입" : "이미 계정이 있나요? 로그인"}
        </button>
        {mode === "login" ? (
          <button
            type="button"
            className="text-sm text-faint hover:text-ink"
            onClick={() => setForgot((v) => !v)}
            aria-expanded={forgot}
          >
            비밀번호를 잊었나요?
          </button>
        ) : null}
      </div>

      {forgot && mode === "login" ? (
        <div className="rounded-xl bg-subtle p-4 text-sm text-ink-soft">
          <p className="font-semibold text-ink">비밀번호 다시 받기</p>
          <p className="mt-1">
            가입한 이메일과 매장명을 적어{" "}
            {SUPPORT_EMAIL ? (
              <a href={`mailto:${SUPPORT_EMAIL}?subject=MarginMap 비밀번호 재설정`} className="font-semibold text-accent-ink underline">
                {SUPPORT_EMAIL}
              </a>
            ) : (
              "운영자"
            )}
            로 보내 주시면 새 비밀번호를 알려 드립니다. 매장 데이터는 그대로 남아 있습니다.
          </p>
        </div>
      ) : null}

      <Link href="/" className="block text-sm text-faint">
        ← 홈
      </Link>
    </div>
  );
}

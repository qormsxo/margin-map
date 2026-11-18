"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBanner } from "@/components/ui/status-banner";
import { apiFetch } from "@/lib/client-api";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);

    const path =
      mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";

    const body =
      mode === "login"
        ? { email, password }
        : { email, password, storeName: storeName || "내 매장" };

    const result = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="card mx-auto max-w-md space-y-6 p-6 sm:mt-6 sm:p-8">
      <div className="space-y-2">
        <p className="eyebrow">{mode === "login" ? "다시 오셨네요" : "3초면 끝나요"}</p>
        <h1 className="text-[28px] font-bold tracking-tight text-heading">
          {mode === "login" ? "로그인" : "가입"}
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

          if (!busy && email && password) void submit();
        }}
      >
        <input
          className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px]"
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px]"
          placeholder={mode === "register" ? "비밀번호 (8자 이상)" : "비밀번호"}
          type="password"
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
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white shadow-sm shadow-accent/20 hover:bg-accent-hover disabled:opacity-40"
        >
          {mode === "login" ? "로그인" : "가입하고 시작"}
        </button>
      </form>

      <button
        type="button"
        className="text-sm font-semibold text-brand hover:text-heading"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "계정이 없나요? 가입" : "이미 계정이 있나요? 로그인"}
      </button>

      <Link href="/" className="block text-sm text-faint">
        ← 홈
      </Link>
    </div>
  );
}

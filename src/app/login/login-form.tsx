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
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400/80">Account</p>
        <h1 className="text-3xl font-semibold text-white">
          {mode === "login" ? "로그인" : "가입"}
        </h1>
        <p className="text-sm text-slate-400">
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
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder={mode === "register" ? "비밀번호 (8자 이상)" : "비밀번호"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "register" ? (
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="매장명"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        ) : null}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-40"
        >
          {mode === "login" ? "로그인" : "가입하고 시작"}
        </button>
      </form>

      <button
        type="button"
        className="text-sm text-sky-300"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "계정이 없나요? 가입" : "이미 계정이 있나요? 로그인"}
      </button>

      <Link href="/" className="block text-sm text-slate-500">
        ← 홈
      </Link>
    </div>
  );
}

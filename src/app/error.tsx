"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Any server/render error inside the app shell: friendly message, retry, way home. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-2xl">
        😥
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-heading">잠깐 문제가 생겼어요</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        입력하신 데이터는 안전합니다. 잠시 후 다시 시도해 주세요. 계속 이러면 아래 번호를 알려 주시면
        빨리 찾을 수 있어요.
      </p>
      {error.digest ? (
        <p className="mt-3 inline-block rounded-lg bg-subtle px-2 py-1 font-mono text-xs text-faint">
          오류 번호 {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          다시 시도
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-heading"
        >
          대시보드로
        </Link>
      </div>
    </div>
  );
}

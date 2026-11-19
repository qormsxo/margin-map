import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-ink">오프라인</h1>
      <p className="text-sm text-muted">
        인터넷에 연결할 수 없습니다. 연결된 뒤 다시 시도해 주세요.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent/20 hover:bg-accent-hover"
      >
        다시 시도
      </Link>
    </div>
  );
}

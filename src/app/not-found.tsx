import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-5xl font-bold tracking-tight text-heading">404</p>
      <h1 className="mt-3 text-xl font-bold text-heading">찾는 화면이 없어요</h1>
      <p className="mt-2 text-sm text-muted">주소가 바뀌었거나 지워진 화면입니다.</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        대시보드로
      </Link>
    </div>
  );
}

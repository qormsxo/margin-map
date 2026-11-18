import Link from "next/link";

export function EmptyPanel({
  title,
  message,
  requiredInput,
  action,
}: {
  title: string;
  message: string;
  requiredInput?: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5">
      <h2 className="text-sm font-medium text-slate-200">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
      {requiredInput ? (
        <p className="mt-2 text-sm text-amber-200/90">{requiredInput}</p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-3 inline-block rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
        >
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}

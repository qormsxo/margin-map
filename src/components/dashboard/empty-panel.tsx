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
    <section className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-5">
      <h2 className="text-base font-bold text-heading">{title}</h2>
      <p className="mt-1.5 text-sm text-muted">{message}</p>
      {requiredInput ? <p className="mt-2 text-sm font-medium text-ink-soft">→ {requiredInput}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20 hover:bg-accent-hover"
        >
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}

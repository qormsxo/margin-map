export function StatusBanner({
  kind,
  message,
}: {
  kind: "error" | "info" | "loading";
  message: string;
}) {
  const styles =
    kind === "error"
      ? "border-rose-500/40 bg-rose-950/40 text-rose-100"
      : kind === "loading"
        ? "border-slate-600 bg-slate-900/70 text-slate-300"
        : "border-sky-500/30 bg-slate-900/70 text-sky-100";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`} role="status">
      {message}
    </div>
  );
}

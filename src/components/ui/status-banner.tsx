export function StatusBanner({
  kind,
  message,
}: {
  kind: "error" | "info" | "loading";
  message: string;
}) {
  const styles =
    kind === "error"
      ? "border-loss/30 bg-loss-soft text-loss"
      : kind === "loading"
        ? "border-line-strong bg-surface text-ink-soft"
        : "border-accent/30 bg-surface text-heading";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`} role="status">
      {message}
    </div>
  );
}

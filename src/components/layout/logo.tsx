export function Logo({ tone }: { tone: "light" | "dark" }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-black text-white"
      >
        M
      </span>
      <span
        className={`text-[17px] font-bold tracking-tight ${tone === "light" ? "text-white" : "text-heading"}`}
      >
        MarginMap
      </span>
    </span>
  );
}

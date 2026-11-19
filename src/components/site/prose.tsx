/** Small building blocks so guide articles share the same readable, semantic markup. */
export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-20 text-2xl font-bold tracking-tight text-heading">
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[16px] leading-[1.85] text-ink-soft">{children}</p>;
}

export function Formula({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 rounded-2xl border border-brand-tint bg-brand-soft px-5 py-4 text-center text-lg font-bold text-heading">
      {children}
    </p>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <aside className="mt-6 rounded-2xl border border-accent/25 bg-accent-soft px-5 py-4 text-sm leading-relaxed text-ink-soft">
      {children}
    </aside>
  );
}

export function DataTable({
  caption,
  head,
  rows,
  foot,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
  foot?: (string | number)[];
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="bg-subtle px-4 py-2.5 text-left text-xs font-semibold text-muted">{caption}</caption>
        <thead className="bg-surface text-left text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface text-ink">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-2.5 text-left font-medium">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-2.5 tabular-nums">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
        {foot ? (
          <tfoot className="border-t-2 border-line-strong bg-subtle font-bold text-heading">
            <tr>
              {foot.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-2.5 text-left">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-2.5 tabular-nums">
                    {c}
                  </td>
                ),
              )}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

/** Minimal CSV row splitter supporting quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }

      if (ch === '"') {
        inQuotes = false;
        continue;
      }

      cell += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell.trim());
      cell = "";

      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") continue;

    cell += ch;
  }

  row.push(cell.trim());

  if (row.some((c) => c.length > 0)) rows.push(row);

  return rows;
}

export function csvHeaderIndex(
  header: string[],
  names: string[],
): number | null {
  const normalized = header.map((h) => h.trim().toLowerCase());

  for (const name of names) {
    const idx = normalized.indexOf(name.toLowerCase());

    if (idx >= 0) return idx;
  }

  return null;
}

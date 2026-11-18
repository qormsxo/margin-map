/**
 * Parse what owners actually type for money/quantities:
 * "1,500" → 1500, "13.4만" → 134000, "2천" → 2000, "1만 2천" → 12000, "3만5천원" → 35000,
 * "9천8백" → 9800.
 * Returns null for empty or unreadable input.
 */
export function parseAmount(text: string): number | null {
  const s = text.replace(/[,\s원]/g, "");

  if (s === "") return null;

  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);

  const match = /^(?:(\d+(?:\.\d+)?)만)?(?:(\d+(?:\.\d+)?)천)?(?:(\d+(?:\.\d+)?)백)?(\d+)?$/.exec(s);

  if (!match || (!match[1] && !match[2] && !match[3])) return null;

  const man = match[1] ? Number(match[1]) * 10_000 : 0;
  const cheon = match[2] ? Number(match[2]) * 1_000 : 0;
  const baek = match[3] ? Number(match[3]) * 100 : 0;
  const rest = match[4] ? Number(match[4]) : 0;

  return Math.round(man + cheon + baek + rest);
}

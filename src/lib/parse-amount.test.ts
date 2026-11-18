import { describe, expect, it } from "vitest";
import { parseAmount } from "@/lib/parse-amount";

describe("parseAmount", () => {
  it.each([
    ["1500", 1500],
    ["1,500", 1500],
    ["13.4만", 134000],
    ["2천", 2000],
    ["1만 2천", 12000],
    ["3만5천원", 35000],
    ["268만", 2680000],
    ["0.5", 0.5],
    ["-500", -500],
    ["9천8백", 9800],
    ["1만2천5백", 12500],
    ["5백", 500],
  ])("%s → %d", (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(["", "abc", "만", "1.2.3"])("%s → null", (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

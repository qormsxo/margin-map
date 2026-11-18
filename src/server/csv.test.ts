import { describe, expect, it } from "vitest";
import { csvHeaderIndex, parseCsv } from "@/server/csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    const rows = parseCsv("menu_name,qty\n떡볶이,10\n순대,5\n");

    expect(rows).toEqual([
      ["menu_name", "qty"],
      ["떡볶이", "10"],
      ["순대", "5"],
    ]);
  });

  it("handles quoted commas", () => {
    const rows = parseCsv('menu_name,qty\n"매콤,떡볶이",3\n');

    expect(rows[1]).toEqual(["매콤,떡볶이", "3"]);
  });
});

describe("csvHeaderIndex", () => {
  it("finds case-insensitive header", () => {
    expect(csvHeaderIndex(["Menu_Name", "QTY"], ["menu_name"])).toBe(0);
    expect(csvHeaderIndex(["Menu_Name", "QTY"], ["qty"])).toBe(1);
  });
});

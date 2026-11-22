import { describe, expect, it } from "vitest";
import { channelAdCost } from "./channel-sales";
import { DomainError } from "./domain-error";

describe("channelAdCost", () => {
  it("adds a fixed monthly spend and a share of the channel's sales", () => {
    // 깃발 광고 월 88,000원 + 매출 1,000만 원의 3%
    expect(channelAdCost({ adSpend: 88_000, adRate: 0.03, channelRevenue: 10_000_000 })).toBe(388_000);
  });

  it("is zero when nothing is entered", () => {
    expect(channelAdCost({ adSpend: 0, adRate: 0, channelRevenue: 5_000_000 })).toBe(0);
  });

  it("charges the fixed spend even with no sales", () => {
    expect(channelAdCost({ adSpend: 50_000, adRate: 0.05, channelRevenue: 0 })).toBe(50_000);
  });

  it("rejects negative spend and a rate outside 0..1", () => {
    expect(() => channelAdCost({ adSpend: -1, adRate: 0, channelRevenue: 0 })).toThrow(DomainError);
    expect(() => channelAdCost({ adSpend: 0, adRate: 1.5, channelRevenue: 0 })).toThrow(DomainError);
  });
});

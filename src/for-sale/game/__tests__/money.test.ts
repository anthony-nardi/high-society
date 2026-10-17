import { describe, expect, it } from "vitest";
import { money, passCost, tierOf, totalOf } from "../money";

describe("money helpers", () => {
  it("formats thousands and halves bids rounding up", () => {
    expect(money(0)).toBe("$0");
    expect(money(15)).toBe("$15,000");
    expect(passCost(0)).toBe(0);
    expect(passCost(3)).toBe(2);
    expect(passCost(4)).toBe(2);
  });

  it("grades properties and totals a player", () => {
    expect(tierOf(1)).toBe(1);
    expect(tierOf(5)).toBe(1);
    expect(tierOf(6)).toBe(2);
    expect(tierOf(30)).toBe(6);
    expect(
      totalOf({
        email: "a",
        lastActionAt: 0,
        money: 4,
        bid: 0,
        isBot: false,
        cheques: [15, 2],
      }),
    ).toBe(21);
  });
});

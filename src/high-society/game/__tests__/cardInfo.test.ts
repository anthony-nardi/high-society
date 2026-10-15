import { describe, expect, it } from "vitest";
import cardInfo, { greenCardsRevealed } from "../cardInfo";

describe("cardInfo", () => {
  it("describes luxury cards by their points", () => {
    const info = cardInfo("7");
    expect(info.kind).toBe("luxury");
    expect(info.effect).toBe("+7 points");
    expect(info.endsOnFirstPass).toBe(false);
    expect(info.isGreen).toBe(false);
  });

  it("marks misfortune cards as ending on the first pass", () => {
    for (const card of ["-5", "1/2", "-"]) {
      expect(cardInfo(card).kind).toBe("misfortune");
      expect(cardInfo(card).endsOnFirstPass).toBe(true);
    }
    expect(cardInfo("2x").endsOnFirstPass).toBe(false);
  });

  it("flags the green-edged cards", () => {
    expect(cardInfo("2x").isGreen).toBe(true);
    expect(cardInfo("1/2").isGreen).toBe(true);
    expect(cardInfo("-5").isGreen).toBe(false);
  });
});

describe("greenCardsRevealed", () => {
  it("counts green cards held by players plus the one on the table", () => {
    const players = [
      { statusCards: ["2x", "4"] },
      { statusCards: ["1/2"] },
      {},
    ];
    expect(greenCardsRevealed(players, "2x")).toBe(3);
    expect(greenCardsRevealed(players, "9")).toBe(2);
  });
});

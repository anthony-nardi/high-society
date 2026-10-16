import { describe, expect, it } from "vitest";
import scoreGame, { categoryLabel } from "../scoring";
import cardInfo, { totalCards } from "../cardInfo";

const player = (email: string, score: number) => ({
  email,
  lastActionAt: 0,
  cards: {},
  bid: "0",
  score,
  isBot: false,
});

describe("scoreGame", () => {
  it("ranks by score and shares ties", () => {
    const results = scoreGame(
      [player("a", 12), player("b", 20), player("c", 20)],
      [
        { email: "a", round: 1, points: { coins: 3 }, total: 3 },
        { email: "a", round: 2, points: { coins: 9 }, total: 9 },
      ],
    );
    expect(results.map((p) => p.email)).toEqual(["b", "c", "a"]);
    expect(results.filter((p) => p.winner)).toHaveLength(2);
    expect(results[2].rounds).toEqual([3, 9]);
    expect(results[2].rank).toBe(3);
  });

  it("labels scoring categories", () => {
    expect(categoryLabel("theives")).toBe("theives");
    expect(categoryLabel("thieves")).toBe("Thieves");
    expect(categoryLabel("money")).toBe("Money");
  });
});

describe("cardInfo", () => {
  it("knows every loot card", () => {
    expect(cardInfo("SCARAB").category).toBe("jewels");
    expect(cardInfo("POLICE_RAIDS").category).toBe("police");
    expect(cardInfo("RESTAURANT").name).toBe("Restaurant");
    expect(cardInfo("TRANSPORTATION").name).toBe("Transportation");
    expect(cardInfo("POLICE_RAIDS").name).toBe("Police raid");
    expect(cardInfo("COINS").name).toBe("Gold coins");
    expect(cardInfo("SCARAB").kind).toBe("jewel");
  });

  it("counts cards across categories", () => {
    expect(totalCards({ jewels: ["RING"], cars: ["CARS", "CARS"] })).toBe(3);
    expect(totalCards(undefined)).toBe(0);
  });
});

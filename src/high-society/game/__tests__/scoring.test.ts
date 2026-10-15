import { describe, expect, it } from "vitest";
import scoreGame from "../scoring";

describe("scoreGame", () => {
  it("applies multipliers and the scandal penalty", () => {
    const [player] = scoreGame([
      {
        email: "a",
        moneyCards: ["1"],
        statusCards: ["10", "2x", "-5", "1/2", "2x"],
      },
    ]);
    expect(player.luxury).toBe(10);
    expect(player.penalty).toBe(5);
    expect(player.multiplier).toBe(2);
    expect(player.finalScore).toBe(10);
  });

  it("ignores an unused thief card instead of producing NaN", () => {
    const [player] = scoreGame([{ email: "a", statusCards: ["-"] }]);
    expect(player.finalScore).toBe(0);
  });

  it("eliminates the poorest players and ranks the rest by score", () => {
    const results = scoreGame([
      { email: "rich", moneyCards: ["25"], statusCards: ["3"] },
      { email: "best", moneyCards: ["10"], statusCards: ["10", "2x"] },
      { email: "broke", moneyCards: ["1"], statusCards: ["9", "8", "2x"] },
    ]);

    expect(results.map((p) => p.email)).toEqual(["best", "rich", "broke"]);
    expect(results[0].winner).toBe(true);
    expect(results[0].rank).toBe(1);
    expect(results[2].eliminated).toBe(true);
    expect(results[2].winner).toBe(false);
  });

  it("breaks score ties by money left, then by highest luxury card", () => {
    const byMoney = scoreGame([
      { email: "poor", moneyCards: ["1"], statusCards: [] },
      { email: "a", moneyCards: ["10"], statusCards: ["5"] },
      { email: "b", moneyCards: ["12"], statusCards: ["5"] },
    ]);
    expect(byMoney[0].email).toBe("b");
    expect(byMoney.filter((p) => p.winner).map((p) => p.email)).toEqual(["b"]);

    const byCard = scoreGame([
      { email: "poor", moneyCards: ["1"], statusCards: [] },
      { email: "a", moneyCards: ["10"], statusCards: ["4", "3"] },
      { email: "b", moneyCards: ["10"], statusCards: ["7"] },
    ]);
    expect(byCard[0].email).toBe("b");
  });

  it("reports a shared win when nothing separates the leaders", () => {
    const results = scoreGame([
      { email: "poor", moneyCards: ["1"], statusCards: [] },
      { email: "a", moneyCards: ["10"], statusCards: ["7"] },
      { email: "b", moneyCards: ["10"], statusCards: ["7"] },
    ]);
    expect(results.filter((p) => p.winner)).toHaveLength(2);
  });
});

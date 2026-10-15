import { describe, expect, it } from "vitest";
import scoreGame, { cardPoints, groupRuns, takeOutcome } from "../scoring";

describe("runs and points", () => {
  it("groups consecutive cards into runs", () => {
    expect(groupRuns([7, 5, 6, 20, 22, 23])).toEqual([
      [5, 6, 7],
      [20],
      [22, 23],
    ]);
    expect(groupRuns([])).toEqual([]);
  });

  it("counts only the lowest card of each run", () => {
    expect(cardPoints([5, 6, 7, 20, 22, 23])).toBe(47);
  });
});

describe("takeOutcome", () => {
  it("charges the full card when it stands alone", () => {
    expect(takeOutcome(20, 3, [5])).toEqual({
      pointsAdded: 20,
      net: 17,
      joinsRun: false,
      bridgesRuns: false,
    });
  });

  it("is free when the card extends a run upwards", () => {
    expect(takeOutcome(8, 2, [7]).pointsAdded).toBe(0);
    expect(takeOutcome(8, 2, [7]).joinsRun).toBe(true);
  });

  it("lowers the run's value when the card extends it downwards", () => {
    expect(takeOutcome(6, 0, [7]).pointsAdded).toBe(-1);
    expect(takeOutcome(6, 0, [7]).bridgesRuns).toBe(true);
  });

  it("removes a whole run's worth when bridging two runs", () => {
    expect(takeOutcome(9, 0, [8, 10, 11]).pointsAdded).toBe(-10);
  });
});

describe("scoreGame", () => {
  it("ranks lowest score first and flags the winner", () => {
    const results = scoreGame([
      { email: "a", cards: [30], chips: 2 },
      { email: "b", cards: [5, 6], chips: 10 },
      { email: "c", cards: [], chips: 0 },
    ]);
    expect(results.map((p) => p.email)).toEqual(["b", "c", "a"]);
    expect(results[0].score).toBe(-5);
    expect(results[0].winner).toBe(true);
    expect(results[2].rank).toBe(3);
    expect(results.filter((p) => p.winner)).toHaveLength(1);
  });

  it("shares the win on a tie", () => {
    const results = scoreGame([
      { email: "a", cards: [10], chips: 5 },
      { email: "b", cards: [8], chips: 3 },
    ]);
    expect(results.filter((p) => p.winner)).toHaveLength(2);
  });
});

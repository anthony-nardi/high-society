import { describe, expect, it } from "vitest";
import {
  ALL_POINTS,
  LINES,
  movesFrom,
  position,
  rowWindows,
  windowCells,
} from "../board";
import { YinshGameState } from "../types";

const state = (over: Partial<YinshGameState> = {}): YinshGameState => ({
  id: "l",
  game: "yinsh",
  players: [
    { email: "a", lastActionAt: 0, side: "WHITE", scored: 0, isBot: false },
    { email: "b", lastActionAt: 0, side: "BLACK", scored: 0, isBot: true },
  ],
  activePlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  pool: 51,
  phase: "MOVE_RING",
  turn: 11,
  ...over,
});

describe("board", () => {
  it("has 85 points on three families of lines", () => {
    expect(ALL_POINTS).toHaveLength(85);
    for (const p of ALL_POINTS) {
      expect(LINES.filter((l) => l.includes(p))).toHaveLength(3);
    }
  });

  it("stops a ring at the first vacant point after markers", () => {
    const s = state({
      rings: { "5,5": "WHITE" },
      markers: { "5,3": "BLACK", "5,4": "BLACK" },
    });
    const targets = movesFrom(s, "5,5");
    expect(targets).toContain("5,2");
    expect(targets).not.toContain("5,1");
  });

  it("finds removable windows and their cells", () => {
    const s = state({
      markers: Object.fromEntries(
        ["1,5", "2,5", "3,5", "4,5", "5,5", "6,5"].map((c) => [c, "WHITE"]),
      ),
    });
    expect(rowWindows(s, "WHITE")).toEqual([
      ["1,5", "5,5"],
      ["2,5", "6,5"],
    ]);
    expect(windowCells("1,5", "5,5")).toEqual([
      "1,5",
      "2,5",
      "3,5",
      "4,5",
      "5,5",
    ]);
    expect(windowCells("5,5", "1,5")).toEqual([
      "5,5",
      "4,5",
      "3,5",
      "2,5",
      "1,5",
    ]);
    expect(windowCells("1,5", "4,5")).toEqual([]);
  });

  it("centres the hexagon", () => {
    expect(position("6,0").x).toBe(position("1,10").x);
    expect(position("9,0").x).toBe(position("4,10").x);
  });
});

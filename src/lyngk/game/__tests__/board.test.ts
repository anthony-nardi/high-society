import { describe, expect, it } from "vitest";
import {
  ALL_SPOTS,
  applyClaim,
  applyMove,
  pathsFrom,
  position,
  scoreOf,
} from "../board";
import { LyngkGameState } from "../types";

const state = (over: Partial<LyngkGameState> = {}): LyngkGameState => ({
  id: "l",
  game: "lyngk",
  players: [
    { email: "a", lastActionAt: 0, scored: 0, isBot: false, colours: ["RED"] },
    { email: "b", lastActionAt: 0, scored: 0, isBot: true },
  ],
  activePlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  turn: 1,
  ...over,
});

describe("board", () => {
  it("has 43 spots centred on the middle row", () => {
    expect(ALL_SPOTS).toHaveLength(43);
    expect(position("4,0").x).toBe(position("0,8").x);
    expect(position("6,0").x).toBe(position("2,8").x);
  });

  it("finds links and landings, and previews a scored five", () => {
    const s = state({
      stacks: {
        "0,4": ["RED"],
        "3,4": ["RED"],
        "5,4": ["BLUE", "GREEN", "BLACK", "IVORY"],
      },
    });
    expect(pathsFrom(s, "a", "0,4").map((p) => p.join(">"))).toEqual([
      "0,4>3,4>5,4",
    ]);
    const next = applyMove(s, ["0,4", "3,4", "5,4"]);
    expect(next.stacks?.["5,4"]).toBeUndefined();
    expect(next.players[0].scored).toBe(1);
    expect(next.lastMove?.removed).toBe("5,4");
    expect(scoreOf(next, "a")).toEqual([1, 0, 0, 0, 1]);
  });

  it("previews a claim", () => {
    const next = applyClaim(state(), "b", "BLUE");
    expect(next.players[1].colours).toEqual(["BLUE"]);
    expect(next.players[1].claimedThisTurn).toBe(true);
  });
});

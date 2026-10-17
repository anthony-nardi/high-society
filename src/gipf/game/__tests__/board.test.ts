import { describe, expect, it } from "vitest";
import {
  ALL_SPOTS,
  applyPush,
  applyRemoveRow,
  DOTS,
  legalPushes,
  LINES,
  rows,
} from "../board";
import { GipfGameState } from "../types";

const state = (over: Partial<GipfGameState> = {}): GipfGameState => ({
  id: "l",
  game: "gipf",
  players: [
    {
      email: "a",
      lastActionAt: 0,
      side: "WHITE",
      reserve: 12,
      captured: 0,
      isBot: false,
    },
    {
      email: "b",
      lastActionAt: 0,
      side: "BLACK",
      reserve: 12,
      captured: 0,
      isBot: true,
    },
  ],
  activePlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "MOVE",
  turn: 1,
  ...over,
});

describe("board", () => {
  it("has 37 spots, 24 dots and 21 lines ending on dots", () => {
    expect(ALL_SPOTS).toHaveLength(37);
    expect(DOTS).toHaveLength(24);
    expect(LINES).toHaveLength(21);
    for (const line of LINES) {
      expect(DOTS).toContain(line.ends[0]);
      expect(DOTS).toContain(line.ends[1]);
    }
    expect(legalPushes(state())).toHaveLength(42);
  });

  it("previews a push that shoves the line and the row it makes", () => {
    const s = state({
      pieces: {
        "1,4": "WHITE",
        "2,4": "WHITE",
        "3,4": "WHITE",
        "5,4": "BLACK",
      },
    });
    const next = applyPush(s, "0,4", "1,4", "WHITE");
    expect(next.pieces).toEqual({
      "1,4": "WHITE",
      "2,4": "WHITE",
      "3,4": "WHITE",
      "4,4": "WHITE",
      "5,4": "BLACK",
    });
    expect(next.lastMove?.shifted).toEqual(["2,4", "3,4", "4,4"]);
    expect(next.players[0].reserve).toBe(11);
    expect(rows(next)).toEqual([
      { side: "WHITE", cells: ["1,4", "2,4", "3,4", "4,4", "5,4"] },
    ]);
    const taken = applyRemoveRow(next, "2,4", "WHITE");
    expect(taken.pieces).toEqual({});
    expect(taken.lastMove?.removedColours).toEqual([
      "WHITE",
      "WHITE",
      "WHITE",
      "WHITE",
      "BLACK",
    ]);
  });
});

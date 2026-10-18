import { describe, expect, it } from "vitest";
import {
  applyPlace,
  crosses,
  holeOf,
  isHole,
  label,
  linksFor,
  placementProblem,
} from "../board";
import { TwixtGameState } from "../types";

function state(): TwixtGameState {
  return {
    id: "l",
    game: "twixt",
    players: [
      { email: "a", lastActionAt: 0, isBot: false, side: "RED" },
      { email: "b", lastActionAt: 0, isBot: true, side: "BLACK" },
    ],
    activePlayer: "a",
    startAt: "0",
    status: "IN_PROGRESS",
    pegs: { [String(holeOf(10, 10))]: "RED" },
    moves: 1,
    swapOffered: false,
    turn: 2,
  };
}

describe("twixt helpers", () => {
  it("knows the board and links like the server", () => {
    expect(isHole(holeOf(0, 0))).toBe(false);
    expect(label(holeOf(10, 10))).toBe("K11");
    const s = state();
    expect(placementProblem(s, "RED", holeOf(0, 4))).toContain("border");
    expect(placementProblem(s, "BLACK", holeOf(0, 4))).toBeNull();
    expect(linksFor(s, "RED", holeOf(12, 11))).toEqual([
      [holeOf(10, 10), holeOf(12, 11)],
    ]);
    expect(
      crosses([holeOf(5, 5), holeOf(7, 6)], [holeOf(6, 5), holeOf(7, 7)]),
    ).toBe(true);
    const next = applyPlace(s, "RED", holeOf(12, 11), "a");
    expect(next.links).toHaveLength(1);
    expect(next.moves).toBe(2);
    expect(next.lastMove?.hole).toBe(holeOf(12, 11));
  });
});

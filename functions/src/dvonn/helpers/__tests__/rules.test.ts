import { describe, expect, it } from "vitest";
import { ALL_SPACES, neighbours } from "../board";
import {
  allMoves,
  buildDvonnGameState,
  connectedToDvonn,
  isSurrounded,
  movesFrom,
  moveStack,
  placePiece,
  scores,
} from "../rules";
import { DvonnGameState, Piece } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "dvonn" as const,
  }));

/** a is white and starts. */
const newGame = () => buildDvonnGameState("lobby", lobby("a", "b"), () => 0);

/** A movement-phase position from a sparse description. */
function position(
  stacks: { [coord: string]: Piece[] },
  active = "a",
): DvonnGameState {
  const state = newGame();
  state.public.phase = "MOVE";
  state.public.stacks = { ...stacks };
  state.public.activePlayer = active;
  for (const p of state.public.players) {
    p.pieces = 0;
    p.dvonn = 0;
  }
  return state;
}

describe("board", () => {
  it("has 49 spaces in rows of 9, 10, 11, 10 and 9", () => {
    expect(ALL_SPACES).toHaveLength(49);
    expect(new Set(ALL_SPACES).size).toBe(49);
    const rows = [0, 1, 2, 3, 4].map(
      (y) => ALL_SPACES.filter((c) => c.endsWith(`,${y}`)).length,
    );
    expect(rows).toEqual([9, 10, 11, 10, 9]);
    expect(neighbours("5,2")).toHaveLength(6);
    expect(neighbours("2,0")).toHaveLength(3);
  });
});

describe("placement", () => {
  it("alternates from white, DVONN pieces first, then white moves", () => {
    const state = newGame();
    const [white, black] = state.public.players;
    expect(white.dvonn).toBe(2);
    expect(black.dvonn).toBe(1);

    const spaces = [...ALL_SPACES];
    spaces.forEach((coord, i) => {
      expect(state.public.activePlayer).toBe(i % 2 === 0 ? "a" : "b");
      expect(placePiece(state, coord).ok).toBe(true);
      const piece = state.public.stacks?.[coord]?.[0];
      expect(piece).toBe(i < 3 ? "DVONN" : i % 2 === 0 ? "WHITE" : "BLACK");
    });
    expect(white.pieces).toBe(0);
    expect(black.pieces).toBe(0);
    expect(state.public.phase).toBe("MOVE");
    expect(state.public.activePlayer).toBe("a");
    expect(placePiece(state, "5,2").ok).toBe(false);
  });

  it("refuses an occupied space", () => {
    const state = newGame();
    expect(placePiece(state, "5,2").ok).toBe(true);
    expect(placePiece(state, "5,2").ok).toBe(false);
    expect(placePiece(state, "99,9").ok).toBe(false);
  });
});

describe("moving", () => {
  it("moves exactly the stack height onto pieces, never onto empty spaces", () => {
    const state = position({
      "2,0": ["DVONN"],
      "3,0": ["WHITE"],
      "4,0": ["BLACK"],
      "5,0": ["WHITE", "WHITE"],
      "7,0": ["BLACK"],
      "3,1": ["BLACK"],
      "2,1": ["BLACK"],
    });
    expect(movesFrom(state, "3,0").sort()).toEqual([
      "2,0",
      "2,1",
      "3,1",
      "4,0",
    ]);
    // Height two: exactly two spaces. 7,0 is two to the east.
    expect(movesFrom(state, "5,0").sort()).toEqual(["3,0", "7,0"]);
    // Black's stacks are not white's to move.
    expect(moveStack(state, "4,0", "3,0").ok).toBe(false);
    expect(moveStack(state, "3,0", "6,0").ok).toBe(false);
    expect(moveStack(state, "3,0", "4,0").ok).toBe(true);
    expect(state.public.stacks?.["4,0"]).toEqual(["BLACK", "WHITE"]);
    expect(state.public.stacks?.["3,0"]).toBeUndefined();
    expect(state.public.activePlayer).toBe("b");
  });

  it("freezes a stack surrounded on all six sides, but never one on the edge", () => {
    const stacks: { [c: string]: Piece[] } = {
      "5,2": ["WHITE"],
      "2,0": ["WHITE"],
    };
    for (const n of neighbours("5,2")) stacks[n] = ["BLACK"];
    for (const n of neighbours("2,0")) stacks[n] = ["BLACK"];
    const state = position(stacks);
    expect(isSurrounded(state, "5,2")).toBe(true);
    expect(movesFrom(state, "5,2")).toEqual([]);
    expect(isSurrounded(state, "2,0")).toBe(false);
    expect(movesFrom(state, "2,0").length).toBeGreaterThan(0);
  });

  it("cannot move a lone DVONN piece, but carries one inside a stack", () => {
    const state = position({
      "4,2": ["DVONN"],
      "5,2": ["DVONN", "WHITE"],
      "7,2": ["BLACK"],
    });
    expect(movesFrom(state, "4,2")).toEqual([]);
    expect(moveStack(state, "5,2", "6,2").ok).toBe(false);
    expect(moveStack(state, "5,2", "7,2").ok).toBe(true);
    expect(state.public.stacks?.["7,2"]).toEqual(["BLACK", "DVONN", "WHITE"]);
    // Nothing was cut off: 4,2 is itself a DVONN piece.
    expect(state.public.stacks?.["4,2"]).toEqual(["DVONN"]);
  });

  it("removes everything that loses contact with the DVONN pieces", () => {
    // A chain: DVONN at 2,2 - black 3,2 - white 4,2 - black 5,2 - white 6,2 ... and 8,2 black.
    const state = position({
      "2,2": ["DVONN"],
      "3,2": ["BLACK"],
      "4,2": ["WHITE"],
      "5,2": ["BLACK"],
      "6,2": ["WHITE"],
      "8,2": ["BLACK"],
      "3,3": ["WHITE"],
    });
    expect(connectedToDvonn(state).has("8,2")).toBe(false);
    // White moves 4,2 onto 3,2: 5,2 and 6,2 are now cut off.
    expect(moveStack(state, "4,2", "3,2").ok).toBe(true);
    expect(state.public.stacks?.["5,2"]).toBeUndefined();
    expect(state.public.stacks?.["6,2"]).toBeUndefined();
    expect(state.public.stacks?.["3,2"]).toEqual(["BLACK", "WHITE"]);
    expect(state.public.lastMove?.removed?.sort()).toEqual([
      "5,2",
      "6,2",
      "8,2",
    ]);
    expect(
      state.private.log?.some((e) => /3 stacks lost contact/.test(e.title)),
    ).toBe(true);
  });

  it("makes a stuck player pass and ends when nobody can move, taller total winning", () => {
    const state = position({
      "2,2": ["DVONN"],
      "3,2": ["WHITE"],
      "4,2": ["WHITE"],
      "3,1": ["WHITE"],
      "2,3": ["BLACK", "BLACK"],
    });
    // Black's stack of two has nothing exactly two spaces away.
    expect(allMoves(state, "BLACK")).toEqual([]);
    expect(moveStack(state, "4,2", "3,2").ok).toBe(true);
    // Black passes; white is on again.
    expect(state.public.activePlayer).toBe("a");
    expect(state.public.notification?.title).toMatch(
      /b cannot move and passes/,
    );
    expect(state.public.status).toBe("IN_PROGRESS");
    expect(moveStack(state, "3,1", "2,2").ok).toBe(true);
    // Now nobody can move: white's two stacks of two have only empty spaces two away.
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("a");
    expect(state.public.scores).toEqual({ WHITE: 4, BLACK: 2 });
    expect(scores(state)).toEqual({ WHITE: 4, BLACK: 2 });
    expect(state.public.log).toEqual(state.private.log);
  });

  it("counts a draw when the totals are equal", () => {
    const state = position({
      "2,2": ["DVONN"],
      "3,2": ["WHITE"],
      "4,2": ["BLACK"],
      "8,0": ["DVONN", "BLACK"],
    });
    // White 3,2 -> 2,2 cuts 4,2 off. Black's stack of two at 8,0 and white's at 2,2 are both stuck.
    expect(moveStack(state, "3,2", "2,2").ok).toBe(true);
    expect(state.public.stacks?.["4,2"]).toBeUndefined();
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.draw).toBe(true);
    expect(state.public.scores).toEqual({ WHITE: 2, BLACK: 2 });
  });
});

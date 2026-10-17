import { describe, expect, it } from "vitest";
import {
  ALL_SPACES,
  applyMove,
  connectedToDvonn,
  movesFrom,
  position,
  scores,
} from "../board";
import { DvonnGameState } from "../types";

const state = (over: Partial<DvonnGameState> = {}): DvonnGameState => ({
  id: "l",
  game: "dvonn",
  players: [
    {
      email: "a",
      lastActionAt: 0,
      side: "WHITE",
      pieces: 0,
      dvonn: 0,
      isBot: false,
    },
    {
      email: "b",
      lastActionAt: 0,
      side: "BLACK",
      pieces: 0,
      dvonn: 0,
      isBot: true,
    },
  ],
  activePlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "MOVE",
  turn: 50,
  ...over,
});

describe("board", () => {
  it("has 49 spaces centred on the middle row", () => {
    expect(ALL_SPACES).toHaveLength(49);
    expect(position("2,0").x).toBe(position("0,4").x);
    expect(position("10,0").x).toBe(position("8,4").x);
  });

  it("moves a stack exactly its height onto pieces", () => {
    const s = state({
      stacks: {
        "2,2": ["DVONN"],
        "3,2": ["WHITE", "WHITE"],
        "5,2": ["BLACK"],
        "4,2": ["BLACK"],
      },
    });
    expect(movesFrom(s, "3,2")).toEqual(["5,2"]);
    expect(movesFrom(s, "2,2")).toEqual([]);
  });

  it("previews a move with its removals", () => {
    const s = state({
      stacks: {
        "2,2": ["DVONN"],
        "3,2": ["WHITE"],
        "4,2": ["BLACK"],
        "5,2": ["BLACK"],
      },
    });
    expect(connectedToDvonn(s).size).toBe(4);
    const next = applyMove(s, "3,2", "2,2");
    expect(next.stacks?.["2,2"]).toEqual(["DVONN", "WHITE"]);
    expect(next.stacks?.["4,2"]).toBeUndefined();
    expect(next.lastMove?.removed?.sort()).toEqual(["4,2", "5,2"]);
    expect(scores(next)).toEqual({ WHITE: 2, BLACK: 0 });
  });
});

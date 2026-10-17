import { describe, expect, it } from "vitest";
import {
  ALL_RINGS,
  capturers,
  isRemovable,
  jumpedOver,
  jumpsFrom,
  placeableColours,
  position,
  removableRings,
  viewBox,
  winHint,
  winProgress,
} from "../board";
import { ZertzGameState } from "../types";

const state = (over: Partial<ZertzGameState> = {}): ZertzGameState => ({
  id: "l",
  game: "zertz",
  players: [
    { email: "a", lastActionAt: 0, isBot: false },
    { email: "b", lastActionAt: 0, isBot: true },
  ],
  activePlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  rings: [...ALL_RINGS],
  pool: { WHITE: 6, GRAY: 8, BLACK: 10 },
  phase: "MOVE",
  turn: 1,
  ...over,
});

describe("board queries", () => {
  it("finds jumps and the marble jumped over", () => {
    const s = state({ marbles: { "3,3": "WHITE", "4,3": "GRAY" } });
    expect(jumpsFrom(s, "3,3")).toEqual(["5,3"]);
    expect(jumpsFrom(s, "4,3")).toEqual(["2,3"]);
    expect(capturers(s).sort()).toEqual(["3,3", "4,3"]);
    expect(jumpedOver("3,3", "5,3")).toBe("4,3");
    expect(jumpedOver("3,3", "4,4")).toBeNull();
  });

  it("knows which rings can be removed", () => {
    const s = state();
    expect(isRemovable(s, "4,0")).toBe(true);
    expect(isRemovable(s, "4,3")).toBe(false);
    expect(removableRings(s)).toHaveLength(18);
  });

  it("places from captures when the pool is empty", () => {
    const s = state({
      pool: {},
      players: [
        { email: "a", lastActionAt: 0, isBot: false, captured: { BLACK: 2 } },
        { email: "b", lastActionAt: 0, isBot: true },
      ],
    });
    expect(placeableColours(s)).toEqual(["BLACK"]);
  });

  it("describes the nearest win", () => {
    expect(winProgress({ WHITE: 3 })).toBe(0.75);
    expect(winHint({ WHITE: 3 }).label).toBe("1 more white");
    expect(winHint({ WHITE: 2, GRAY: 3, BLACK: 3 }).label).toBe(
      "1 more for three of each",
    );
  });
});

describe("geometry", () => {
  it("lays the hexagon out symmetrically", () => {
    // The top and bottom rows cover the same span once the skew is applied.
    expect(position("4,0").x).toBe(position("1,6").x);
    expect(position("7,0").x).toBe(position("4,6").x);
    expect(position("1,3").x).toBeLessThan(position("4,0").x);
    const box = viewBox();
    expect(box.width).toBeGreaterThan(box.height);
  });
});

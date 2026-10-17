import { describe, expect, it } from "vitest";
import { ALL_BRIDGES, neighbours, originIsStronger, VILLAGES } from "../board";
import { ShangriLaGameState } from "../types";

describe("map", () => {
  it("has thirteen villages and twenty-three bridges", () => {
    expect(VILLAGES).toHaveLength(13);
    expect(ALL_BRIDGES).toHaveLength(23);
    expect(neighbours(ALL_BRIDGES, 6)).toHaveLength(3);
  });

  it("judges strength as the rules do", () => {
    const state = {
      villages: [
        {
          spaces: {
            HEALER: { owner: "a", student: true },
            PRIEST: { owner: "a" },
          },
        },
        {
          spaces: {
            HEALER: { owner: "b" },
            RAINMAKER: { owner: "b" },
            ASTROLOGER: { owner: "c" },
          },
        },
      ],
    } as unknown as ShangriLaGameState;
    // Three tiles each; the destination has more masters, so it is stronger.
    expect(originIsStronger(state, 0, 1)).toBe(false);
    expect(originIsStronger(state, 1, 0)).toBe(true);
  });
});

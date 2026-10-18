import { describe, expect, it } from "vitest";
import {
  canPlace,
  DIVERSITY,
  openCells,
  runningScore,
  scoreGrid,
} from "../board";
import { Grid } from "../types";

describe("ecosystem helpers", () => {
  it("scores like the server and lists open cells", () => {
    const g: Grid = {
      "0_0": "MEADOW",
      "0_1": "BEE",
      "0_2": "MEADOW",
      "1_1": "BEAR",
      "1_2": "TROUT",
      "1_3": "STREAM",
    };
    const s = scoreGrid(g);
    expect(s.BEE).toBe(6);
    expect(s.BEAR).toBe(4);
    expect(s.TROUT).toBe(2);
    expect(runningScore(g).scoring).toBe(3);
    expect(canPlace(g, 0, 3)).toBe(true);
    expect(canPlace(g, 2, 0)).toBe(false);
    expect(openCells(g)).toContain("0_3");
    expect(DIVERSITY(9)).toBe(12);
  });
});

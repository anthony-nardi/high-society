import { describe, expect, it } from "vitest";
import { BORDERS, largestConnected, REGIONS, strengthOf } from "../board";

describe("condottiere helpers", () => {
  it("has the map and reckons strength like the server", () => {
    expect(REGIONS).toHaveLength(17);
    expect(BORDERS.length).toBeGreaterThan(20);
    expect(largestConnected([0, 1, 3])).toBe(3);
    expect(strengthOf(["M3", "M5", "DRUMMER"], "SPRING")).toBe(6 + 13);
    expect(strengthOf(["M3", "HEROINE", "COURTESAN"], "WINTER")).toBe(12);
  });
});

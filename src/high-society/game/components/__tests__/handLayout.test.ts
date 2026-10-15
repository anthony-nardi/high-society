import { describe, expect, it } from "vitest";
import { handLayout } from "../handLayout";

describe("handLayout", () => {
  it("centres a lone card with no tilt", () => {
    expect(handLayout(1, 0)).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  it("fans cards symmetrically around the centre", () => {
    const left = handLayout(5, 0);
    const right = handLayout(5, 4);
    const middle = handLayout(5, 2);

    expect(middle.x).toBe(0);
    expect(middle.rotate).toBe(0);
    expect(left.x).toBe(-right.x);
    expect(left.rotate).toBe(-right.rotate);
    expect(left.y).toBe(right.y);
    expect(left.rotate).toBeLessThan(0);
  });

  it("rests the outer cards on the baseline and lifts the middle", () => {
    expect(handLayout(7, 0).y).toBe(0);
    expect(handLayout(7, 6).y).toBe(0);
    expect(handLayout(7, 1).y).toBeLessThan(handLayout(7, 0).y);
    expect(handLayout(7, 3).y).toBeLessThan(handLayout(7, 1).y);
  });

  it("caps the total spread so a full starting hand fits on screen", () => {
    const outer = handLayout(11, 10);
    expect(outer.rotate).toBeLessThanOrEqual(20);
    expect(outer.x).toBeLessThanOrEqual(280);
  });
});

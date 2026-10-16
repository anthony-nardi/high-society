import { describe, expect, it } from "vitest";
import { businessPoints, roundPoints, tableValue } from "../tableValue";
import { RazziaPlayerState } from "../types";

const player = (
  email: string,
  cards: RazziaPlayerState["cards"] = {},
): RazziaPlayerState => ({
  email,
  lastActionAt: 0,
  cards,
  bid: "0",
  score: 0,
  isBot: false,
});

describe("roundPoints (client copy of the server rule)", () => {
  it("matches the rulebook values", () => {
    expect(
      roundPoints(
        {
          jewels: ["SCARAB", "CROSS", "RING"],
          bodyguards: ["BODYGUARDS", "BODYGUARDS"],
          coins: ["COINS"],
          cars: ["CARS", "CARS"],
          drivers: ["DRIVERS"],
          theives: ["THIEF"],
        },
        [2, 0],
      ),
    ).toEqual({
      jewels: 5,
      bodyguards: 5,
      coins: 3,
      cars: 2,
      drivers: 1,
      thieves: 2,
    });
    expect(roundPoints({}, [2, 0])).toEqual({
      jewels: -5,
      bodyguards: -2,
      coins: 0,
      cars: 0,
      drivers: 0,
      thieves: 0,
    });
  });

  it("scores businesses like the server", () => {
    expect(businessPoints(["CASINO", "CASINO", "CASINO", "RACING"])).toBe(7);
    expect(
      businessPoints([
        "CASINO",
        "TRANSPORTATION",
        "MOVIE_THEATER",
        "RACING",
        "REAL_ESTATE",
        "NIGHTCLUB",
        "RESTAURANT",
      ]),
    ).toBe(10);
  });
});

describe("tableValue", () => {
  it("explains what each category on the table is worth to the viewer", () => {
    const me = player("me", { jewels: ["RING", "TIARA"], cars: ["CARS"] });
    const other = player("other", { bodyguards: ["BODYGUARDS"] });
    const value = tableValue(
      ["SCARAB", "COINS", "DRIVERS", "BODYGUARDS", "CASINO", "POLICE_RAIDS"],
      me,
      [me, other],
    );
    const byLabel = Object.fromEntries(value.lines.map((l) => [l.label, l]));

    // Third jewel kind: 0 -> 5.
    expect(byLabel.Jewels.delta).toBe(5);
    expect(byLabel.Jewels.what).toBe("Scarab");
    expect(byLabel.Coins.delta).toBe(3);
    // The driver unlocks the car already held: +1 driver +1 car.
    expect(byLabel["Cars & drivers"].delta).toBe(2);
    // One bodyguard draws level with the other player: fewest (-2) -> tie (0).
    expect(byLabel.Bodyguards.delta).toBe(2);
    expect(byLabel.Businesses.delta).toBe(1);
    expect(byLabel.Businesses.when).toBe("end");
    expect(value.total).toBe(5 + 3 + 2 + 2 + 1);
  });

  it("warns that cars score nothing without a driver", () => {
    const me = player("me");
    const value = tableValue(["CARS", "CARS"], me, [me]);
    expect(value.lines[0].delta).toBe(0);
    expect(value.lines[0].note).toBe("cars need a driver to score");
  });

  it("ignores police cards and an empty table", () => {
    const me = player("me");
    expect(tableValue(["POLICE_RAIDS"], me, [me]).lines).toEqual([]);
    expect(tableValue([], me, [me]).total).toBe(0);
  });
});

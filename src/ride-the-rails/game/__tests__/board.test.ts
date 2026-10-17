import { describe, expect, it } from "vitest";
import {
  CHICAGO,
  CITIES,
  EAST_CITIES,
  hexIndex,
  legalHexes,
  linksFrom,
  neighbours,
  payoutsFor,
  ridableCities,
  traceJourney,
} from "../board";
import { RideTheRailsGameState } from "../types";

const BOSTON = hexIndex(19, 3);
const NEW_YORK = hexIndex(19, 4);
const PHILADELPHIA = hexIndex(18, 4);

function state(): RideTheRailsGameState {
  return {
    id: "l",
    game: "ride-the-rails",
    players: [
      {
        email: "a",
        lastActionAt: 0,
        isBot: false,
        money: 0,
        shares: { RED: 2 },
      },
      {
        email: "b",
        lastActionAt: 0,
        isBot: true,
        money: 0,
        shares: { BLUE: 1 },
      },
      { email: "c", lastActionAt: 0, isBot: true, money: 0 },
    ],
    activePlayer: "a",
    startAt: "0",
    status: "IN_PROGRESS",
    phase: "RIDE",
    round: 1,
    order: ["a", "b", "c"],
    seat: 0,
    track: { RED: [BOSTON, NEW_YORK], BLUE: [NEW_YORK, PHILADELPHIA] },
    supply: {
      RED: 25,
      BLUE: 25,
      ORANGE: 27,
      YELLOW: 27,
      PURPLE: 27,
      BLACK: 27,
    },
    passengers: [...CITIES],
    built: 0,
    mountainBuilt: false,
    turn: 1,
  };
}

describe("ride the rails helpers", () => {
  it("has the map and finds links like the server", () => {
    expect(CITIES).toHaveLength(40);
    expect(EAST_CITIES).toContain(BOSTON);
    expect(neighbours(BOSTON)).toContain(NEW_YORK);
    expect(CHICAGO).toBe(hexIndex(13, 3));
    const s = state();
    expect(linksFrom(s, "RED", BOSTON).map((l) => l.to)).toEqual([NEW_YORK]);
    expect(ridableCities(s).sort()).toEqual(
      [BOSTON, NEW_YORK, PHILADELPHIA].sort(),
    );
  });

  it("traces a journey, offers the next links and reckons the payouts", () => {
    const s = state();
    const traced = traceJourney(s, {
      start: BOSTON,
      legs: [{ railroad: "RED", to: NEW_YORK }],
    });
    expect(traced.at).toBe(NEW_YORK);
    expect(traced.route.hexes).toEqual([BOSTON, NEW_YORK]);
    expect(traced.next.map((n) => `${n.railroad}-${n.link.to}`)).toEqual([
      `BLUE-${PHILADELPHIA}`,
    ]);
    const pay = payoutsFor(s, traced.route);
    expect(pay.earned).toBe(2);
    expect(pay.dividends).toEqual([{ email: "a", amount: 2 }]);
  });

  it("lists where a railroad may build", () => {
    const s = state();
    s.phase = "BUILD";
    expect(legalHexes(s, s.players[0], "RED")).toContain(hexIndex(18, 3));
    expect(legalHexes(s, s.players[0], "RED")).not.toContain(BOSTON);
    expect(legalHexes(s, s.players[0], "BLUE")).toEqual([]);
    s.track = {};
    expect(legalHexes(s, s.players[0], "RED").sort()).toEqual(
      [...EAST_CITIES].sort(),
    );
  });
});

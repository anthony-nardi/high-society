import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { RideTheRailsGameState } from "../../types";
import {
  buildRideTheRailsGameState,
  buildTrack,
  endBuild,
  legalPlacements,
  linksFrom,
  ride,
  startingCities,
  takeShare,
  traceJourney,
} from "../rules";
import {
  CHICAGO,
  CITIES,
  EAST_CITIES,
  hexIndex,
  isMountain,
  neighbours,
  WEST_CITIES,
} from "../board";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "ride-the-rails",
  }));

const BOSTON = hexIndex(19, 3);
const NEW_YORK = hexIndex(19, 4);
const PHILADELPHIA = hexIndex(18, 4);
const PITTSBURGH = hexIndex(17, 4);
const DETROIT = hexIndex(15, 3);
const BUFFALO = hexIndex(16, 3);
const SEATTLE = hexIndex(1, 1);
const PORTLAND = hexIndex(1, 2);
const MINNEAPOLIS = hexIndex(12, 2);

function fresh(count = 3) {
  const names = ["a", "b", "c", "d", "e"].slice(0, count);
  return buildRideTheRailsGameState("l", lobby(...names), () => 0);
}

/** Jumps straight to a build turn for the first player with the shares given. */
function building(
  state: RideTheRailsGameState,
  shares: { [email: string]: { [railroad: string]: number } },
  round = 1,
) {
  state.public.round = round;
  state.public.order = state.public.players.map((p) => p.email);
  state.public.phase = "BUILD";
  state.public.seat = 0;
  state.public.built = 0;
  state.public.mountainBuilt = false;
  state.public.activePlayer = state.public.order[0];
  for (const p of state.public.players) p.shares = shares[p.email] || {};
  return state;
}

function riding(state: RideTheRailsGameState) {
  state.public.order = state.public.players.map((p) => p.email);
  state.public.phase = "RIDE";
  state.public.seat = 0;
  state.public.activePlayer = state.public.order[0];
  return state;
}

/** What the database hands back: no empty arrays or objects. */
function roundTrip<T>(value: T): T {
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      const out = v.map(strip).filter((x) => x !== undefined);
      return out.length ? out : undefined;
    }
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        const s = strip(x);
        if (s !== undefined) out[k] = s;
      }
      return Object.keys(out).length ? out : undefined;
    }
    return v;
  };
  return strip(value) as T;
}

describe("the map", () => {
  it("has the special cities and a sensible grid", () => {
    expect(CITIES.length).toBe(40);
    expect(EAST_CITIES.length).toBe(6);
    expect(WEST_CITIES.length).toBe(4);
    expect(CHICAGO).toBe(hexIndex(13, 3));
    expect(neighbours(BOSTON)).toContain(NEW_YORK);
    expect(neighbours(PHILADELPHIA)).toContain(NEW_YORK);
    expect(neighbours(PHILADELPHIA)).toContain(PITTSBURGH);
    expect(neighbours(BOSTON)).not.toContain(PHILADELPHIA);
    expect(isMountain(hexIndex(1, 3))).toBe(true);
    expect(isMountain(BOSTON)).toBe(false);
    // Every city can be reached from every other over land.
    const seen = new Set<number>([BOSTON]);
    const queue = [BOSTON];
    while (queue.length)
      for (const n of neighbours(queue.shift() as number))
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
    for (const c of CITIES) expect(seen.has(c)).toBe(true);
  });
});

describe("setting up", () => {
  it("deals a passenger to every city, 27 locomotives a colour and reverse-order shares", () => {
    const state = fresh();
    expect(state.public.passengers?.length).toBe(CITIES.length);
    expect(state.public.supply.RED).toBe(27);
    expect(state.public.phase).toBe("SHARE");
    expect(state.public.round).toBe(1);
    expect(state.public.order.length).toBe(3);
    expect(state.public.activePlayer).toBe(state.public.order[2]);
    expect(state.public.players.every((p) => p.money === 0)).toBe(true);
  });
});

describe("taking shares", () => {
  it("only allows open railroads with locomotives left, then moves to building", () => {
    const state = fresh();
    const [first, second, third] = state.public.order;
    expect(takeShare(state, "ORANGE").ok).toBe(false);
    expect(takeShare(state, "RED").ok).toBe(true);
    expect(state.public.supply.RED).toBe(26);
    expect(state.public.players.find((p) => p.email === third)?.shares).toEqual(
      { RED: 1 },
    );
    expect(state.public.activePlayer).toBe(second);
    expect(takeShare(state, "BLUE").ok).toBe(true);
    expect(state.public.activePlayer).toBe(first);
    expect(takeShare(state, "RED").ok).toBe(true);
    expect(state.public.phase).toBe("BUILD");
    expect(state.public.activePlayer).toBe(first);
  });

  it("skips a player when nothing can be taken", () => {
    const state = fresh();
    state.public.supply.RED = 0;
    state.public.supply.BLUE = 0;
    expect(takeShare(state, "RED").ok).toBe(false);
    // Nobody can take anything, so the next share action is refused as the phase has moved on.
    state.public.supply.BLUE = 1;
    expect(takeShare(state, "BLUE").ok).toBe(true);
    // The two remaining players have nothing to take, nobody can build or
    // ride without locomotives, so the game rolls straight into round 2.
    expect(state.public.round).toBe(2);
    expect(state.public.phase).toBe("SHARE");
    expect(state.public.supply.ORANGE).toBe(27);
  });
});

describe("building track", () => {
  it("starts in a coloured city and grows from there", () => {
    const state = building(fresh(), { a: { RED: 1 } });
    const player = state.public.players.find((p) => p.email === "a")!;
    expect(state.public.activePlayer).toBe("a");
    expect(buildTrack(state, "RED", CHICAGO).ok).toBe(false);
    expect(buildTrack(state, "BLUE", BOSTON).ok).toBe(false);
    expect(buildTrack(state, "RED", BOSTON).ok).toBe(true);
    expect(buildTrack(state, "RED", BOSTON).ok).toBe(false);
    expect(buildTrack(state, "RED", PHILADELPHIA).ok).toBe(false);
    expect(buildTrack(state, "RED", NEW_YORK).ok).toBe(true);
    expect(state.public.track?.RED).toEqual([BOSTON, NEW_YORK]);
    expect(state.public.supply.RED).toBe(25);
    expect(state.public.built).toBe(2);
    expect(
      legalPlacements(state, player).every((p) => p.railroad === "RED"),
    ).toBe(true);
  });

  it("lets two railroads share a hex but not three, except in Chicago", () => {
    const state = building(fresh(), { a: { RED: 1, BLUE: 1, ORANGE: 1 } }, 2);
    expect(buildTrack(state, "RED", BOSTON).ok).toBe(true);
    expect(buildTrack(state, "BLUE", BOSTON).ok).toBe(true);
    expect(buildTrack(state, "ORANGE", BOSTON).ok).toBe(false);
    expect(buildTrack(state, "ORANGE", CHICAGO).ok).toBe(true);
    expect(
      state.public.players[0].money +
        state.public.players[1].money +
        state.public.players[2].money,
    ).toBe(2);
  });

  it("ends the turn after the limit, one fewer in the mountains", () => {
    const state = building(fresh(), { a: { RED: 1 }, b: { BLUE: 1 } });
    expect(buildTrack(state, "RED", BOSTON).ok).toBe(true);
    let at = BOSTON;
    // Walk west along row 3 for seven more placements.
    for (let i = 0; i < 7; i++) {
      at -= 1;
      expect(buildTrack(state, "RED", at).ok).toBe(true);
    }
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.built).toBe(0);

    const mountains = building(fresh(), { a: { BLUE: 1 } });
    expect(buildTrack(mountains, "BLUE", PHILADELPHIA).ok).toBe(true);
    expect(buildTrack(mountains, "BLUE", PITTSBURGH).ok).toBe(true);
    const ridge = neighbours(PITTSBURGH).find((h) => isMountain(h))!;
    expect(ridge).toBeDefined();
    expect(buildTrack(mountains, "BLUE", ridge).ok).toBe(true);
    expect(mountains.public.mountainBuilt).toBe(true);
    const player = mountains.public.players.find((p) => p.email === "a")!;
    let laid = 3;
    while (
      mountains.public.phase === "BUILD" &&
      mountains.public.activePlayer === "a" &&
      laid < 10
    ) {
      const next = legalPlacements(mountains, player)[0];
      expect(buildTrack(mountains, next.railroad, next.hex).ok).toBe(true);
      laid++;
    }
    expect(laid).toBe(7);
  });

  it("pays the first builder into a $5 city and ending early is allowed", () => {
    const state = building(fresh(), { a: { RED: 1 }, b: { RED: 1 } });
    state.public.track = { RED: [CHICAGO, hexIndex(13, 2)] };
    expect(buildTrack(state, "RED", MINNEAPOLIS).ok).toBe(true);
    expect(state.public.players.find((p) => p.email === "a")?.money).toBe(5);
    expect(endBuild(state).ok).toBe(true);
    expect(state.public.activePlayer).toBe("b");
    state.public.track = {
      RED: [CHICAGO, hexIndex(13, 2)],
      BLUE: [hexIndex(13, 2)],
    };
    state.public.players[1].shares = { RED: 1, BLUE: 1 };
    expect(buildTrack(state, "BLUE", MINNEAPOLIS).ok).toBe(true);
    expect(state.public.players.find((p) => p.email === "b")?.money).toBe(0);
  });

  it("pays the Transcontinental bonus once: $12 in a city, $8 elsewhere", () => {
    const west = [SEATTLE, PORTLAND];
    for (let col = 1; col <= 12; col++) west.push(hexIndex(col, 3));
    const inCity = building(fresh(), { a: { PURPLE: 1 } }, 5);
    inCity.public.track = {
      PURPLE: west,
      RED: [
        BOSTON,
        hexIndex(18, 3),
        hexIndex(17, 3),
        BUFFALO,
        DETROIT,
        hexIndex(14, 3),
        CHICAGO,
      ],
    };
    expect(buildTrack(inCity, "PURPLE", CHICAGO).ok).toBe(true);
    expect(inCity.public.transcontinental).toBe("a");
    expect(inCity.public.players.find((p) => p.email === "a")?.money).toBe(14);

    const open = building(fresh(), { a: { PURPLE: 1 } }, 5);
    open.public.track = {
      PURPLE: [...west, CHICAGO],
      RED: [
        BOSTON,
        hexIndex(18, 3),
        hexIndex(17, 3),
        BUFFALO,
        DETROIT,
        hexIndex(14, 3),
      ],
    };
    expect(buildTrack(open, "PURPLE", hexIndex(14, 3)).ok).toBe(true);
    expect(open.public.players.find((p) => p.email === "a")?.money).toBe(8);
    expect(buildTrack(open, "PURPLE", hexIndex(14, 2)).ok).toBe(true);
    expect(open.public.players.find((p) => p.email === "a")?.money).toBe(8);
  });

  it("opens Yellow in Chicago or the three westernmost occupied cities", () => {
    const state = building(fresh(), { a: { YELLOW: 1 } }, 3);
    state.public.track = {
      RED: [BOSTON, NEW_YORK, PHILADELPHIA, PITTSBURGH],
      BLUE: [BOSTON],
    };
    expect(startingCities(state, "YELLOW").sort()).toEqual(
      [CHICAGO, PITTSBURGH, PHILADELPHIA, BOSTON].sort(),
    );
    expect(buildTrack(state, "YELLOW", BOSTON).ok).toBe(false);
    expect(buildTrack(state, "YELLOW", PITTSBURGH).ok).toBe(true);
  });
});

describe("riding the rails", () => {
  it("finds links city to city and pays the rider and the shareholders", () => {
    const state = riding(fresh());
    state.public.track = { RED: [BOSTON, NEW_YORK, PHILADELPHIA] };
    const [rider, other, third] = state.public.order;
    state.public.players.find((p) => p.email === rider)!.shares = { RED: 1 };
    state.public.players.find((p) => p.email === other)!.shares = { RED: 3 };
    expect(linksFrom(state, "RED", BOSTON).map((l) => l.to)).toEqual([
      NEW_YORK,
    ]);
    expect(
      ride(state, {
        start: BOSTON,
        legs: [{ railroad: "RED", to: PHILADELPHIA }],
      }).ok,
    ).toBe(false);
    expect(
      ride(state, {
        start: BOSTON,
        legs: [
          { railroad: "RED", to: NEW_YORK },
          { railroad: "RED", to: PHILADELPHIA },
        ],
      }).ok,
    ).toBe(true);
    const moneyOf = (e: string) =>
      state.public.players.find((p) => p.email === e)!.money;
    expect(moneyOf(rider)).toBe(3 + 2);
    expect(moneyOf(other)).toBe(6);
    expect(moneyOf(third)).toBe(0);
    expect(state.public.passengers).not.toContain(BOSTON);
    expect(state.public.passengers).toContain(NEW_YORK);
    expect(state.public.lastRide?.hexes).toEqual([
      BOSTON,
      NEW_YORK,
      PHILADELPHIA,
    ]);
    expect(state.public.activePlayer).toBe(other);
  });

  it("refuses to loop, to start without a passenger, or to stand still", () => {
    const state = riding(fresh());
    state.public.track = { RED: [BOSTON, NEW_YORK], BLUE: [BOSTON, NEW_YORK] };
    expect(traceJourney(state, { start: BOSTON, legs: [] }).ok).toBe(false);
    expect(
      traceJourney(state, {
        start: BOSTON,
        legs: [
          { railroad: "RED", to: NEW_YORK },
          { railroad: "BLUE", to: BOSTON },
        ],
      }).ok,
    ).toBe(false);
    state.public.passengers = [NEW_YORK];
    expect(
      traceJourney(state, {
        start: BOSTON,
        legs: [{ railroad: "RED", to: NEW_YORK }],
      }).ok,
    ).toBe(false);
    expect(
      traceJourney(state, {
        start: NEW_YORK,
        legs: [{ railroad: "RED", to: BOSTON }],
      }).ok,
    ).toBe(true);
  });

  it("skips players with no passenger to carry and ends the round poorest first", () => {
    const state = riding(fresh());
    const [a, b, c] = state.public.order;
    state.public.players.find((p) => p.email === a)!.money = 9;
    state.public.players.find((p) => p.email === b)!.money = 4;
    state.public.players.find((p) => p.email === c)!.money = 4;
    // No track at all: everyone is skipped and round 2 starts.
    state.public.track = { RED: [BOSTON, NEW_YORK] };
    state.public.players.find((p) => p.email === a)!.shares = { RED: 1 };
    expect(
      ride(state, { start: BOSTON, legs: [{ railroad: "RED", to: NEW_YORK }] })
        .ok,
    ).toBe(true);
    expect(state.public.activePlayer).toBe(b);
    expect(
      ride(state, { start: NEW_YORK, legs: [{ railroad: "RED", to: BOSTON }] })
        .ok,
    ).toBe(true);
    // Both passengers between Boston and New York are gone: c is skipped.
    expect(state.public.round).toBe(2);
    expect(state.public.phase).toBe("SHARE");
    expect(state.public.order).toEqual([c, b, a]);
    expect(state.public.activePlayer).toBe(a);
  });

  it("ends after round six with the richest player winning, or a draw", () => {
    const state = riding(fresh());
    state.public.round = 6;
    state.public.players[0].money = 20;
    state.public.players[1].money = 30;
    expect(ride(state, { start: BOSTON, legs: [] }).ok).toBe(false);
    // Nobody can ride: the game ends.
    state.public.track = { RED: [BOSTON, NEW_YORK] };
    state.public.passengers = [];
    state.public.phase = "BUILD";
    state.public.seat = state.public.order.length - 1;
    state.public.activePlayer = state.public.order[state.public.seat];
    expect(endBuild(state).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe(state.public.players[1].email);

    const tie = riding(fresh());
    tie.public.round = 6;
    tie.public.phase = "BUILD";
    tie.public.seat = tie.public.order.length - 1;
    tie.public.activePlayer = tie.public.order[tie.public.seat];
    expect(endBuild(tie).ok).toBe(true);
    expect(tie.public.status).toBe("GAME_OVER");
    expect(tie.public.draw).toBe(true);
  });

  it("copes with the database dropping empty lists", () => {
    const state = roundTrip(building(fresh(), { a: { RED: 1 } }));
    expect(state.public.track).toBeUndefined();
    expect(buildTrack(state, "RED", BOSTON).ok).toBe(true);
    const later = roundTrip(riding(state));
    later.public.passengers = [];
    const stripped = roundTrip(later);
    expect(stripped.public.passengers).toBeUndefined();
    expect(ride(stripped, { start: BOSTON, legs: [] }).ok).toBe(false);
  });
});

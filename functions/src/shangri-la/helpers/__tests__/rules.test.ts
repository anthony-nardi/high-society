import { describe, expect, it } from "vitest";
import {
  ALL_BRIDGES,
  bridgesFor,
  MASTERS,
  neighbours,
  RED_VILLAGE,
  VILLAGES,
} from "../board";
import {
  buildShangriLaGameState,
  hasAnyAction,
  journey,
  journeys,
  placeMaster,
  placements,
  placeSetupMaster,
  recruit,
  recruitable,
  scoreOf,
  strengthOf,
} from "../rules";
import { Master, ShangriLaGameState, Space } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "shangri-la" as const,
  }));

/** a, b, c (and d); a starts. */
const newGame = (...emails: string[]) =>
  buildShangriLaGameState("lobby", lobby(...emails), () => 0);

/** A play-phase position. Spaces as village -> discipline -> owner (+ "*" for a student). */
function position(
  layout: { [village: number]: { [type: string]: string } },
  emails = ["a", "b", "c", "d"],
): ShangriLaGameState {
  const state = newGame(...emails);
  state.public.phase = "PLAY";
  for (const p of state.public.players) p.placed = [...MASTERS];
  for (const [village, spaces] of Object.entries(layout)) {
    const v = state.public.villages[Number(village)];
    v.spaces = {};
    for (const [type, spec] of Object.entries(spaces)) {
      const student = spec.endsWith("*");
      const space: Space = { owner: spec.replace("*", "") };
      if (student) space.student = true;
      v.spaces[type as Master] = space;
    }
  }
  return state;
}

describe("map", () => {
  it("has thirteen villages and twenty-three bridges, twenty without the red village", () => {
    expect(VILLAGES).toHaveLength(13);
    expect(ALL_BRIDGES).toHaveLength(23);
    expect(neighbours(ALL_BRIDGES, RED_VILLAGE)).toHaveLength(3);
    expect(bridgesFor(3)).toHaveLength(20);
    expect(bridgesFor(4)).toHaveLength(23);
    for (let v = 0; v < 13; v++)
      expect(neighbours(ALL_BRIDGES, v).length).toBeGreaterThanOrEqual(2);
  });
});

describe("setup", () => {
  it("places one master of each discipline within the limits, then play begins with the starter", () => {
    const state = newGame("a", "b", "c");
    expect(state.public.villages[RED_VILLAGE].stone).toBe(true);
    expect(state.public.players.map((p) => p.colour)).toEqual([
      "RED",
      "BLUE",
      "YELLOW",
    ]);
    // Nobody may place in the red village.
    expect(placements(state, "a").some(([v]) => v === RED_VILLAGE)).toBe(false);
    expect(placeSetupMaster(state, 0, "HEALER").ok).toBe(true);
    expect(state.public.activePlayer).toBe("b");
    // Three players: one tile per colour per village, two in all.
    expect(placeSetupMaster(state, 0, "PRIEST").ok).toBe(true);
    expect(placeSetupMaster(state, 0, "RAINMAKER").ok).toBe(false); // village full
    expect(placeSetupMaster(state, 1, "RAINMAKER").ok).toBe(true);
    expect(placeSetupMaster(state, 1, "HEALER").ok).toBe(false); // a already placed a healer
    expect(placeSetupMaster(state, 1, "PRIEST").ok).toBe(true);
    expect(state.public.players[0].supply.HEALER).toBe(5);
  });

  it("hands over to play once everyone has placed seven", () => {
    const state = newGame("a", "b", "c");
    const order = ["a", "b", "c"];
    let v = 0;
    for (let round = 0; round < 7; round++) {
      for (const email of order) {
        expect(state.public.activePlayer).toBe(email);
        const [village, type] =
          placements(state, email).find(([x]) => x >= v) ??
          placements(state, email)[0];
        expect(placeSetupMaster(state, village, type).ok).toBe(true);
        v = (v + 1) % 13;
      }
    }
    expect(state.public.phase).toBe("PLAY");
    expect(state.public.activePlayer).toBe("a");
    expect(
      state.public.players.every((p) =>
        Object.values(p.supply).every((n) => n === 5),
      ),
    ).toBe(true);
  });
});

describe("placing and recruiting", () => {
  it("needs one of your masters in the village and an empty matching space", () => {
    const state = position({ 0: { HEALER: "a" }, 1: { PRIEST: "b" } });
    expect(placeMaster(state, 1, "HEALER").ok).toBe(false);
    expect(placeMaster(state, 0, "HEALER").ok).toBe(false);
    expect(placeMaster(state, 0, "PRIEST").ok).toBe(true);
    expect(state.public.villages[0].spaces?.PRIEST).toEqual({ owner: "a" });
    expect(state.public.activePlayer).toBe("b");
  });

  it("puts up to two students on your own masters, one each", () => {
    const state = position({
      0: { HEALER: "a", PRIEST: "a", RAINMAKER: "b" },
      2: { ASTROLOGER: "a*" },
    });
    expect(recruitable(state, "a").map(([v, t]) => `${v}:${t}`)).toEqual([
      "0:PRIEST",
      "0:HEALER",
    ]);
    expect(recruit(state, [[0, "RAINMAKER"]]).ok).toBe(false);
    expect(
      recruit(state, [
        [0, "HEALER"],
        [0, "HEALER"],
      ]).ok,
    ).toBe(false);
    expect(
      recruit(state, [
        [0, "HEALER"],
        [0, "PRIEST"],
        [2, "ASTROLOGER"],
      ]).ok,
    ).toBe(false);
    expect(
      recruit(state, [
        [0, "HEALER"],
        [0, "PRIEST"],
      ]).ok,
    ).toBe(true);
    expect(state.public.villages[0].spaces?.HEALER).toEqual({
      owner: "a",
      student: true,
    });
    expect(state.public.players[0].supply.HEALER).toBe(5);
  });
});

describe("journeys", () => {
  it("needs your own student and a bridge, and everyone's students travel", () => {
    const state = position({
      0: { HEALER: "a*", PRIEST: "b*", RAINMAKER: "c" },
      1: { ASTROLOGER: "c" },
    });
    expect(journeys(state, "a")).toEqual([
      [0, 1],
      [0, 2],
    ]);
    expect(journeys(state, "c")).toEqual([]);
    expect(journey(state, 0, 3).ok).toBe(false); // no bridge
    expect(journey(state, 0, 1).ok).toBe(true);
    // Both students arrive on empty spaces and become masters; the masters stay behind.
    expect(state.public.villages[1].spaces).toEqual({
      ASTROLOGER: { owner: "c" },
      HEALER: { owner: "a" },
      PRIEST: { owner: "b" },
    });
    expect(state.public.villages[0].spaces?.HEALER).toEqual({ owner: "a" });
    expect(state.public.bridges?.some(([x, y]) => x === 0 && y === 1)).toBe(
      false,
    );
  });

  it("from the stronger village, students displace rivals, join their own, or return if the spot is full", () => {
    const state = position({
      0: {
        HEALER: "a*",
        PRIEST: "a*",
        RAINMAKER: "a*",
        ASTROLOGER: "b",
        FIREKEEPER: "b",
      }, // strength 8
      1: { HEALER: "b*", PRIEST: "a", RAINMAKER: "a*" }, // strength 5
    });
    expect(strengthOf(state.public.villages[0])).toBe(8);
    expect(journey(state, 0, 1).ok).toBe(true);
    const spaces = state.public.villages[1].spaces;
    expect(spaces?.HEALER).toEqual({ owner: "a" }); // b's master and student sent home
    expect(spaces?.PRIEST).toEqual({ owner: "a", student: true }); // joined own master
    expect(spaces?.RAINMAKER).toEqual({ owner: "a", student: true }); // already full: traveller returned
    expect(state.public.players[1].supply.HEALER).toBe(6 + 2);
    expect(state.public.players[0].supply.RAINMAKER).toBe(6 + 1);
    expect(state.public.lastMove?.arrivals?.map((x) => x.outcome)).toEqual([
      "returned",
      "student",
      "displaced",
    ]);
  });

  it("from the weaker village, students only fill empty spaces", () => {
    const state = position({
      0: { HEALER: "a*", PRIEST: "a*" }, // strength 4
      1: { HEALER: "b", RAINMAKER: "b*", ASTROLOGER: "c", FIREKEEPER: "c" }, // strength 5
    });
    expect(journey(state, 0, 1).ok).toBe(true);
    const spaces = state.public.villages[1].spaces;
    expect(spaces?.HEALER).toEqual({ owner: "b" });
    expect(spaces?.PRIEST).toEqual({ owner: "a" });
    expect(state.public.players[0].supply.HEALER).toBe(7);
  });

  it("breaks ties by masters, then in favour of the destination", () => {
    // Equal strength 3 each; origin has 1 master and 2 students, destination 3 masters: destination stronger.
    const state = position({
      0: { HEALER: "a*", PRIEST: "a" }, // 3 tiles, 2 masters
      1: { HEALER: "b", RAINMAKER: "b", ASTROLOGER: "c" }, // 3 tiles, 3 masters
    });
    expect(journey(state, 0, 1).ok).toBe(true);
    expect(state.public.villages[1].spaces?.HEALER).toEqual({ owner: "b" });
  });

  it("lays a stone on a village that loses its last bridge and ends when the last bridge goes", () => {
    const state = position({
      0: { HEALER: "a*" },
      1: { PRIEST: "b" },
      2: { PRIEST: "c" },
    });
    state.public.bridges = [
      [0, 1],
      [0, 2],
    ];
    expect(journey(state, 0, 1).ok).toBe(true);
    expect(state.public.villages[1].stone).toBe(true);
    expect(state.public.villages[0].stone).toBeUndefined();
    expect(state.public.lastMove?.stones).toEqual([1]);
    expect(hasAnyAction(state, "b")).toBe(false); // b's only village is at peace
    // a recruits again and sends the last student over the last bridge.
    state.public.activePlayer = "a";
    expect(recruit(state, [[0, "HEALER"]]).ok).toBe(true);
    state.public.activePlayer = "a";
    expect(journey(state, 0, 2).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(scoreOf(state, "a")).toEqual({ masters: 3, villages: 3 });
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
  });

  it("skips players with nothing to do and ends when nobody can act", () => {
    const state = position({ 0: { HEALER: "a" } }, ["a", "b", "c"]);
    state.public.villages[0].stone = true;
    state.public.bridges = [[1, 2]];
    expect(hasAnyAction(state, "a")).toBe(false);
    // b has nothing either; neither does c: a journey is impossible, so the only action anyone had is gone.
    state.public.villages[1].spaces = { PRIEST: { owner: "b", student: true } };
    expect(journey(state, 1, 2).ok).toBe(false); // not b's turn
    state.public.activePlayer = "b";
    expect(journey(state, 1, 2).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
  });
});

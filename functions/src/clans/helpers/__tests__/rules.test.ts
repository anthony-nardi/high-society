import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { ClansGameState, Huts } from "../../types";
import {
  appraise,
  buildClansGameState,
  isIsolated,
  legalMoves,
  moveHuts,
  moveProblem,
} from "../rules";
import {
  COLOURS,
  EPOCHS,
  epochOf,
  neighbours,
  terrainOf,
  TERRITORIES,
} from "../board";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "clans",
  }));

const fresh = (count = 3) =>
  buildClansGameState(
    "l",
    lobby(...["a", "b", "c", "d"].slice(0, count)),
    () => 0,
  );

/** A board holding only the territories given. */
function position(
  huts: { [territory: number]: Huts },
  count = 3,
): ClansGameState {
  const state = fresh(count);
  state.public.huts = Object.fromEntries(
    Object.entries(huts).map(([t, h]) => [String(t), h]),
  );
  state.public.activePlayer = "a";
  return state;
}

describe("the board", () => {
  it("has sixty territories in twelve regions of five, four terrains and lakes", () => {
    expect(TERRITORIES).toHaveLength(60);
    const regions = new Map<number, number>();
    for (const t of TERRITORIES)
      regions.set(t.region, (regions.get(t.region) ?? 0) + 1);
    expect([...regions.values()].every((n) => n === 5)).toBe(true);
    for (const terrain of ["GRASSLAND", "FOREST", "MOUNTAIN", "STEPPE"])
      expect(TERRITORIES.filter((t) => t.terrain === terrain)).toHaveLength(15);
    // Adjacency is symmetric and every territory has at least two neighbours.
    TERRITORIES.forEach((t, i) => {
      expect(t.adjacent.length).toBeGreaterThanOrEqual(2);
      for (const n of t.adjacent) expect(neighbours(n)).toContain(i);
    });
    expect(EPOCHS.reduce((n, e) => n + e.villages, 0)).toBe(12);
    expect([0, 3, 4, 6, 7, 8, 9, 10, 11].map(epochOf)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4,
    ]);
  });
});

describe("setting up", () => {
  it("puts one hut of each colour in every region and deals secret clans", () => {
    const state = fresh(3);
    const huts = state.public.huts || {};
    expect(Object.keys(huts)).toHaveLength(60);
    for (let region = 0; region < 12; region++) {
      const seen = TERRITORIES.map((t, i) =>
        t.region === region ? huts[String(i)] : null,
      )
        .filter((h): h is Huts => !!h)
        .flatMap((h) => Object.keys(h));
      expect([...seen].sort()).toEqual([...COLOURS].sort());
    }
    const colours = state.public.players.map((p) => p.colour);
    expect(new Set(colours).size).toBe(3);
    expect(state.public.scores).toEqual({
      RED: 0,
      BLUE: 0,
      YELLOW: 0,
      GREEN: 0,
      BLACK: 0,
    });
    expect(legalMoves(state).length).toBeGreaterThan(100);
  });
});

describe("moving huts", () => {
  it("moves whole groups to occupied neighbours only, never a frozen group", () => {
    const [a, b] = [0, neighbours(0)[0]];
    const far = TERRITORIES.findIndex(
      (_, i) => !neighbours(a).includes(i) && i !== a,
    );
    const state = position({
      [a]: { RED: 2 },
      [b]: { BLUE: 1 },
      [far]: { GREEN: 1 },
    });
    expect(moveProblem(state, a, far)).toContain("neighbouring");
    const empty = neighbours(far).find((n) => n !== a && n !== b) as number;
    expect(moveProblem(state, far, empty)).toContain("already holds");
    const frozen = position({ [a]: { RED: 7 }, [b]: { BLUE: 1 } });
    expect(moveProblem(frozen, a, b)).toContain("7 or more");
    expect(moveHuts(state, a, b).ok).toBe(true);
    expect(state.public.huts?.[String(a)]).toBeUndefined();
    expect(state.public.huts?.[String(b)]).toEqual({ RED: 2, BLUE: 1 });
    expect(state.public.activePlayer).toBe("b");
  });

  it("founds a village when a group is cut off, scoring every colour present", () => {
    const a = 20;
    const [b, c] = neighbours(a);
    // b holds blue; moving a's reds into b isolates nothing yet, because c still touches b? Build it so b is only next to a among occupied ones.
    const others = neighbours(b).filter((n) => n !== a);
    const state = position({
      [a]: { RED: 2 },
      [b]: { BLUE: 1, YELLOW: 1 },
      [c]: {},
    });
    for (const n of others) delete state.public.huts![String(n)];
    delete state.public.huts![String(c)];
    expect(isIsolated(state, b)).toBe(false);
    const terrain = terrainOf(b);
    const chart = EPOCHS[0];
    const expected =
      chart.forbidden === terrain
        ? 0
        : 4 + (chart.favoured === terrain ? chart.bonus : 0);
    // Before the move only the two huts already there count.
    expect(appraise(state, b).points).toBe(
      chart.forbidden === terrain ? 0 : expected - 2,
    );
    expect(moveHuts(state, a, b).ok).toBe(true);
    expect(state.public.villages).toHaveLength(1);
    const village = state.public.villages![0];
    expect(village.points).toBe(expected);
    expect(village.founder).toBe("a");
    expect(village.colours.sort()).toEqual(["BLUE", "RED", "YELLOW"]);
    expect(state.public.scores.RED).toBe(expected);
    expect(state.public.scores.GREEN).toBe(0);
    expect(state.public.huts?.[String(b)]).toBeUndefined();
    expect(state.public.players[0].chips).toBe(1);
  });

  it("drives out lone huts in a strife of all five colours", () => {
    const state = fresh(3);
    state.public.huts = {
      "5": { RED: 3, BLUE: 2, YELLOW: 1, GREEN: 1, BLACK: 2 },
    };
    const v = appraise(state, 5);
    expect(v.strife).toBe(true);
    expect(v.colours.sort()).toEqual(["BLACK", "BLUE", "RED"]);
    expect(v.huts).toEqual({ RED: 3, BLUE: 2, BLACK: 2 });
    if (!v.destroyed) expect(v.points).toBe(7 + v.bonus);
  });

  it("razes a village on the forbidden terrain and still hands over a chip", () => {
    const state = fresh(3);
    const t = TERRITORIES.findIndex((x) => x.terrain === EPOCHS[0].forbidden);
    const n = neighbours(t)[0];
    state.public.huts = { [String(t)]: { RED: 2 }, [String(n)]: { BLUE: 1 } };
    state.public.activePlayer = "a";
    expect(moveHuts(state, n, t).ok).toBe(true);
    expect(state.public.villages?.[0].destroyed).toBe(true);
    expect(state.public.scores.RED).toBe(0);
    expect(state.public.players[0].chips).toBe(1);
    expect(state.public.huts).toEqual({});
    // Nothing can move any more, so the game ends.
    expect(state.public.status).toBe("GAME_OVER");
  });

  it("ends after the twelfth village with clans revealed and chips counted", () => {
    const state = fresh(2);
    state.public.villages = Array.from({ length: 11 }, (_, i) => ({
      territory: i,
      terrain: "FOREST" as const,
      founder: "a",
      epoch: epochOf(i),
      huts: {},
      colours: [],
      points: 0,
      bonus: 0,
      strife: false,
      destroyed: false,
    }));
    const t = 30;
    const n = neighbours(t)[0];
    const me = state.public.players[0].colour;
    state.public.huts = { [String(t)]: { [me]: 2 }, [String(n)]: { [me]: 1 } };
    state.public.activePlayer = "a";
    state.public.players[0].chips = 4;
    expect(moveHuts(state, n, t).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.villages).toHaveLength(12);
    const mine = state.public.results?.find((r) => r.email === "a");
    expect(mine?.chips).toBe(5);
    expect(mine?.track).toBe(state.public.scores[me]);
    expect(mine?.total).toBe(mine!.track + 5);
    expect(state.public.log).toEqual(state.private.log);
  });
});

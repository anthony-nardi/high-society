import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { Grid } from "../../types";
import {
  buildCoralReefGameState,
  choose,
  mayAct,
  playProblem,
  scoreAll,
  setNeutralRandom,
} from "../rules";
import {
  canMove,
  canPlace,
  chooseFlips,
  foodWeb,
  fullDeck,
  moveTargets,
  openCells,
  placings,
  scoreGrid,
} from "../board";
import { chooseBotMove, turnMoves } from "../botSearch";
import { takeBotTurn } from "../bot";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "coral-reef",
  }));

const fresh = (...emails: string[]) =>
  buildCoralReefGameState("l", lobby(...emails), () => 0);

/** A grid from rows of letters: C coral, K krill, P plankton, G grouper, F clownfish, B crab, E eel, S shark, W whale, T turtle, O octopus, . empty. */
function grid(rows: string[]): Grid {
  const map: { [c: string]: Grid[string] } = {
    C: "CORAL",
    K: "KRILL",
    P: "PLANKTON",
    G: "GROUPER",
    F: "CLOWNFISH",
    B: "CRAB",
    E: "EEL",
    S: "SHARK",
    W: "WHALE",
    T: "TURTLE",
    O: "OCTOPUS",
  };
  const out: Grid = {};
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (map[ch]) out[`${r}_${c}`] = map[ch];
    }),
  );
  return out;
}

describe("the deck and the grid", () => {
  it("has 130 cards and keeps placements adjacent within 4 by 5", () => {
    expect(fullDeck()).toHaveLength(130);
    const g = grid(["KKKKK", "P...."]);
    expect(canPlace(g, 1, 1)).toBe(true);
    expect(canPlace(g, 0, 5)).toBe(false);
    expect(canPlace(g, -1, 0)).toBe(true);
    expect(canPlace(g, 2, 4)).toBe(false);
    expect(canPlace({}, 0, 0)).toBe(true);
    expect(openCells(g).length).toBeGreaterThan(5);
  });

  it("lets an octopus move a card only where the reef stays whole", () => {
    const g = grid(["CKO"]);
    expect(canMove(g, "0_0", "1_1")).toBe(true); // coral under the krill
    expect(canMove(g, "0_1", "1_0")).toBe(false); // the krill out of the middle splits the reef
    expect(canMove(g, "0_0", "0_5")).toBe(false);
    expect(moveTargets(g, "0_0").sort()).toEqual(
      ["-1_1", "-1_2", "0_3", "1_1", "1_2"].sort(),
    );
  });
});

describe("scoring one reef", () => {
  it("scores each card type as the rulebook does", () => {
    // Row 0: plankton, clownfish between plankton and coral below, crab in a row with two plankton.
    // Row 1: coral under the clownfish, eel beside coral and prey, grouper by krill.
    const g = grid(["PFBP.", "CEGK.", "SK.K.", "CTTO."]);
    const s = scoreGrid(g);
    expect(s.CLOWNFISH).toBe(2); // plankton to the left; the eel below is no coral
    expect(s.CRAB).toBe(2 * 2); // two plankton in row 0
    expect(s.EEL).toBe(4 * 2); // coral to the left; clownfish above and grouper to the right are prey
    expect(s.GROUPER).toBe(3); // one krill to the right
    expect(s.KRILL).toBe(4 + 1); // (1,3) and (2,3) touch; (2,1) is alone
    expect(s.SHARK).toBeUndefined(); // no prey in row 2 or column 0
    expect(s.CORAL).toBe(3); // only the coral on the bottom row (3,0)
    expect(s.TURTLE).toBe(2 * (1 + 2));
    expect(s.OCTOPUS).toBe(3);
  });

  it("knows krill groups, the plankton placings and the food web bonus", () => {
    expect(scoreGrid(grid(["KK"])).KRILL).toBe(4);
    expect(scoreGrid(grid(["KKK"])).KRILL).toBe(9);
    expect(scoreGrid(grid(["KKKKK"])).KRILL).toBe(9);
    expect(scoreGrid(grid(["K.K"])).KRILL).toBe(2);
    expect(placings([3, 5, 5, 1], [12, 8, 4])).toEqual([4, 12, 12, 0]);
    expect(placings([0, 2], [12, 8, 4])).toEqual([0, 12]);
    const web = foodWeb({ CORAL: 3, KRILL: 9, GROUPER: 6, EEL: 8, TURTLE: 4 });
    expect(web).toEqual({
      producers: 12,
      prey: 6,
      predators: 8,
      foodWeb: 6,
      other: 4,
      total: 36,
    });
  });

  it("flips one card beside each whale and ignores it", () => {
    // A whale with krill to its right and a shark below: flipping the shark keeps the krill points.
    const g = grid(["WK", "S."]);
    const flips = chooseFlips(g);
    expect(flips).toEqual(["1_0"]);
    const s = scoreGrid(g, flips);
    expect(s.WHALE).toBe(2);
    expect(s.SHARK).toBeUndefined();
    expect(s.KRILL).toBe(1);
  });
});

describe("drafting", () => {
  it("deals ten each, places simultaneously, passes left then right, and plays twenty cards", () => {
    const state = fresh("a", "b", "c");
    expect(state.public.players.every((p) => p.hand?.length === 10)).toBe(true);
    expect(mayAct(state, "a") && mayAct(state, "c")).toBe(true);
    expect(playProblem(state, "a", { card: 0, row: 1, col: 0 })).toContain(
      "empty space",
    );
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(false);
    expect(choose(state, "b", { card: 2, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "c", { card: 9, row: 0, col: 0 }).ok).toBe(true);
    expect(state.public.pick).toBe(1);
    let guard = 0;
    while (state.public.status === "IN_PROGRESS" && guard++ < 100) {
      const email = state.public.activePlayer;
      const player = state.public.players.find((p) => p.email === email)!;
      const cell = openCells(player.grid || {})[0];
      const [row, col] = cell.split("_").map(Number);
      expect(choose(state, email, { card: 0, row, col }).ok).toBe(true);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.round).toBe(2);
    expect(
      state.public.players.every(
        (p) => Object.keys(p.grid || {}).length === 20,
      ),
    ).toBe(true);
    expect(state.public.results?.length).toBe(3);
    const r = state.public.results![0];
    expect(r.total).toBe(
      r.producers + r.prey + r.predators + r.foodWeb + r.other,
    );
  });

  it("lets an octopus swap two cards or move one, and refuses otherwise", () => {
    const state = fresh("a", "b");
    const a = state.public.players[0];
    a.hand = ["OCTOPUS", "CORAL", "KRILL"];
    a.grid = { "0_0": "CORAL", "0_1": "KRILL" };
    expect(
      playProblem(state, "a", {
        card: 1,
        row: 0,
        col: 2,
        swap: ["0_0", "0_1"],
      }),
    ).toContain("Octopus");
    expect(
      playProblem(state, "a", {
        card: 0,
        row: 0,
        col: 2,
        move: ["0_1", "1_0"],
      }),
    ).toContain("whole");
    expect(
      playProblem(state, "a", {
        card: 0,
        row: 0,
        col: 2,
        swap: ["0_0", "0_1"],
        move: ["0_0", "1_1"],
      }),
    ).toContain("not both");
    expect(
      choose(state, "a", { card: 0, row: 0, col: 2, move: ["0_0", "1_1"] }).ok,
    ).toBe(true);
    expect(choose(state, "b", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(a.grid).toEqual({
      "0_1": "KRILL",
      "0_2": "OCTOPUS",
      "1_1": "CORAL",
    });
    expect(state.public.lastPick?.[0].moved).toEqual(["0_0", "1_1"]);
  });

  it("runs a neutral third hand for two players whose plankton competes", () => {
    setNeutralRandom(() => 0);
    const state = fresh("a", "b");
    expect(state.public.neutral?.hand).toHaveLength(10);
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "b", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(state.public.neutral?.discards).toHaveLength(1);
    state.public.neutral = { discards: ["PLANKTON", "PLANKTON", "PLANKTON"] };
    state.public.players[0].grid = grid(["PP"]);
    state.public.players[1].grid = grid(["P"]);
    const results = scoreAll(state);
    expect(results[0].byType.PLANKTON).toBe(8);
    expect(results[1].byType.PLANKTON).toBe(4);
    setNeutralRandom(Math.random);
  });
});

describe("the bot", () => {
  it("puts a grouper by krill and plays whole games at every seat count", () => {
    const state = fresh("Bot #1", "b", "c");
    const me = state.public.players[0];
    me.grid = { "0_0": "KRILL", "0_1": "KRILL" };
    me.hand = ["CRAB", "GROUPER", "SHARK"];
    const move = chooseBotMove(state);
    expect(move?.card).toBe(1);
    for (const count of [2, 3, 4, 5, 6]) {
      const game = buildCoralReefGameState(
        "l",
        Array.from({ length: count }, (_, i) => ({
          email: `Bot #${i + 1}`,
          ready: true,
          joinedAt: "0",
          isBot: true,
          gameName: "coral-reef" as const,
        })),
        () => 0.29,
      );
      let steps = 0;
      while (game.public.status === "IN_PROGRESS" && steps < 200) {
        expect(turnMoves(game).length).toBeGreaterThan(0);
        takeBotTurn(game);
        steps++;
      }
      expect(game.public.status).toBe("GAME_OVER");
      for (const p of game.public.players)
        expect(Object.keys(p.grid || {})).toHaveLength(20);
    }
  }, 60000);
});

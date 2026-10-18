import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { Grid } from "../../types";
import {
  buildEcosystemGameState,
  choose,
  mayAct,
  playProblem,
  scoreAll,
  setNeutralRandom,
} from "../rules";
import {
  canPlace,
  DIVERSITY,
  fullDeck,
  openCells,
  placings,
  scoreGrid,
} from "../board";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "ecosystem",
  }));

const fresh = (...emails: string[]) =>
  buildEcosystemGameState("l", lobby(...emails), () => 0);

/** A grid from rows of letters: B bear, E bee, D deer, F dragonfly, G eagle, X fox, M meadow, R rabbit, S stream, T trout, W wolf, . empty. */
function grid(rows: string[]): Grid {
  const map: { [c: string]: Grid[string] } = {
    B: "BEAR",
    E: "BEE",
    D: "DEER",
    F: "DRAGONFLY",
    G: "EAGLE",
    X: "FOX",
    M: "MEADOW",
    R: "RABBIT",
    S: "STREAM",
    T: "TROUT",
    W: "WOLF",
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
    const g = grid(["MMMMM", "S...."]);
    expect(canPlace(g, 1, 1)).toBe(true);
    expect(canPlace(g, 1, 2)).toBe(true);
    expect(canPlace(g, 0, 5)).toBe(false); // a sixth column
    expect(canPlace(g, -1, 0)).toBe(true); // rows 0 and 1 used: three more rows allowed
    expect(canPlace(g, 2, 0)).toBe(true);
    expect(canPlace(g, 2, 4)).toBe(false); // not adjacent
    expect(canPlace({}, 0, 0)).toBe(true);
    expect(canPlace({}, 1, 0)).toBe(false);
    const tall = grid(["M", "M", "M", "M"]);
    expect(canPlace(tall, 4, 0)).toBe(false);
    expect(canPlace(tall, 0, 1)).toBe(true);
    expect(openCells(g).length).toBeGreaterThan(5);
  });
});

describe("scoring one ecosystem", () => {
  it("scores each card type as the rulebook does", () => {
    // Row 0: bee between meadows; row 1: bear by bee and trout; trout by stream and dragonfly.
    const g = grid(["MEM..", "BTSFD", "XWRGD", "MMMM."]);
    const s = scoreGrid(g);
    expect(s.BEE).toBe(6);
    expect(s.BEAR).toBe(2); // bear at (1,0): only the trout to its right is adjacent
    expect(s.TROUT).toBe(2); // trout at (1,1): stream right 2; dragonfly not adjacent
    expect(s.FOX).toBeUndefined(); // fox at (2,0) next to wolf at (2,1)
    expect(s.RABBIT).toBe(1);
    expect(s.EAGLE).toBe(2 * 2); // eagle at (2,3): rabbit (2,2) and trout (1,1) within 2
    expect(s.DRAGONFLY).toBe(1); // dragonfly at (1,3): stream (1,2) of length 1
    expect(s.DEER).toBe(2 * (2 + 1)); // deer in rows 1 and 2, column 4
    expect(s.MEADOW).toBe(0 + 10); // single meadows score 0; the bottom four score 10... plus (0,0) alone and (0,2) alone
  });

  it("knows the meadow ladder, the diversity table and the placings", () => {
    expect(scoreGrid(grid(["MM"])).MEADOW).toBe(3);
    expect(scoreGrid(grid(["MMM"])).MEADOW).toBe(6);
    expect(scoreGrid(grid(["MMMMM", "MM..."])).MEADOW).toBe(15);
    expect(scoreGrid(grid(["MMM", "M.M"])).MEADOW).toBe(15);
    expect([4, 5, 6, 7, 8, 9, 11].map(DIVERSITY)).toEqual([
      -5, -5, 0, 3, 7, 12, 12,
    ]);
    expect(placings([3, 5, 5, 1], [8, 5])).toEqual([0, 8, 8, 0]);
    expect(placings([3, 5, 2, 0], [8, 5])).toEqual([5, 8, 0, 0]);
    expect(placings([2, 2, 1], [12, 8, 4])).toEqual([12, 12, 4]);
    expect(placings([0, 0], [12, 8, 4])).toEqual([0, 0]);
  });
});

describe("drafting", () => {
  it("deals ten each, places simultaneously, passes left then right, and plays twenty cards", () => {
    const state = fresh("a", "b", "c");
    expect(state.public.players.every((p) => p.hand?.length === 10)).toBe(true);
    expect(mayAct(state, "a") && mayAct(state, "c")).toBe(true);
    const bHand = [...(state.public.players[1].hand as string[])];
    expect(playProblem(state, "a", { card: 0, row: 1, col: 0 })).toContain(
      "empty space",
    );
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(false);
    expect(state.public.activePlayer).toBe("b");
    expect(choose(state, "b", { card: 2, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "c", { card: 9, row: 0, col: 0 }).ok).toBe(true);
    expect(state.public.pick).toBe(1);
    // b's nine remaining cards are now in front of c.
    bHand.splice(2, 1);
    expect(state.public.players[2].hand).toEqual(bHand);
    expect(state.public.players.every((p) => p.hand?.length === 9)).toBe(true);
    expect(Object.keys(state.public.players[0].grid || {})).toEqual(["0_0"]);
    // Play the rest out legally.
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
    expect(state.public.log).toEqual(state.private.log);
  });

  it("lets a rabbit swap two cards and refuses swaps otherwise", () => {
    const state = fresh("a", "b");
    const a = state.public.players[0];
    a.hand = ["RABBIT", "BEE", "MEADOW"];
    a.grid = { "0_0": "BEE", "0_1": "MEADOW" };
    expect(
      playProblem(state, "a", {
        card: 1,
        row: 0,
        col: 2,
        swap: ["0_0", "0_1"],
      }),
    ).toContain("Rabbit");
    expect(
      playProblem(state, "a", {
        card: 0,
        row: 0,
        col: 2,
        swap: ["0_0", "9_9"],
      }),
    ).toContain("two different");
    expect(
      choose(state, "a", { card: 0, row: 0, col: 2, swap: ["0_0", "0_2"] }).ok,
    ).toBe(true);
    expect(choose(state, "b", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(a.grid).toEqual({ "0_0": "RABBIT", "0_1": "MEADOW", "0_2": "BEE" });
    expect(state.public.lastPick?.[0].swapped).toEqual(["0_0", "0_2"]);
  });

  it("runs a neutral third hand for two players that competes for streams and wolves", () => {
    setNeutralRandom(() => 0);
    const state = fresh("a", "b");
    expect(state.public.neutral?.hand).toHaveLength(10);
    const neutralFirst = (state.public.neutral?.hand as string[])[0];
    const aHand = [...(state.public.players[0].hand as string[])];
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "b", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    // The neutral set one card aside; a's leftovers went to it, its leftovers to b.
    expect(state.public.neutral?.discards).toEqual([neutralFirst]);
    aHand.splice(0, 1);
    expect(state.public.neutral?.hand).toEqual(aHand);
    state.public.neutral = {
      discards: ["STREAM", "STREAM", "STREAM", "WOLF", "WOLF"],
    };
    state.public.players[0].grid = grid(["SS"]);
    state.public.players[1].grid = grid(["W"]);
    const results = scoreAll(state);
    // Neutral has the longest stream (3) and most wolves (2): a's stream is second (5), b's wolf second (8).
    expect(results[0].byType.STREAM).toBe(5);
    expect(results[1].byType.WOLF).toBe(8);
    setNeutralRandom(Math.random);
  });
});

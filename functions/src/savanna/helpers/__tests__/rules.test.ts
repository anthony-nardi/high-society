import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { Grid } from "../../types";
import {
  buildSavannaGameState,
  choose,
  mayAct,
  playProblem,
  scoreAll,
  setNeutralRandom,
} from "../rules";
import { canPlace, fullDeck, openCells, placings, scoreGrid } from "../board";
import { chooseBotMove, turnMoves } from "../botSearch";
import { takeBotTurn } from "../bot";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "savanna",
  }));

const fresh = (...emails: string[]) =>
  buildSavannaGameState("l", lobby(...emails), () => 0);

/** A grid from rows of letters: W watering hole, G grassland, T tree, A gazelle, Z zebra, R giraffe, C cheetah, L lion, E elephant, H hyena, V vulture, . empty. */
function grid(rows: string[]): Grid {
  const map: { [c: string]: Grid[string] } = {
    W: "WATERING_HOLE",
    G: "GRASSLAND",
    T: "TREE",
    A: "GAZELLE",
    Z: "ZEBRA",
    R: "GIRAFFE",
    C: "CHEETAH",
    L: "LION",
    E: "ELEPHANT",
    H: "HYENA",
    V: "VULTURE",
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
  it("has 132 cards and keeps placements adjacent within 4 by 5", () => {
    expect(fullDeck()).toHaveLength(132);
    const g = grid(["GGGGG", "T...."]);
    expect(canPlace(g, 1, 1)).toBe(true);
    expect(canPlace(g, 0, 5)).toBe(false);
    expect(canPlace(g, 2, 4)).toBe(false);
    expect(openCells({})).toEqual(["0_0"]);
  });
});

describe("scoring one ecosystem", () => {
  it("scores the landforms and the grazers as the rulebook does", () => {
    // Watering hole with a giraffe above, two gazelles left and right (one type) and a tree below.
    const g = grid([".R..", "AWAT", ".T..", "ZGGG"]);
    const s = scoreGrid(g).byType;
    expect(s.WATERING_HOLE).toBe(2 * 2); // giraffe and gazelle: two types
    expect(s.GAZELLE).toBe(4);
    expect(s.TREE).toBe(2 * (2 + 2)); // rows 1 and 2, columns 1 and 3
    expect(s.GRASSLAND).toBe(9);
    expect(s.ZEBRA).toBe(3); // one grassland beside the zebra
    expect(s.GIRAFFE).toBeUndefined(); // no tree beside the giraffe at (0,1)
    expect(scoreGrid(grid(["GGGG", "G..."])).byType.GRASSLAND).toBe(16);
    expect(scoreGrid(grid(["RT"])).byType.GIRAFFE).toBe(5);
  });

  it("lets cheetahs and lions flip prey that hyenas and vultures then feed on", () => {
    // Cheetah at (0,0) with gazelles on its diagonal at (1,1) and (2,2); a lion by grassland
    // flips the zebra; a hyena and a vulture scavenge the flipped cards.
    const g = grid(["C..V", ".A..", "L.A.", "GZ.H"]);
    const scored = scoreGrid(g);
    const s = scored.byType;
    expect(s.CHEETAH).toBe(6);
    expect(scored.flipped.slice(0, 2).sort()).toEqual(["1_1", "2_2"]);
    expect(s.LION).toBe(4);
    expect(scored.flipped).toHaveLength(3);
    expect(scored.flipped[2]).toBe("3_1"); // the zebra: the gazelles were already down
    // Hyena at (3,3): flipped (2,2) within 2, (1,1) within 2, (3,1) within 2.
    expect(s.HYENA).toBe(9);
    // Vulture at (0,3): no flipped card lower in column 3.
    expect(s.VULTURE).toBeUndefined();
    expect(s.GAZELLE).toBe(4); // still two gazelles for the count
  });

  it("charges elephants for live neighbours and ignores flipped ones", () => {
    const g = grid(["EZ.", "GL."]);
    // The lion flips the zebra (its only prey): the elephant then has no live animal beside it.
    const s = scoreGrid(g).byType;
    expect(s.LION).toBe(4);
    expect(s.ELEPHANT).toBe(6);
    expect(scoreGrid(grid(["EA"])).byType.ELEPHANT).toBe(4);
    expect(scoreGrid(grid(["EE"])).byType.ELEPHANT).toBe(12);
  });

  it("gives the gazelle bonus to the most and second most, ties sharing", () => {
    expect(placings([3, 3, 1], [5, 2])).toEqual([5, 5, 0]);
    expect(placings([3, 2, 0], [5, 2])).toEqual([5, 2, 0]);
  });
});

describe("drafting", () => {
  it("deals eleven, places ten simultaneously, sets the last aside and plays two rounds", () => {
    const state = fresh("a", "b", "c");
    expect(state.public.players.every((p) => p.hand?.length === 11)).toBe(true);
    expect(mayAct(state, "a")).toBe(true);
    expect(playProblem(state, "a", { card: 0, row: 1, col: 0 })).toContain(
      "empty space",
    );
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "b", { card: 2, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "c", { card: 9, row: 0, col: 0 }).ok).toBe(true);
    expect(state.public.pick).toBe(1);
    let guard = 0;
    while (state.public.status === "IN_PROGRESS" && guard++ < 100) {
      const email = state.public.activePlayer;
      const player = state.public.players.find((p) => p.email === email)!;
      if (state.public.pick === 9) expect(player.hand).toHaveLength(2);
      const cell = openCells(player.grid || {})[0];
      const [row, col] = cell.split("_").map(Number);
      expect(choose(state, email, { card: 0, row, col }).ok).toBe(true);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(
      state.public.players.every(
        (p) => Object.keys(p.grid || {}).length === 20 && !p.hand,
      ),
    ).toBe(true);
    expect(state.public.results?.length).toBe(3);
  });

  it("runs a neutral third hand for two players whose gazelles compete", () => {
    setNeutralRandom(() => 0);
    const state = fresh("a", "b");
    expect(state.public.neutral?.hand).toHaveLength(11);
    expect(choose(state, "a", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(choose(state, "b", { card: 0, row: 0, col: 0 }).ok).toBe(true);
    expect(state.public.neutral?.discards).toHaveLength(1);
    state.public.neutral = { discards: ["GAZELLE", "GAZELLE", "GAZELLE"] };
    state.public.players[0].grid = grid(["AA"]);
    state.public.players[1].grid = grid(["A"]);
    const results = scoreAll(state);
    expect(results[0].byType.GAZELLE).toBe(4 + 2); // second most behind the neutral hand
    expect(results[1].byType.GAZELLE).toBe(2);
    setNeutralRandom(Math.random);
  });
});

describe("the bot", () => {
  it("puts a giraffe by a tree and plays whole games at every seat count", () => {
    const state = fresh("Bot #1", "b", "c");
    const me = state.public.players[0];
    me.grid = { "0_0": "TREE" };
    me.hand = ["ZEBRA", "GIRAFFE", "VULTURE"];
    expect(chooseBotMove(state)?.card).toBe(1);
    for (const count of [2, 3, 4, 5, 6]) {
      const game = buildSavannaGameState(
        "l",
        Array.from({ length: count }, (_, i) => ({
          email: `Bot #${i + 1}`,
          ready: true,
          joinedAt: "0",
          isBot: true,
          gameName: "savanna" as const,
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

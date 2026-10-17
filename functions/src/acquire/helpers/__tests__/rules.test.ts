import { describe, expect, it } from "vitest";
import { ALL_TILES, neighbours, priceOf } from "../board";
import {
  analyse,
  bonuses,
  buildAcquireGameState,
  buyStock,
  canDeclare,
  chooseSurvivor,
  declareEnd,
  dispose,
  foundChain,
  placeTile,
} from "../rules";
import { AcquireGameState, Chain } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "acquire" as const,
  }));

const newGame = (...emails: string[]) =>
  buildAcquireGameState("lobby", lobby(...emails), () => 0);

/** A position: board squares by chain, hands, and chain sizes derived from the board. */
function position(
  board: { [tile: string]: Chain | "NONE" },
  hands: { [email: string]: string[] },
  stocks: { [email: string]: { [chain in Chain]?: number } } = {},
): AcquireGameState {
  const state = newGame(...Object.keys(hands));
  state.public.board = { ...board };
  for (const chain of Object.keys(state.public.chains) as Chain[]) {
    state.public.chains[chain].size = Object.values(board).filter(
      (c) => c === chain,
    ).length;
  }
  for (const p of state.public.players) {
    p.tiles = hands[p.email];
    p.stocks = stocks[p.email] || {};
    for (const [chain, n] of Object.entries(p.stocks))
      state.public.chains[chain as Chain].stockLeft -= n;
  }
  state.private.bag = state.private.bag.filter(
    (t) => !board[t] && !Object.values(hands).flat().includes(t),
  );
  state.public.bagCount = state.private.bag.length;
  state.public.phase = "PLACE";
  state.public.activePlayer = "a";
  state.public.turnPlayer = "a";
  return state;
}

describe("board", () => {
  it("has 108 squares, four-way adjacency and the official price table", () => {
    expect(ALL_TILES).toHaveLength(108);
    expect(neighbours("1A").sort()).toEqual(["1B", "2A"]);
    expect(neighbours("6E").sort()).toEqual(["5E", "6D", "6F", "7E"]);
    expect(priceOf("LUXOR", 2)).toBe(200);
    expect(priceOf("TOWER", 5)).toBe(500);
    expect(priceOf("AMERICAN", 6)).toBe(700);
    expect(priceOf("WORLDWIDE", 11)).toBe(800);
    expect(priceOf("CONTINENTAL", 21)).toBe(1000);
    expect(priceOf("IMPERIAL", 41)).toBe(1200);
  });

  it("deals six tiles each and $6,000", () => {
    const state = newGame("a", "b", "c");
    expect(
      state.public.players.every(
        (p) => p.tiles?.length === 6 && p.money === 6000,
      ),
    ).toBe(true);
    expect(state.public.bagCount).toBe(108 - 18);
    expect(state.public.phase).toBe("PLACE");
  });
});

describe("playing tiles", () => {
  it("plays a lone tile, founds a chain with a free share, and extends it", () => {
    const state = position({}, { a: ["5E", "6E", "7E"], b: ["1A"] });
    expect(analyse(state, "5E")).toEqual({ kind: "lone" });
    expect(placeTile(state, "5E").ok).toBe(true);
    expect(state.public.board?.["5E"]).toBe("NONE");
    expect(state.public.phase).toBe("BUY");
    expect(buyStock(state, {}).ok).toBe(true);
    expect(state.public.turnPlayer).toBe("b");
    expect(placeTile(state, "1A").ok).toBe(true);
    buyStock(state, {});
    // a's 6E touches the lone 5E: a founding.
    expect(analyse(state, "6E")).toEqual({ kind: "found" });
    expect(placeTile(state, "6E").ok).toBe(true);
    expect(state.public.phase).toBe("FOUND");
    expect(foundChain(state, "TOWER").ok).toBe(true);
    expect(state.public.chains.TOWER).toEqual({ size: 2, stockLeft: 24 });
    expect(state.public.players[0].stocks?.TOWER).toBe(1);
    expect(state.public.board?.["5E"]).toBe("TOWER");
    expect(state.public.phase).toBe("BUY");
    expect(buyStock(state, { TOWER: 3 }).ok).toBe(true);
    expect(state.public.players[0].money).toBe(6000 - 3 * 200);
    expect(state.public.players[0].tiles).toHaveLength(6);
  });

  it("refuses an eighth chain and a merger of two safe chains, but not a safe takeover", () => {
    const board: { [tile: string]: Chain | "NONE" } = {};
    const chains: Chain[] = [
      "LUXOR",
      "TOWER",
      "AMERICAN",
      "FESTIVAL",
      "WORLDWIDE",
      "CONTINENTAL",
      "IMPERIAL",
    ];
    chains.forEach((chain, i) => {
      const row = "ABCDEFGHI"[i];
      board[`1${row}`] = chain;
      board[`2${row}`] = chain;
    });
    board["12I"] = "NONE";
    const state = position(board, { a: ["11I", "4A"], b: ["3A"] });
    expect(analyse(state, "11I")).toEqual({ kind: "blocked" });
    expect(placeTile(state, "11I").ok).toBe(false);

    // Two safe chains side by side: the tile between them is dead.
    const big: { [tile: string]: Chain | "NONE" } = {};
    for (let c = 1; c <= 11; c++) {
      big[`${c}A`] = "LUXOR";
      big[`${c}C`] = "TOWER";
    }
    const safe = position(big, { a: ["5B"], b: ["1I"] });
    expect(analyse(safe, "5B")).toEqual({ kind: "dead" });
    expect(placeTile(safe, "5B").ok).toBe(false);
  });

  it("merges into the larger chain, pays bonuses and lets holders sell, trade or keep", () => {
    const board: { [tile: string]: Chain | "NONE" } = {
      "1A": "LUXOR",
      "2A": "LUXOR",
      "3A": "LUXOR",
      "4A": "LUXOR",
      "6A": "IMPERIAL",
      "7A": "IMPERIAL",
    };
    const state = position(
      board,
      { a: ["5A"], b: ["9I"], c: ["8I"] },
      {
        a: { IMPERIAL: 3 },
        b: { IMPERIAL: 2, LUXOR: 1 },
        c: { IMPERIAL: 1 },
      },
    );
    // Imperial at 2 tiles is worth 400: majority 4,000 to a, minority 2,000 to b.
    expect(bonuses(state, "IMPERIAL")).toEqual([
      ["a", 4000],
      ["b", 2000],
    ]);
    expect(analyse(state, "5A")).toEqual({
      kind: "merge",
      chains: ["LUXOR", "IMPERIAL"],
      survivors: ["LUXOR"],
    });
    expect(placeTile(state, "5A").ok).toBe(true);
    expect(state.public.phase).toBe("DISPOSE");
    expect(state.public.activePlayer).toBe("a");
    expect(state.public.players[0].money).toBe(10000);
    expect(state.public.players[1].money).toBe(8000);
    // a trades two for one Luxor and sells one at 400.
    expect(dispose(state, "a", 1, 1).ok).toBe(false); // odd trade
    expect(dispose(state, "b", 2, 0).ok).toBe(false); // not b's turn
    expect(dispose(state, "a", 1, 2).ok).toBe(true);
    expect(state.public.players[0].stocks).toEqual({ IMPERIAL: 0, LUXOR: 1 });
    expect(state.public.players[0].money).toBe(10400);
    expect(state.public.activePlayer).toBe("b");
    expect(dispose(state, "b", 0, 0).ok).toBe(true); // keeps both
    expect(state.public.activePlayer).toBe("c");
    expect(dispose(state, "c", 1, 0).ok).toBe(true);
    // Merger complete: Luxor has 4 + 1 + 2 = 7 tiles, Imperial is free again.
    expect(state.public.phase).toBe("BUY");
    expect(state.public.chains.LUXOR.size).toBe(7);
    expect(state.public.chains.IMPERIAL.size).toBe(0);
    expect(state.public.board?.["6A"]).toBe("LUXOR");
    expect(state.public.chains.IMPERIAL.stockLeft).toBe(25 - 2);
    expect(state.public.chains.LUXOR.stockLeft).toBe(25 - 1 - 1);
  });

  it("lets the merging player choose between tied survivors", () => {
    const board: { [tile: string]: Chain | "NONE" } = {
      "1A": "LUXOR",
      "2A": "LUXOR",
      "4A": "FESTIVAL",
      "5A": "FESTIVAL",
    };
    const state = position(
      board,
      { a: ["3A"], b: ["9I"] },
      { a: { FESTIVAL: 2 } },
    );
    expect(placeTile(state, "3A").ok).toBe(true);
    expect(state.public.phase).toBe("SURVIVOR");
    expect(chooseSurvivor(state, "TOWER").ok).toBe(false);
    expect(chooseSurvivor(state, "FESTIVAL").ok).toBe(true);
    // Nobody holds Luxor: straight through to buying.
    expect(state.public.phase).toBe("BUY");
    expect(state.public.chains.FESTIVAL.size).toBe(5);
    expect(state.public.chains.LUXOR.size).toBe(0);
  });
});

describe("the end", () => {
  it("can be called once a chain reaches 41 or all chains are safe, and pays everything out", () => {
    const board: { [tile: string]: Chain | "NONE" } = {};
    for (let c = 1; c <= 11; c++) board[`${c}A`] = "CONTINENTAL";
    const state = position(
      board,
      { a: ["5E"], b: ["9I"] },
      { a: { CONTINENTAL: 2 }, b: { CONTINENTAL: 1 } },
    );
    expect(canDeclare(state)).toBe(true);
    state.public.turnPlayer = "b";
    state.public.activePlayer = "b";
    expect(declareEnd(state).ok).toBe(true);
    // Continental at 11 is worth 900: a gets 9,000 + 2 × 900, b gets 4,500 + 900.
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.players[0].money).toBe(6000 + 9000 + 1800);
    expect(state.public.players[1].money).toBe(6000 + 4500 + 900);
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
  });

  it("cannot be called early", () => {
    const state = position(
      { "1A": "LUXOR", "2A": "LUXOR" },
      { a: ["5E"], b: ["9I"] },
    );
    expect(canDeclare(state)).toBe(false);
    expect(declareEnd(state).ok).toBe(false);
  });
});

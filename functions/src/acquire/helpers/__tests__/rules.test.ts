import { describe, expect, it } from "vitest";
import { ALL_TILES, compareTiles, neighbours, priceOf } from "../board";
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
  setMarketRandom,
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

  it("deals six tiles each and $6,000, with a starting tile apiece", () => {
    const state = newGame("a", "b", "c");
    const starts = Object.entries(state.public.board || {});
    expect(starts).toHaveLength(3);
    expect(starts.every(([, v]) => v === "NONE")).toBe(true);
    const nearest = starts.map(([t]) => t).sort(compareTiles)[0];
    expect(state.private.log?.[0].title).toContain(
      `${state.public.activePlayer} ${nearest}`,
    );
    expect(state.public.mode).toBe("TYCOON");
    expect(newGame("a", "b").public.mode).toBe("CLASSIC");
    expect(
      buildAcquireGameState("l", lobby("a", "b", "c"), () => 0, {
        mode: "CLASSIC",
      }).public.mode,
    ).toBe("CLASSIC");
    expect(
      state.public.players.every(
        (p) => p.tiles?.length === 6 && p.money === 6000,
      ),
    ).toBe(true);
    expect(state.public.bagCount).toBe(108 - 18 - 3);
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
    // Imperial at 2 tiles is worth 400. Tycoon Mode: 4,000 to a, 3,000 to b, 2,000 to c.
    expect(bonuses(state, "IMPERIAL")).toEqual([
      ["a", 4000],
      ["b", 3000],
      ["c", 2000],
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
    expect(state.public.players[1].money).toBe(9000);
    expect(state.public.players[2].money).toBe(8000);
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
      { a: ["5E"], b: ["9I"], c: ["8I"] },
      { a: { CONTINENTAL: 2 }, b: { CONTINENTAL: 1 } },
    );
    expect(canDeclare(state)).toBe(true);
    state.public.turnPlayer = "b";
    state.public.activePlayer = "b";
    expect(declareEnd(state).ok).toBe(true);
    // The caller finishes their turn first.
    expect(state.public.status).toBe("IN_PROGRESS");
    expect(declareEnd(state).ok).toBe(false);
    state.public.phase = "BUY";
    expect(buyStock(state, {}).ok).toBe(true);
    // Continental at 11 is worth 900. Tycoon with two holders: a gets the
    // 9,000 primary + 2 × 900, b the 6,200 secondary + 900, no tertiary.
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.players[0].money).toBe(6000 + 9000 + 1800);
    expect(state.public.players[1].money).toBe(6000 + 6200 + 900);
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

describe("stockholder bonuses by mode", () => {
  const imperial = (
    stocks: { [email: string]: { [chain in Chain]?: number } },
    mode: "CLASSIC" | "TYCOON" = "TYCOON",
  ) => {
    // Imperial with five tiles: $700, so 7,000 / 5,000 / 3,500 as in the rulebook's examples.
    const board: { [tile: string]: Chain | "NONE" } = {};
    for (let c = 6; c <= 10; c++) board[`${c}A`] = "IMPERIAL";
    const hands = Object.fromEntries(
      Object.keys(stocks).map((e) => [e, ["9I"]]),
    );
    const state = position(board, hands, stocks);
    state.public.mode = mode;
    return state;
  };

  it("pays the top three in Tycoon Mode, with the rulebook's tie rules", () => {
    expect(
      bonuses(
        imperial({ a: { IMPERIAL: 3 }, b: { IMPERIAL: 2 }, c: {} }),
        "IMPERIAL",
      ),
    ).toEqual([
      ["a", 7000],
      ["b", 5000],
    ]);
    expect(
      bonuses(
        imperial({
          a: { IMPERIAL: 3 },
          b: { IMPERIAL: 3 },
          c: { IMPERIAL: 1 },
        }),
        "IMPERIAL",
      ),
    ).toEqual([
      ["a", 6000],
      ["b", 6000],
      ["c", 3500],
    ]);
    expect(
      bonuses(
        imperial({
          a: { IMPERIAL: 3 },
          b: { IMPERIAL: 2 },
          c: { IMPERIAL: 2 },
        }),
        "IMPERIAL",
      ),
    ).toEqual([
      ["a", 7000],
      ["b", 4300],
      ["c", 4300],
    ]);
    expect(
      bonuses(
        imperial({
          a: { IMPERIAL: 4 },
          b: { IMPERIAL: 3 },
          c: { IMPERIAL: 1 },
          d: { IMPERIAL: 1 },
        }),
        "IMPERIAL",
      ),
    ).toEqual([
      ["a", 7000],
      ["b", 5000],
      ["c", 1800],
      ["d", 1800],
    ]);
    // A sole holder takes the primary and the tertiary.
    expect(
      bonuses(imperial({ a: { IMPERIAL: 2 }, b: {}, c: {} }), "IMPERIAL"),
    ).toEqual([["a", 10500]]);
  });

  it("pays the top two in Classic Mode", () => {
    expect(
      bonuses(
        imperial(
          { a: { IMPERIAL: 3 }, b: { IMPERIAL: 2 }, c: { IMPERIAL: 1 } },
          "CLASSIC",
        ),
        "IMPERIAL",
      ),
    ).toEqual([
      ["a", 7000],
      ["b", 3500],
    ]);
    expect(
      bonuses(
        imperial(
          { a: { IMPERIAL: 3 }, b: { IMPERIAL: 3 }, c: { IMPERIAL: 1 } },
          "CLASSIC",
        ),
        "IMPERIAL",
      ),
    ).toEqual([
      ["a", 5300],
      ["b", 5300],
    ]);
    expect(
      bonuses(
        imperial(
          { a: { IMPERIAL: 3 }, b: { IMPERIAL: 2 }, c: { IMPERIAL: 2 } },
          "CLASSIC",
        ),
        "IMPERIAL",
      ),
    ).toEqual([
      ["a", 7000],
      ["b", 1800],
      ["c", 1800],
    ]);
    expect(
      bonuses(
        imperial({ a: { IMPERIAL: 2 }, b: {}, c: {} }, "CLASSIC"),
        "IMPERIAL",
      ),
    ).toEqual([["a", 10500]]);
  });

  it("lets the stock market compete in a two-player game", () => {
    const state = imperial(
      { a: { IMPERIAL: 3 }, b: { IMPERIAL: 2 } },
      "CLASSIC",
    );
    expect(newGame("a", "b").public.mode).toBe("CLASSIC");
    setMarketRandom(() => 0);
    state.private.bag = ["9F"];
    // The market holds nine: it takes the primary, which stays in the bank.
    expect(bonuses(state, "IMPERIAL")).toEqual([["a", 3500]]);
    state.private.bag = ["1A"];
    expect(bonuses(state, "IMPERIAL")).toEqual([
      ["a", 7000],
      ["b", 3500],
    ]);
    // Two apiece: b and the market split the secondary, the market's half stays in the bank.
    state.private.bag = ["2B"];
    expect(bonuses(state, "IMPERIAL")).toEqual([
      ["a", 7000],
      ["b", 1800],
    ]);
    state.private.bag = ["3C"];
    // Three apiece: a and the market share the primary and secondary.
    expect(bonuses(state, "IMPERIAL")).toEqual([["a", 5300]]);
    setMarketRandom(Math.random);
  });

  it("pays the founder in cash when a chain's stock is all taken", () => {
    const state = position(
      { "1A": "NONE" },
      { a: ["2A"], b: ["9I"], c: ["8I"] },
    );
    state.public.chains.LUXOR.stockLeft = 0;
    expect(placeTile(state, "2A").ok).toBe(true);
    expect(foundChain(state, "LUXOR").ok).toBe(true);
    expect(state.public.players[0].money).toBe(6000 + 200);
    expect(state.public.players[0].stocks?.LUXOR ?? 0).toBe(0);
  });
});

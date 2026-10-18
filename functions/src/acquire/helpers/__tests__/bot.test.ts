import { describe, expect, it, vi } from "vitest";
import { buildAcquireGameState, STOCK_PER_CHAIN } from "../rules";
import {
  chooseDisposal,
  chooseFounding,
  choosePurchases,
  chooseTile,
  marginalShareValue,
} from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { CHAINS } from "../board";
import { Chain } from "../../types";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "acquire" as const,
  }));

describe("policies", () => {
  it("founds the dearest chain available and buys into chains it can lead", () => {
    const state = buildAcquireGameState(
      "l",
      lobby("Bot #1", "b", "c"),
      () => 0,
    );
    expect(chooseFounding(state)).toBe("CONTINENTAL");
    state.public.chains.CONTINENTAL.size = 3;
    state.public.chains.IMPERIAL.size = 3;
    expect(chooseFounding(state)).toBe("AMERICAN");
    state.public.chains.LUXOR.size = 4;
    state.public.phase = "BUY";
    const purchases = choosePurchases(state, "Bot #1");
    const total = Object.values(purchases).reduce((s, n) => s + (n || 0), 0);
    expect(total).toBe(3);
  });

  it("values a third place in Tycoon Mode and spreads its buying", () => {
    const state = buildAcquireGameState(
      "l",
      lobby("Bot #1", "b", "c", "d"),
      () => 0,
    );
    // Imperial at five tiles ($700): b and c hold it, the bot holds none.
    state.public.board = {};
    for (let c = 1; c <= 5; c++) state.public.board[`${c}A`] = "IMPERIAL";
    state.public.chains.IMPERIAL.size = 5;
    state.public.players[1].stocks = { IMPERIAL: 4 };
    state.public.players[2].stocks = { IMPERIAL: 3 };
    state.public.mode = "TYCOON";
    const tycoon = marginalShareValue(state, "IMPERIAL", "Bot #1");
    state.public.mode = "CLASSIC";
    const classic = marginalShareValue(state, "IMPERIAL", "Bot #1");
    // In Tycoon one share takes the $3,500 tertiary; in Classic it takes nothing.
    expect(tycoon).toBeGreaterThan(classic + 2000);
    state.public.mode = "TYCOON";
    state.public.phase = "BUY";
    state.public.players[0].money = 6000;
    expect(choosePurchases(state, "Bot #1").IMPERIAL).toBeGreaterThanOrEqual(1);
  });

  it("trades swallowed shares when the survivor is worth it, else sells", () => {
    const state = buildAcquireGameState(
      "l",
      lobby("Bot #1", "b", "c"),
      () => 0,
    );
    state.public.board = {};
    for (let c = 1; c <= 8; c++) state.public.board[`${c}A`] = "CONTINENTAL";
    state.public.chains.CONTINENTAL.size = 8;
    state.public.chains.LUXOR.size = 0;
    state.public.players[0].stocks = { LUXOR: 4 };
    state.public.phase = "DISPOSE";
    state.public.activePlayer = "Bot #1";
    state.public.merger = {
      tile: "9A",
      survivor: "CONTINENTAL",
      current: "LUXOR",
      price: 200,
      queue: ["Bot #1"],
    };
    // Continental shares at $800 beat two Luxor shares at $200: trade all four.
    expect(chooseDisposal(state, "Bot #1")).toEqual({ sell: 0, trade: 4 });
    state.public.merger.price = 600;
    state.public.chains.CONTINENTAL.size = 12;
    // A safe survivor at $900 is not worth two $600 shares with no bonus to gain.
    const d = chooseDisposal(state, "Bot #1");
    expect(d.sell + d.trade).toBe(4);
  });

  it("prefers a tile that founds a chain over a quiet one", () => {
    const state = buildAcquireGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.board = { "5E": "NONE" };
    state.public.players[0].tiles = ["6E", "1A", "12I"];
    expect(chooseTile(state)).toBe("6E");
  });

  it("plays four bots to the end with every tile and share accounted for", async () => {
    const state = buildAcquireGameState(
      "l",
      lobby("Bot #1", "Bot #2", "Bot #3", "Bot #4"),
      () => 0.37,
    );
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 3000) {
      await maybeTakeBotTurn(state, { minimumTurnMs: 0 });
      steps++;
      const onBoard = Object.keys(state.public.board || {}).length;
      const inHands = state.public.players.reduce(
        (s, p) => s + (p.tiles || []).length,
        0,
      );
      expect(onBoard + inHands + state.private.bag.length).toBeLessThanOrEqual(
        108,
      );
      for (const chain of CHAINS as Chain[]) {
        const held = state.public.players.reduce(
          (s, p) => s + (p.stocks?.[chain] || 0),
          0,
        );
        expect(held + state.public.chains[chain].stockLeft).toBe(
          STOCK_PER_CHAIN,
        );
      }
      for (const p of state.public.players)
        expect(p.money).toBeGreaterThanOrEqual(0);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.players.some((p) => p.money > 6000)).toBe(true);
  }, 240_000);
});

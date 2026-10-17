import { describe, expect, it, vi } from "vitest";
import { buildForSaleGameState, totalOf } from "../rules";
import {
  applyMove,
  candidateMoves,
  chooseBuyMove,
  chooseSale,
  evaluate,
  propertyValue,
  toAuctionState,
} from "../botSearch";
import { maybeTakeBotTurn } from "../bot";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "for-sale" as const,
  }));

const search = { timeoutMs: 150, depth: 6 };

describe("auction search", () => {
  it("values properties by rank and settles a round by everyone passing", () => {
    expect(propertyValue(1)).toBe(0);
    expect(propertyValue(30)).toBe(15);
    expect(propertyValue(16)).toBe(8);
    const state = buildForSaleGameState(
      "l",
      lobby("Bot #1", "b", "c"),
      () => 0,
    );
    state.public.onOffer = [1, 15, 30];
    const sim = toAuctionState(state);
    expect(candidateMoves(sim).map((m) => m.type)).toEqual([
      "pass",
      "bid",
      "bid",
      "bid",
    ]);
    const after = applyMove(sim, { type: "bid", amount: 4 });
    expect(after.players[0].bid).toBe(4);
    expect(after.active).toBe(1);
    // Settled: b and c pass taking #1 and #15, Bot #1 pays 4 for #30.
    const scores = evaluate(after);
    expect(scores[0]).toBe(18 - 4 + 15);
    expect(scores[1]).toBe(18 + 0);
    expect(scores[2]).toBe(18 + 8);
  });

  it("does not overpay for a cheap set and bids for a rich one", () => {
    const cheap = buildForSaleGameState(
      "l",
      lobby("Bot #1", "b", "c"),
      () => 0,
    );
    cheap.public.onOffer = [1, 2, 3];
    cheap.public.highBid = 4;
    cheap.public.players[1].bid = 4;
    expect(chooseBuyMove(cheap, search).type).toBe("pass");

    const rich = buildForSaleGameState("l", lobby("Bot #1", "b", "c"), () => 0);
    rich.public.onOffer = [1, 2, 30];
    const move = chooseBuyMove(rich, search);
    expect(move.type).toBe("bid");
  });
});

describe("selling heuristic", () => {
  it("plays high for the best cheques and low for the worst", () => {
    const state = buildForSaleGameState(
      "l",
      lobby("Bot #1", "b", "c"),
      () => 0,
    );
    state.public.phase = "SELLING";
    state.public.players[0].properties = [3, 12, 28];
    state.public.players[1].properties = [10, 20];
    state.public.players[2].properties = [5, 25];
    state.public.cheques = [12, 14, 15];
    // Either cashes in: the 28 for the 15, or the 12 for a near-certain 14 while keeping the 28.
    expect([12, 28]).toContain(chooseSale(state, "Bot #1"));
    state.public.cheques = [0, 0, 2];
    expect(chooseSale(state, "Bot #1")).toBe(3);
  });
});

describe("full game", () => {
  it("plays four bots to the end with money and cards accounted for", async () => {
    const state = buildForSaleGameState(
      "l",
      lobby("Bot #1", "Bot #2", "Bot #3", "Bot #4"),
      () => 0.3,
    );
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 400) {
      await maybeTakeBotTurn(state, {
        minimumTurnMs: 0,
        search: { timeoutMs: 30, depth: 4 },
      });
      steps++;
      for (const p of state.public.players)
        expect(p.money).toBeGreaterThanOrEqual(0);
    }
    expect(state.public.status).toBe("GAME_OVER");
    const cheques = state.public.players.flatMap((p) => p.cheques || []);
    expect(cheques).toHaveLength(28);
    expect(
      state.public.players.every((p) => !(p.properties || []).length),
    ).toBe(true);
    expect(state.public.players.some((p) => totalOf(p) > 0)).toBe(true);
  }, 180_000);
});

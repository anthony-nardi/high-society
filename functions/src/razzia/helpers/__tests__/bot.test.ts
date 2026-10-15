import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  shuffle: () => undefined,
  updatePlayerLastAction: (player: { lastActionAt: number }) => {
    player.lastActionAt = Date.now();
  },
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import {
  auctionMoves,
  bestThiefTarget,
  chooseActionMove,
  chooseBotMove,
  evaluate,
  lootValueFor,
  searchAuctionMove,
} from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { initiateAuction, revealCard } from "../rules";
import { gameState, player } from "./fixtures";

const search = { timeoutMs: 300, depth: 8 };

describe("evaluation", () => {
  it("values loot by what it would score", () => {
    const state = gameState([player("a"), player("b"), player("c")], [], {
      revealedCards: ["COINS", "COINS", "DRIVERS"],
    });
    expect(lootValueFor(state, "a")).toBeGreaterThan(6);
    const empty = gameState([player("a"), player("b")], []);
    expect(lootValueFor(empty, "a")).toBe(0);
  });

  it("prefers more money and more points", () => {
    const state = gameState(
      [player("rich", { score: 10 }), player("poor", { score: 0, money: ["2"], availableMoney: ["2"] })],
      []
    );
    const [rich, poor] = evaluate(state);
    expect(rich).toBeGreaterThan(poor);
  });
});

describe("action phase", () => {
  it("reveals when the table is empty", () => {
    const state = gameState([player("bot", { isBot: true }), player("a"), player("b")], ["CARS"]);
    expect(chooseActionMove(state)).toEqual({ type: "reveal" });
  });

  it("calls an auction for a rich table", () => {
    const state = gameState([player("bot", { isBot: true }), player("a"), player("b")], ["CARS"], {
      revealedCards: ["COINS", "COINS", "COINS", "DRIVERS", "CARS", "CARS"],
    });
    expect(chooseActionMove(state)).toEqual({ type: "auction" });
  });

  it("calls an auction when the deck is empty", () => {
    const state = gameState([player("bot", { isBot: true }), player("a")], [], {
      revealedCards: ["COINS"],
    });
    expect(chooseActionMove(state)).toEqual({ type: "auction" });
  });

  it("steals coins with a thief but not a lone car", () => {
    const rich = gameState(
      [player("bot", { isBot: true, cards: { theives: ["THIEF"] } }), player("a")],
      ["CARS"],
      { revealedCards: ["COINS", "CARS"] }
    );
    expect(bestThiefTarget(rich, rich.public.players[0])).toBe("COINS");
    expect(chooseActionMove(rich)).toEqual({ type: "thief", cards: ["COINS"] });

    const poor = gameState(
      [player("bot", { isBot: true, cards: { theives: ["THIEF"] } }), player("a")],
      ["CARS"],
      { revealedCards: ["CARS"] }
    );
    expect(bestThiefTarget(poor, poor.public.players[0])).toBeNull();
  });
});

describe("auction phase", () => {
  it("offers the cheapest bids then a pass", () => {
    const state = gameState([player("a"), player("bot", { isBot: true }), player("c")], [], {
      revealedCards: ["COINS"],
    });
    initiateAuction(state); // bot to move
    expect(auctionMoves(state)).toEqual([
      { type: "bid", amount: "2" },
      { type: "bid", amount: "5" },
      { type: "bid", amount: "8" },
      { type: "pass" },
    ]);
  });

  it("passes on worthless loot and bids on a valuable table", () => {
    const junk = gameState(
      [player("a"), player("bot", { isBot: true }), player("c")],
      [],
      { revealedCards: ["CARS"] }
    );
    initiateAuction(junk);
    expect(searchAuctionMove(junk, search)).toEqual({ type: "pass" });

    const rich = gameState(
      [player("a"), player("bot", { isBot: true }), player("c")],
      [],
      { revealedCards: ["COINS", "COINS", "COINS", "DRIVERS", "CARS", "CARS", "SCARAB"] }
    );
    initiateAuction(rich);
    const move = searchAuctionMove(rich, search);
    expect(move.type).toBe("bid");
  });

  it("bids as the caller when forced to", () => {
    const state = gameState(
      [player("bot", { isBot: true }), player("a", { availableMoney: [] }), player("b", { availableMoney: [] })],
      [],
      { revealedCards: ["CARS"] }
    );
    initiateAuction(state);
    expect(state.public.activePlayer).toBe("bot");
    const move = chooseBotMove(state, search);
    expect(move.type).toBe("bid");
  });
});

describe("maybeTakeBotTurn", () => {
  it("does nothing for a human", async () => {
    const state = gameState([player("a"), player("b")], ["CARS"]);
    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });
    expect(state.private.deck).toHaveLength(1);
  });

  it("plays a full forced auction between bots", async () => {
    const state = gameState(
      [
        player("human"),
        player("bot1", { isBot: true }),
        player("bot2", { isBot: true }),
      ],
      ["POLICE_RAIDS", "CARS"],
      { revealedCards: ["COINS", "COINS"] }
    );
    revealCard(state); // human draws a raid: forced auction, bot1 to move
    expect(state.public.roundState).toBe("FORCED_AUCTION");
    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });
    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });
    // Back to the human, who called it.
    expect(state.public.activePlayer).toBe("human");
    expect(state.private.log?.length).toBeGreaterThan(2);
  });
});

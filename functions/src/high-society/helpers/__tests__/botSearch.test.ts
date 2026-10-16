import { describe, expect, it, vi } from "vitest";

// shared/helpers imports this module back (to create games), so the mock is
// written out in full rather than spreading the original to avoid the cycle.
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
  applyMove,
  candidateMoves,
  chooseBotMove,
  evaluate,
  highestBid,
  MAX_BID_CANDIDATES,
  toAuctionState,
} from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { getBidValue, getHighestCurrentBid } from "..";
import { gameState, player, STARTING_MONEY } from "./fixtures";

const sum = (cards: string[]) => cards.reduce((t, c) => t + Number(c), 0);

const search = { timeoutMs: 300, depth: 8 };

describe("auction simulation", () => {
  it("converts the stored game state into search state", () => {
    const state = toAuctionState(
      gameState(
        [
          player("alice", { currentBid: ["10"] }),
          player("bot", { isBot: true, statusCards: ["2x"] }),
        ],
        ["7", "8", "2x"],
        { activePlayer: "bot" },
      ),
    );

    expect(state.activePlayer).toBe(1);
    expect(state.card).toBe("7");
    expect(state.players[0].bid).toEqual(["10"]);
    expect(state.players[1].status).toEqual(["2x"]);
    expect(state.resolved).toBe(false);
    expect(highestBid(state)).toBe(10);
  });

  it("moves bid cards out of the hand and passes the turn", () => {
    const state = toAuctionState(
      gameState([player("alice"), player("bob")], ["7", "8"]),
    );

    const next = applyMove(state, ["12", "3"]);

    expect(next.players[0].bid).toEqual(["12", "3"]);
    expect(next.players[0].money).not.toContain("12");
    expect(next.activePlayer).toBe(1);
    expect(next.resolved).toBe(false);
    // The original state is untouched.
    expect(state.players[0].money).toEqual(STARTING_MONEY);
  });

  it("awards the card to the last bidder and spends their bid", () => {
    const state = toAuctionState(
      gameState(
        [
          player("alice", { currentBid: ["10"], moneyCards: ["1", "25"] }),
          player("bob"),
        ],
        ["7", "8"],
        { activePlayer: "bob" },
      ),
    );

    const next = applyMove(state, "pass");

    expect(next.resolved).toBe(true);
    expect(next.players[0].status).toEqual(["7"]);
    expect(next.players[0].bid).toEqual([]);
    expect(next.players[0].money).toEqual(["1", "25"]);
    expect(next.players[1].passed).toBe(true);
  });

  it("gives a misfortune card to the first to pass and burns other bids", () => {
    const state = toAuctionState(
      gameState(
        [
          player("alice", { currentBid: ["10"], moneyCards: ["1"] }),
          player("bob", { currentBid: ["12"], moneyCards: ["2"] }),
        ],
        ["-5", "8"],
        { activePlayer: "bob" },
      ),
    );

    const next = applyMove(state, "pass");

    expect(next.resolved).toBe(true);
    expect(next.players[1].status).toEqual(["-5"]);
    expect(next.players[1].money.sort()).toEqual(["12", "2"]);
    expect(next.players[0].money).toEqual(["1"]);
    expect(next.players[0].bid).toEqual([]);
  });

  it("lets the thief remove the lowest luxury card", () => {
    const state = toAuctionState(
      gameState([player("alice", { statusCards: ["9", "3"] })], ["-", "8"]),
    );

    const next = applyMove(state, "pass");

    expect(next.players[0].status).toEqual(["9"]);
  });
});

describe("candidate moves", () => {
  it("always offers a pass and only bids that beat the table", () => {
    const state = toAuctionState(
      gameState(
        [player("alice", { currentBid: ["20"] }), player("bob")],
        ["7", "8"],
        { activePlayer: "bob" },
      ),
    );

    const moves = candidateMoves(state);

    // Bids come first (smallest raise first) so a tie with passing is
    // resolved in favour of staying in the auction.
    expect(moves[moves.length - 1]).toBe("pass");
    const bids = moves.slice(0, -1) as string[][];
    expect(bids.length).toBeGreaterThan(0);
    expect(bids.length).toBeLessThanOrEqual(MAX_BID_CANDIDATES);
    for (const bid of bids) {
      expect(sum(bid)).toBeGreaterThan(20);
      for (const card of bid) expect(STARTING_MONEY).toContain(card);
    }
    // Offered totals are distinct, ascending, starting with the cheapest raise.
    const totals = bids.map(sum);
    expect(new Set(totals).size).toBe(totals.length);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    expect(totals[0]).toBe(21);
  });

  it("only passes when the hand is empty", () => {
    const state = toAuctionState(
      gameState([player("alice", { moneyCards: [] }), player("bob")], ["7"]),
    );

    expect(candidateMoves(state)).toEqual(["pass"]);
  });
});

describe("evaluation", () => {
  it("scores every player and prefers luxury over misfortune", () => {
    const state = toAuctionState(
      gameState(
        [
          player("rich", { statusCards: ["10", "2x"] }),
          player("poor", { statusCards: ["-5", "1/2"] }),
        ],
        ["7"],
      ),
    );
    state.resolved = true;

    const scores = evaluate(state);

    expect(scores).toHaveLength(2);
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });

  it("penalises being the player with the least money", () => {
    const state = toAuctionState(
      gameState(
        [
          player("broke", { moneyCards: ["1"] }),
          player("flush", { moneyCards: ["1", "2"] }),
        ],
        ["7"],
      ),
    );
    state.resolved = true;

    const [broke, flush] = evaluate(state);

    expect(flush).toBeGreaterThan(broke);
  });
});

describe("chooseBotMove", () => {
  it("bids on a valuable card when nobody has bid yet", () => {
    const state = gameState(
      [player("bot", { isBot: true }), player("alice"), player("bob")],
      ["10", "2x", "3", "1/2", "2x", "2x"],
    );

    const move = chooseBotMove(state, search);

    expect(move).not.toBe("pass");
    expect(getBidValue(move as string[])).toBeGreaterThan(0);
    for (const card of move as string[]) {
      expect(STARTING_MONEY).toContain(card);
    }
  });

  it("passes rather than overpay for a low card", () => {
    const state = gameState(
      [player("alice", { currentBid: ["20"] }), player("bot", { isBot: true })],
      ["1", "2x", "3", "1/2", "2x", "2x"],
      { activePlayer: "bot" },
    );

    expect(chooseBotMove(state, search)).toBe("pass");
  });

  it("never proposes a bid below the highest bid", () => {
    const state = gameState(
      [
        player("alice", { currentBid: ["25", "20"] }),
        player("bot", { isBot: true }),
      ],
      ["10", "2x", "3", "1/2", "2x", "2x"],
      { activePlayer: "bot" },
    );

    const move = chooseBotMove(state, search);

    if (move !== "pass") {
      expect(getBidValue(move)).toBeGreaterThan(getHighestCurrentBid(state));
    }
  });
});

describe("maybeTakeBotTurn", () => {
  it("does nothing for a human player", async () => {
    const state = gameState([player("alice"), player("bob")], ["10", "2x"]);

    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });

    expect(state.public.activePlayer).toBe("alice");
    expect(state.public.players[0].moneyCards).toEqual(STARTING_MONEY);
  });

  it("applies the searched move to the game state", async () => {
    const state = gameState(
      [player("bot", { isBot: true }), player("alice"), player("bob")],
      ["10", "2x", "3", "1/2", "2x", "2x"],
    );

    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });

    const bot = state.public.players[0];
    expect(bot.currentBid?.length).toBeGreaterThan(0);
    expect(bot.moneyCards.length + (bot.currentBid?.length ?? 0)).toBe(
      STARTING_MONEY.length,
    );
    expect(state.public.activePlayer).toBe("alice");
    expect(state.public.notification?.title).toContain("bot has highest bid");
  });

  it("passes when it holds no money", async () => {
    const state = gameState(
      [
        player("alice", { currentBid: ["10"] }),
        player("bot", { isBot: true, moneyCards: [] }),
      ],
      ["10", "2x", "3", "1/2", "2x", "2x"],
      { activePlayer: "bot" },
    );

    await maybeTakeBotTurn(state, { minimumTurnMs: 0, search });

    // Alice was the only bidder left, so she wins the card.
    expect(state.public.players[0].statusCards).toEqual(["10"]);
    expect(state.public.currentStatusCard).toBe("2x");
  });
});

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

import { updateGameState } from "../../../shared/helpers";
import {
  awardPlayerWithCurrentStatusCard,
  getBidValue,
  getDoesBiddingRoundEndOnFirstPass,
  getHighestCurrentBid,
  getNextPlayerIndex,
  getPlayersActivelyBidding,
  isGameOver,
  maybeUseMinusCard,
  returnPlayersBidToHand,
  revealNewStatusCard,
  updateGameStateWithBid,
  updateGameStateWithPass,
  updatePlayersBid,
} from "..";
import { gameState, player, STARTING_MONEY } from "./fixtures";

describe("bids", () => {
  it("values a bid as the sum of its money cards", () => {
    expect(getBidValue([])).toBe(0);
    expect(getBidValue(["10", "15"])).toBe(25);
  });

  it("moves money cards from the hand into the current bid", () => {
    const alice = player("alice");
    updatePlayersBid(alice, ["10", "2"]);
    updatePlayersBid(alice, ["1"]);

    expect(alice.currentBid).toEqual(["10", "2", "1"]);
    expect(alice.moneyCards).toEqual(
      STARTING_MONEY.filter((c) => !["10", "2", "1"].includes(c))
    );
  });

  it("returns a bid to the hand", () => {
    const alice = player("alice", {
      moneyCards: ["1"],
      currentBid: ["10", "2"],
    });
    returnPlayersBidToHand(alice);

    expect(alice.moneyCards).toEqual(["1", "10", "2"]);
    expect(alice.currentBid).toEqual([]);
  });

  it("finds the highest bid on the table", () => {
    const state = gameState(
      [
        player("alice", { currentBid: ["10"] }),
        player("bob", { currentBid: ["12", "3"] }),
        player("carol", { currentBid: undefined }),
      ],
      ["5"]
    );
    expect(getHighestCurrentBid(state)).toBe(15);
  });
});

describe("turn order", () => {
  it("skips players who have passed and wraps around", () => {
    const state = gameState(
      [
        player("alice"),
        player("bob", { hasPassed: true }),
        player("carol", { hasPassed: true }),
        player("dave"),
      ],
      ["5"],
      { activePlayer: "alice" }
    );
    expect(getNextPlayerIndex(state)).toBe(3);

    state.public.activePlayer = "dave";
    expect(getNextPlayerIndex(state)).toBe(0);
  });

  it("counts players still in the auction", () => {
    const state = gameState(
      [player("alice"), player("bob", { hasPassed: true }), player("carol")],
      ["5"]
    );
    expect(getPlayersActivelyBidding(state)).toBe(2);
  });
});

describe("status cards", () => {
  it("knows which cards end the round on the first pass", () => {
    const endsOnPass = (card: string) =>
      getDoesBiddingRoundEndOnFirstPass(gameState([player("a")], [card]));

    expect(endsOnPass("-5")).toBe(true);
    expect(endsOnPass("1/2")).toBe(true);
    expect(endsOnPass("-")).toBe(true);
    expect(endsOnPass("2x")).toBe(false);
    expect(endsOnPass("7")).toBe(false);
  });

  it("reveals the next card and tracks what is left", () => {
    const state = gameState([player("a")], ["7", "2x", "3"]);
    revealNewStatusCard(state);

    expect(state.public.currentStatusCard).toBe("2x");
    expect(state.public.remainingCards).toBe(2);
    expect(state.private.deck).toEqual(["2x", "3"]);
  });

  it("the game ends when the fourth green card is revealed", () => {
    // Three greens already gone, one left and it is face up.
    expect(isGameOver(gameState([player("a")], ["1/2", "7", "3"]))).toBe(true);
    // Two greens left in the deck.
    expect(isGameOver(gameState([player("a")], ["2x", "1/2", "7"]))).toBe(false);
    // One green left but a luxury card is face up.
    expect(isGameOver(gameState([player("a")], ["7", "2x"]))).toBe(false);
  });

  it("awarding a luxury card to a thief victim removes the thief card instead", () => {
    const alice = player("alice", { statusCards: ["-"], currentBid: ["10"] });
    awardPlayerWithCurrentStatusCard(alice, gameState([alice], ["7"]));

    expect(alice.statusCards).toEqual([]);
    expect(alice.currentBid).toEqual([]);
  });

  it("awarding any other card adds it to the player's status cards", () => {
    const alice = player("alice", { statusCards: ["3"], currentBid: ["10"] });
    awardPlayerWithCurrentStatusCard(alice, gameState([alice], ["2x"]));

    expect(alice.statusCards).toEqual(["3", "2x"]);
  });

  it("the thief takes the player's lowest luxury card", () => {
    const alice = player("alice", { statusCards: ["9", "3", "7", "-"] });
    maybeUseMinusCard(alice, gameState([alice], ["-"]));

    expect(alice.statusCards).toEqual(["9", "7"]);
  });

  it("the thief stays if the player has no luxury cards yet", () => {
    const alice = player("alice", { statusCards: ["2x", "-"] });
    maybeUseMinusCard(alice, gameState([alice], ["-"]));

    expect(alice.statusCards).toEqual(["2x", "-"]);
  });
});

describe("updateGameStateWithBid", () => {
  it("records the bid, passes the turn and persists", async () => {
    const alice = player("alice");
    const bob = player("bob");
    const state = gameState([alice, bob], ["7", "3"]);

    await updateGameStateWithBid(state, alice, ["10"]);

    expect(alice.currentBid).toEqual(["10"]);
    expect(alice.moneyCards).not.toContain("10");
    expect(state.public.activePlayer).toBe("bob");
    expect(state.public.notification?.title).toBe(
      "alice has highest bid of 10."
    );
    expect(updateGameState).toHaveBeenCalledWith(state, "Player alice bid 10");
  });
});

describe("updateGameStateWithPass", () => {
  it("on a misfortune card the first to pass takes it and keeps their money", async () => {
    const alice = player("alice", { currentBid: ["10"], moneyCards: ["1"] });
    const bob = player("bob", { currentBid: ["12"], moneyCards: ["1"] });
    const state = gameState([alice, bob], ["-5", "7"]);

    await updateGameStateWithPass(state, alice);

    expect(alice.statusCards).toEqual(["-5"]);
    expect(alice.moneyCards).toEqual(["1", "10"]);
    expect(alice.currentBid).toEqual([]);
    expect(bob.currentBid).toEqual([]);
    expect(bob.moneyCards).toEqual(["1"]); // bob's bid is spent
    expect(state.public.currentStatusCard).toBe("7");
    expect(state.public.activePlayer).toBe("alice");
    expect(state.public.status).toBe("IN_PROGRESS");
  });

  it("on a luxury card, passing returns your bid and moves to the next bidder", async () => {
    const alice = player("alice", { currentBid: ["10"], moneyCards: ["1"] });
    const bob = player("bob", { currentBid: ["12"], moneyCards: ["1"] });
    const carol = player("carol");
    const state = gameState([alice, bob, carol], ["7", "3"]);

    await updateGameStateWithPass(state, alice);

    expect(alice.hasPassed).toBe(true);
    expect(alice.moneyCards).toEqual(["1", "10"]);
    expect(state.public.activePlayer).toBe("bob");
    expect(state.public.currentStatusCard).toBe("7");
  });

  it("when only one bidder remains they win the card and start the next round", async () => {
    const alice = player("alice", { currentBid: ["10"], moneyCards: ["1"] });
    const bob = player("bob", { currentBid: ["12", "3"], moneyCards: ["1"] });
    const carol = player("carol", { hasPassed: true });
    const state = gameState([alice, bob, carol], ["7", "3"]);

    await updateGameStateWithPass(state, alice);

    expect(bob.statusCards).toEqual(["7"]);
    expect(bob.currentBid).toEqual([]);
    expect(bob.moneyCards).toEqual(["1"]);
    expect(alice.moneyCards).toEqual(["1", "10"]);
    expect(state.public.players.every((p) => p.hasPassed === false)).toBe(
      true
    );
    expect(state.public.activePlayer).toBe("bob");
    expect(state.public.currentStatusCard).toBe("3");
    expect(state.public.notification?.title).toBe(
      "bob won 7 for a total of 15."
    );
  });

  it("marks the game over when the final green card is revealed", async () => {
    const alice = player("alice", { currentBid: ["10"] });
    const bob = player("bob", { currentBid: ["12"] });
    const state = gameState([alice, bob], ["7", "1/2"]);

    await updateGameStateWithPass(state, alice);

    expect(state.public.currentStatusCard).toBe("1/2");
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.notification?.message).toBe(
      "1/2 was revealed. Game over."
    );
  });
});

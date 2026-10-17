import { describe, expect, it } from "vitest";
import {
  bid,
  buildForSaleGameState,
  CHEQUE_VALUES,
  pass,
  sell,
  totalOf,
} from "../rules";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "for-sale" as const,
  }));

/** Deterministic deal: no shuffling, a starts. */
const newGame = (...emails: string[]) =>
  buildForSaleGameState("lobby", lobby(...emails), () => 0);

describe("setup", () => {
  it("deals by player count: money, cards removed, first set on offer", () => {
    const three = newGame("a", "b", "c");
    expect(three.public.players.map((p) => p.money)).toEqual([18, 18, 18]);
    expect(three.private.propertyDeck.length + 3).toBe(24);
    expect(three.private.chequeDeck.length).toBe(24);
    expect(three.public.onOffer).toHaveLength(3);
    expect(three.public.round).toBe(1);
    expect(three.public.phase).toBe("BUYING");

    const five = newGame("a", "b", "c", "d", "e");
    expect(five.public.players.map((p) => p.money)).toEqual([
      14, 14, 14, 14, 14,
    ]);
    expect(five.private.propertyDeck.length + 5).toBe(30);
    expect(CHEQUE_VALUES).toHaveLength(30);
    expect(CHEQUE_VALUES.filter((c) => c === 0)).toHaveLength(2);
    expect(CHEQUE_VALUES.filter((c) => c === 15)).toHaveLength(2);
  });
});

describe("buying", () => {
  it("raises in thousands, passes for the cheapest property at half the bid rounded up, last bidder pays in full", () => {
    const state = newGame("a", "b", "c");
    state.public.onOffer = [4, 17, 25];
    expect(bid(state, 0).ok).toBe(false);
    expect(bid(state, 19).ok).toBe(false); // more than 18
    expect(bid(state, 2).ok).toBe(true);
    expect(state.public.activePlayer).toBe("b");
    expect(bid(state, 2).ok).toBe(false); // must beat 2
    expect(bid(state, 3).ok).toBe(true);
    // c passes without a bid: takes #4 for nothing.
    expect(pass(state).ok).toBe(true);
    expect(state.public.players[2].properties).toEqual([4]);
    expect(state.public.players[2].money).toBe(18);
    expect(state.public.activePlayer).toBe("a");
    // a raises to 5, b passes: takes #17 for half of 3 rounded up = 2.
    expect(bid(state, 5).ok).toBe(true);
    expect(pass(state).ok).toBe(true);
    expect(state.public.players[1].properties).toEqual([17]);
    expect(state.public.players[1].money).toBe(16);
    // a is last in: takes #25 for the full 5 and opens the next round.
    expect(state.public.players[0].properties).toEqual([25]);
    expect(state.public.players[0].money).toBe(13);
    expect(state.public.round).toBe(2);
    expect(state.public.onOffer).toHaveLength(3);
    expect(state.public.highBid).toBe(0);
    expect(state.public.activePlayer).toBe("a");
    expect(state.public.starting).toBe("a");
  });

  it("moves on to selling once the properties run out", () => {
    const state = newGame("a", "b", "c");
    state.private.propertyDeck = [];
    state.public.onOffer = [1, 2, 3];
    pass(state);
    pass(state);
    expect(state.public.phase).toBe("SELLING");
    expect(state.public.cheques).toHaveLength(3);
    expect(state.public.round).toBe(1);
    expect(state.public.onOffer).toBeUndefined();
    expect(bid(state, 1).ok).toBe(false);
  });
});

describe("selling", () => {
  function selling() {
    const state = newGame("a", "b", "c");
    state.public.phase = "SELLING";
    state.public.players[0].properties = [30, 2];
    state.public.players[1].properties = [20, 11];
    state.public.players[2].properties = [9, 1];
    state.private.chequeDeck = [15, 0, 8, 3, 3, 12];
    state.public.cheques = state.private.chequeDeck
      .splice(0, 3)
      .sort((a, b) => a - b);
    state.public.round = 1;
    state.public.activePlayer = "a";
    return state;
  }

  it("matches properties to cheques by rank once everyone has chosen", () => {
    const state = selling();
    expect(state.public.cheques).toEqual([0, 8, 15]);
    expect(sell(state, "a", 7).ok).toBe(false); // not owned
    expect(sell(state, "a", 2).ok).toBe(true);
    expect(sell(state, "a", 30).ok).toBe(false); // already chosen
    expect(state.public.chosen).toEqual(["a"]);
    expect(state.public.cheques).toEqual([0, 8, 15]);
    expect(sell(state, "c", 9).ok).toBe(true);
    expect(sell(state, "b", 20).ok).toBe(true);
    // b's 20 beats c's 9 beats a's 2.
    expect(state.public.players[1].cheques).toEqual([15]);
    expect(state.public.players[2].cheques).toEqual([8]);
    expect(state.public.players[0].cheques).toEqual([0]);
    expect(state.public.players[0].properties).toEqual([30]);
    expect(state.public.lastSale).toEqual([
      { email: "b", property: 20, cheque: 15 },
      { email: "c", property: 9, cheque: 8 },
      { email: "a", property: 2, cheque: 0 },
    ]);
    expect(state.public.round).toBe(2);
    expect(state.public.cheques).toEqual([3, 3, 12]);
    expect(state.public.chosen).toBeUndefined();
  });

  it("ends after the last cheques, the richest winning and cash breaking ties", () => {
    const state = selling();
    state.private.chequeDeck = [];
    state.public.players[0].money = 10;
    state.public.players[1].money = 10;
    state.public.players[2].money = 18;
    sell(state, "a", 30);
    sell(state, "b", 20);
    sell(state, "c", 9);
    expect(state.public.status).toBe("GAME_OVER");
    // a: 10 + 15 = 25; b: 10 + 8 = 18; c: 18 + 0 = 18.
    expect(totalOf(state.public.players[0])).toBe(25);
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
  });
});

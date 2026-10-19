import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { MediciGameState } from "../../types";
import {
  bid,
  buildMediciGameState,
  computeDayScoring,
  drawCard,
  maxFit,
  offerLot,
  pass,
} from "../rules";
import {
  cardsPerDay,
  fullDeck,
  rankPrizes,
  shipPayouts,
  trackPayouts,
} from "../board";
import { chooseBotMove, lotValue, turnMoves } from "../botSearch";
import { takeBotTurn } from "../bot";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "medici",
  }));

/** A game whose first player is the first seat and whose deck is in a known order. */
function fresh(deck: string[], ...emails: string[]) {
  const state = buildMediciGameState("l", lobby(...emails), () => 0);
  state.private.deck = [...deck];
  state.public.deckCount = deck.length;
  return state;
}

function player(state: MediciGameState, email: string) {
  return state.public.players.find((p) => p.email === email)!;
}

describe("the deck, the money and the tables", () => {
  it("has 36 cards and deals the right number each day", () => {
    expect(fullDeck()).toHaveLength(36);
    expect(fullDeck().filter((c) => c.startsWith("CLOTH"))).toHaveLength(7);
    expect(cardsPerDay(2)).toBe(18);
    expect(cardsPerDay(3)).toBe(18);
    expect(cardsPerDay(4)).toBe(24);
    expect(cardsPerDay(6)).toBe(36);
    const s3 = buildMediciGameState("l", lobby("a", "b", "c"));
    expect(s3.public.deckCount).toBe(18);
    expect(s3.private.removed).toHaveLength(18);
    expect(s3.public.capacity).toBe(5);
    expect(s3.public.players[0].money).toBe(40);
    const s2 = buildMediciGameState("l", lobby("a", "b"));
    expect(s2.public.capacity).toBe(7);
    const s5 = buildMediciGameState("l", lobby("a", "b", "c", "d", "e"));
    expect(s5.public.players[0].money).toBe(30);
    expect(s5.private.removed).toHaveLength(6);
  });

  it("shares tied prizes rounded down, as the rulebook's examples do", () => {
    // Example 1: 23, 20, 16, 16, 14 with five players.
    expect(
      shipPayouts([
        { email: "Jenna", value: 23 },
        { email: "Jacob", value: 20 },
        { email: "Lisa", value: 16 },
        { email: "David", value: 16 },
        { email: "Lily", value: 14 },
      ]),
    ).toEqual({ Jenna: 30, Jacob: 20, Lisa: 7, David: 7, Lily: 0 });
    // Example 2: three tied for second share the 5 for 1 each.
    expect(
      trackPayouts([
        { email: "red", level: 5 },
        { email: "blue", level: 3 },
        { email: "yellow", level: 3 },
        { email: "white", level: 3 },
        { email: "black", level: 0 },
      ]),
    ).toEqual({ red: 10, blue: 1, yellow: 1, white: 1, black: 0 });
    // Players on the gold frame can still share second.
    expect(
      trackPayouts([
        { email: "a", level: 2 },
        { email: "b", level: 0 },
        { email: "c", level: 0 },
      ]),
    ).toEqual({ a: 10, b: 2, c: 2 });
    // Two players: no second award.
    expect(
      trackPayouts([
        { email: "a", level: 0 },
        { email: "b", level: 0 },
      ]),
    ).toEqual({ a: 5, b: 5 });
    expect(rankPrizes([{ email: "a", score: 1 }], [30, 15])).toEqual({ a: 30 });
  });
});

describe("making up and auctioning a lot", () => {
  it("lets the auctioneer draw up to three, then bids once round ending with them", () => {
    const state = fresh(
      ["CLOTH_5", "FUR_2", "GOLD_10", "DYE_0", "SPICE_3", "GRAIN_4"],
      "a",
      "b",
      "c",
    );
    expect(state.public.auctioneer).toBe("a");
    expect(offerLot(state).ok).toBe(false);
    expect(drawCard(state).ok).toBe(true);
    expect(state.public.lot).toEqual(["CLOTH_5"]);
    expect(state.public.phase).toBe("DRAW");
    expect(drawCard(state).ok).toBe(true);
    expect(drawCard(state).ok).toBe(true);
    // Three cards: bidding starts on a's left.
    expect(state.public.phase).toBe("BID");
    expect(state.public.activePlayer).toBe("b");
    expect(drawCard(state).ok).toBe(false);
    expect(bid(state, 0).ok).toBe(false);
    expect(bid(state, 41).ok).toBe(false);
    expect(bid(state, 7).ok).toBe(true);
    expect(state.public.activePlayer).toBe("c");
    expect(bid(state, 7).ok).toBe(false);
    expect(pass(state).ok).toBe(true);
    expect(state.public.activePlayer).toBe("a");
    expect(bid(state, 8).ok).toBe(true);
    // The auctioneer bid last and wins; the first player card moves on.
    expect(player(state, "a").money).toBe(32);
    expect(player(state, "a").ship).toEqual(["CLOTH_5", "FUR_2", "GOLD_10"]);
    expect(state.public.lastAuction).toMatchObject({
      email: "a",
      amount: 8,
      auctioneer: "a",
    });
    expect(state.public.phase).toBe("DRAW");
    expect(state.public.auctioneer).toBe("b");
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.turn).toBe(1);
    expect(player(state, "b").bid).toBeUndefined();
  });

  it("discards a lot nobody bids on and skips those who cannot fit or afford it", () => {
    const state = fresh(
      ["CLOTH_5", "FUR_2", "GOLD_10", "DYE_0", "SPICE_3", "GRAIN_4"],
      "a",
      "b",
      "c",
    );
    player(state, "b").ship = ["DYE_1", "DYE_2", "DYE_3", "DYE_4"];
    player(state, "c").money = 0;
    drawCard(state);
    drawCard(state);
    // b has one free slot, c has no money: only a could bid.
    expect(maxFit(state)).toBe(5);
    offerLot(state);
    expect(state.public.phase).toBe("BID");
    expect(state.public.activePlayer).toBe("a");
    expect(player(state, "b").passed).toBe(true);
    expect(player(state, "c").passed).toBe(true);
    expect(pass(state).ok).toBe(true);
    expect(state.public.lastAuction?.email).toBeUndefined();
    expect(state.private.discard).toEqual(["CLOTH_5", "FUR_2"]);
    expect(state.public.auctioneer).toBe("b");
  });

  it("stops drawing when no hold could take a bigger lot", () => {
    const state = fresh(
      ["CLOTH_5", "FUR_2", "GOLD_10", "DYE_0"],
      "a",
      "b",
      "c",
    );
    player(state, "a").ship = ["DYE_1", "DYE_2", "DYE_3", "DYE_4"];
    player(state, "b").ship = ["DYE_1", "DYE_2", "DYE_3", "DYE_4"];
    player(state, "c").ship = ["DYE_1", "DYE_2", "DYE_3", "DYE_4"];
    expect(maxFit(state)).toBe(1);
    drawCard(state);
    expect(state.public.phase).toBe("BID");
    expect(state.public.lot).toEqual(["CLOTH_5"]);
  });
});

describe("the day's end", () => {
  it("fills the last ship afloat for nothing, pays out and starts the next day with the poorest", () => {
    const state = fresh(
      ["CLOTH_5", "FUR_2", "GOLD_10", "DYE_0", "SPICE_3", "GRAIN_4", "GRAIN_1"],
      "a",
      "b",
      "c",
    );
    player(state, "a").ship = ["CLOTH_1", "CLOTH_2", "CLOTH_3", "CLOTH_4"];
    player(state, "b").ship = ["SPICE_1", "SPICE_2", "SPICE_4", "SPICE_5"];
    player(state, "c").ship = ["FUR_1", "FUR_3"];
    drawCard(state);
    offerLot(state);
    expect(state.public.activePlayer).toBe("b");
    bid(state, 3);
    pass(state); // c
    pass(state); // a, the auctioneer
    // b's ship is full at 17; a and c are still afloat, so the day goes on
    // and the first player card skips b.
    expect(player(state, "b").ship).toHaveLength(5);
    expect(player(state, "c").ship).toHaveLength(2);
    expect(state.public.day).toBe(1);
    expect(state.public.auctioneer).toBe("c");
    drawCard(state); // FUR_2
    offerLot(state);
    expect(state.public.activePlayer).toBe("a");
    bid(state, 2);
    pass(state); // c
    // a is full now with FUR_2; only c is afloat and fills GOLD_10, DYE_0,
    // SPICE_3 for nothing, which ends the day.
    const scoring = state.public.dayScoring!;
    expect(scoring.ships.find((s) => s.email === "a")?.cards).toHaveLength(5);
    expect(scoring.ships.find((s) => s.email === "c")?.cards).toEqual([
      "FUR_1",
      "FUR_3",
      "GOLD_10",
      "DYE_0",
      "SPICE_3",
    ]);
    expect(scoring.day).toBe(1);
    expect(scoring.freeFill).toEqual({
      email: "c",
      cards: ["GOLD_10", "DYE_0", "SPICE_3"],
    });
    // Ships: b 17, c 17, a 12 → b and c share 30+15 = 22 each, a 0.
    expect(scoring.ships.map((s) => [s.email, s.value, s.pay])).toEqual([
      ["b", 17, 22],
      ["c", 17, 22],
      ["a", 12, 0],
    ]);
    // Cloth: a 4 → 10, b 1 → 5, c 0. Spice: b 4 → 10, c 1 → 5. Fur: c 2 → 10, a 1 → 5.
    const cloth = scoring.tracks.find((t) => t.commodity === "CLOTH")!;
    expect(cloth.rows.map((r) => [r.email, r.level, r.award, r.bonus])).toEqual(
      [
        ["a", 4, 10, 0],
        ["b", 1, 5, 0],
        ["c", 0, 0, 0],
      ],
    );
    const spice = scoring.tracks.find((t) => t.commodity === "SPICE")!;
    expect(spice.rows.find((r) => r.email === "b")).toMatchObject({
      level: 4,
      award: 10,
    });
    expect(spice.rows.find((r) => r.email === "c")).toMatchObject({
      level: 1,
      award: 5,
    });
    // Day 2 has begun: ships empty, tracks kept, the poorest opens.
    expect(state.public.day).toBe(2);
    expect(state.public.phase).toBe("DRAW");
    expect(state.public.deckCount).toBe(18);
    expect(player(state, "a").ship).toBeUndefined();
    expect(player(state, "a").tracks.CLOTH).toBe(4);
    expect(player(state, "b").tracks.SPICE).toBe(4);
    const least = Math.min(...state.public.players.map((p) => p.money));
    expect(player(state, state.public.auctioneer).money).toBe(least);
    expect(state.public.notification?.title).toBe("Day 1 is scored.");
  });

  it("pays the bonuses in full for the top three levels and ends after day three", () => {
    const state = fresh(["CLOTH_5", "FUR_2"], "a", "b");
    state.public.day = 3;
    player(state, "a").tracks.DYE = 5;
    player(state, "b").tracks.DYE = 6;
    player(state, "a").ship = ["DYE_1", "DYE_2"];
    player(state, "b").ship = ["DYE_3"];
    const scoring = computeDayScoring(state);
    const dye = scoring.tracks.find((t) => t.commodity === "DYE")!;
    expect(dye.rows).toEqual([
      { email: "a", level: 7, award: 5, bonus: 20 },
      { email: "b", level: 7, award: 5, bonus: 20 },
    ]);
    // Deck runs out after this lot: the day ends with ships part empty.
    drawCard(state);
    drawCard(state);
    expect(state.public.phase).toBe("BID");
    bid(state, 1); // b
    pass(state); // a
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.notification?.title).toMatch(/^Game over/);
    expect(state.public.log?.length).toBeGreaterThan(3);
  });
});

describe("the bot", () => {
  it("values a lot that lifts its ship and its tracks, and bids below that", () => {
    const state = fresh(
      ["CLOTH_5", "CLOTH_4", "GOLD_10", "DYE_0"],
      "Bot #1",
      "b",
      "c",
    );
    drawCard(state);
    drawCard(state);
    const worth = lotValue(state, "Bot #1", state.public.lot || []);
    expect(worth).toBeGreaterThan(5);
    const junk = lotValue(state, "Bot #1", ["DYE_0"]);
    expect(junk).toBeLessThan(worth);
    offerLot(state);
    pass(state); // b
    pass(state); // c
    const move = chooseBotMove(state, () => 0.5);
    expect(move).toEqual({ type: "bid", amount: 1 });
    expect(turnMoves(state).map((m) => m.type)).toEqual(["pass", "bid", "bid"]);
  });

  it("keeps drawing while the lot is expected to improve and always makes progress", () => {
    const state = fresh(
      ["DYE_0", "CLOTH_5", "GOLD_10", "FUR_4"],
      "Bot #1",
      "b",
      "c",
    );
    takeBotTurn(state);
    expect(state.public.lot).toEqual(["DYE_0"]);
    takeBotTurn(state);
    // A zero on its own is not worth offering: the bot turns over another.
    expect((state.public.lot || []).length).toBe(2);
    let guard = 0;
    while (state.public.status === "IN_PROGRESS" && guard++ < 400) {
      const before = JSON.stringify(state);
      const active = state.public.players.find(
        (p) => p.email === state.public.activePlayer,
      )!;
      if (active.isBot) takeBotTurn(state);
      else if (state.public.phase === "DRAW") {
        if (state.public.lot) offerLot(state);
        else drawCard(state);
      } else pass(state);
      expect(JSON.stringify(state)).not.toBe(before);
    }
    expect(state.public.status).toBe("GAME_OVER");
  });
});

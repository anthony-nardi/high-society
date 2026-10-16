import { describe, expect, it } from "vitest";
import {
  bid,
  biddableMoney,
  canPass,
  endRound,
  finalPoints,
  initiateAuction,
  pass,
  raidLimitFor,
  revealCard,
  roundPoints,
  useThief,
} from "../rules";
import { buildDeck, buildGameState } from "..";
import { gameState, player } from "./fixtures";

describe("setup", () => {
  it("builds the 120 card deck", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(120);
    expect(deck.filter((c) => c === "POLICE_RAIDS")).toHaveLength(21);
    expect(deck.filter((c) => c === "THIEF")).toHaveLength(6);
  });

  it("deals money by player count and sets the raid limit", () => {
    const lobby = ["a", "b", "c"].map((email) => ({
      email,
      ready: true,
      joinedAt: "0",
      isBot: false,
      gameName: "razzia" as const,
    }));
    const state = buildGameState("lobby", lobby, buildDeck());
    expect(state.public.players[0].money).toEqual(["2", "5", "8", "13"]);
    expect(state.public.players[2].availableMoney).toEqual(["4", "7", "10", "11"]);
    expect(state.public.raidLimit).toBe(7);
    expect(state.public.money).toBe("1");
    expect(state.private.log).toHaveLength(1);
    expect(raidLimitFor(5)).toBe(7);
    expect(raidLimitFor(2)).toBe(5);
  });
});

describe("revealing", () => {
  it("puts loot on the table and passes the turn", () => {
    const state = gameState([player("a"), player("b"), player("c")], ["COINS", "CARS"]);
    expect(revealCard(state).ok).toBe(true);
    expect(state.public.revealedCards).toEqual(["COINS"]);
    expect(state.public.remainingCards).toBe(1);
    expect(state.public.activePlayer).toBe("b");
    expect(state.private.log?.[0].title).toBe("a revealed COINS.");
  });

  it("skips players with no money left", () => {
    const state = gameState(
      [player("a"), player("b", { availableMoney: [] }), player("c")],
      ["COINS"]
    );
    revealCard(state);
    expect(state.public.activePlayer).toBe("c");
  });

  it("starts an automatic auction on the seventh card and discards it if unsold", () => {
    const state = gameState([player("a"), player("b"), player("c")], ["COINS"], {
      revealedCards: Array(6).fill("CARS"),
    });
    expect(revealCard(state).ok).toBe(true);
    expect(state.public.roundState).toBe("FORCED_AUCTION");
    expect(state.public.revealedCards).toHaveLength(7);
    expect(state.public.activePlayer).toBe("b");
    pass(state);
    pass(state);
    expect(pass(state).ok).toBe(true); // the revealer may pass too
    expect(state.public.revealedCards).toEqual([]);
    expect(state.public.roundState).toBe("ACTION");
  });

  it("ends the round if the deck runs out", () => {
    const state = gameState([player("a"), player("b")], []);
    expect(revealCard(state).ok).toBe(true);
    expect(state.public.round).toBe(2);
  });

  it("starts a forced auction on a police raid", () => {
    const state = gameState([player("a"), player("b"), player("c")], ["POLICE_RAIDS"], {
      revealedCards: ["COINS"],
    });
    revealCard(state);
    expect(state.public.roundState).toBe("FORCED_AUCTION");
    expect(state.public.policeRaids).toBe(1);
    expect(state.public.auctionTriggeringPlayer).toBe("a");
    expect(state.public.activePlayer).toBe("b");
  });

  it("ends the round on the final police raid and discards the loot", () => {
    const state = gameState(
      [player("a", { cards: { coins: ["COINS"] } }), player("b"), player("c")],
      ["POLICE_RAIDS"],
      { revealedCards: ["COINS"], policeRaids: 5, raidLimit: 6 }
    );
    revealCard(state);
    expect(state.public.round).toBe(2);
    expect(state.public.roundState).toBe("ACTION");
    expect(state.public.revealedCards).toEqual([]);
    expect(state.public.policeRaids).toBe(0);
    expect(state.public.players[0].score).toBe(3 - 5); // coins, no jewels
  });
});

describe("auctions", () => {
  function auction(revealed = ["COINS", "COINS"]) {
    const state = gameState(
      [
        player("a"),
        player("b", { money: ["3", "6", "9", "12"] }),
        player("c", { money: ["4", "7", "10", "11"] }),
      ],
      ["CARS"],
      { revealedCards: revealed as never }
    );
    initiateAuction(state);
    return state;
  }

  it("may be called with an empty table to swap cheques", () => {
    const state = gameState(
      [player("a"), player("b", { money: ["3", "6", "9", "12"] })],
      ["CARS"]
    );
    expect(initiateAuction(state).ok).toBe(true);
    pass(state); // b
    expect(bid(state, "2").ok).toBe(true); // a must bid
    expect(state.public.money).toBe("2");
    expect(state.public.players[0].money?.sort()).toEqual(["1", "13", "5", "8"]);
  });

  it("goes round the table and ends with the caller", () => {
    const state = auction();
    expect(state.public.roundState).toBe("NORMAL_AUCTION");
    expect(state.public.activePlayer).toBe("b");
    expect(bid(state, "6").ok).toBe(true);
    expect(state.public.activePlayer).toBe("c");
    expect(bid(state, "4").ok).toBe(false); // below the table
    expect(biddableMoney(state, state.public.players[2])).toEqual(["7", "10", "11"]);
    expect(pass(state).ok).toBe(true);
    expect(state.public.activePlayer).toBe("a");
  });

  it("makes the caller bid when nobody else did", () => {
    const state = auction();
    pass(state); // b
    pass(state); // c
    expect(canPass(state, state.public.players[0])).toBe(false);
    expect(pass(state).ok).toBe(false);
    expect(bid(state, "2").ok).toBe(true);
    expect(state.public.players[0].cards.coins).toEqual(["COINS", "COINS"]);
  });

  it("gives the winner the loot and the centre money, and the centre their bid", () => {
    const state = auction();
    bid(state, "6"); // b
    pass(state); // c
    bid(state, "8"); // a, the caller, outbids
    const a = state.public.players[0];
    const b = state.public.players[1];
    expect(a.cards.coins).toHaveLength(2);
    expect(a.availableMoney).toEqual(["2", "5", "13"]);
    expect(a.money?.sort()).toEqual(["1", "13", "2", "5"]);
    expect(b.availableMoney).toEqual(["3", "6", "9", "12"]); // bid returned
    expect(state.public.money).toBe("8");
    expect(state.public.revealedCards).toEqual([]);
    expect(state.public.roundState).toBe("ACTION");
    // Play resumes after the caller.
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.players.every((p) => p.bid === "0")).toBe(true);
  });

  it("lets a forced auction end with no bids and the loot kept", () => {
    const state = gameState([player("a"), player("b"), player("c")], ["POLICE_RAIDS"], {
      revealedCards: ["CARS"],
    });
    revealCard(state);
    pass(state); // b
    pass(state); // c
    expect(pass(state).ok).toBe(true); // a may pass a forced auction
    expect(state.public.roundState).toBe("ACTION");
    expect(state.public.revealedCards).toEqual(["CARS"]);
    expect(state.public.activePlayer).toBe("b");
  });

  it("ends the round when the last money card is spent", () => {
    const state = gameState(
      [
        player("a", { money: ["2"], availableMoney: ["2"] }),
        player("b", { money: ["3"], availableMoney: [] }),
        player("c", { money: ["4"], availableMoney: [] }),
      ],
      ["CARS"],
      { revealedCards: ["BODYGUARDS"] }
    );
    initiateAuction(state);
    expect(state.public.activePlayer).toBe("a"); // nobody else can bid
    bid(state, "2");
    expect(state.public.round).toBe(2);
    expect(state.public.players[0].cards.bodyguards).toEqual(["BODYGUARDS"]);
    expect(state.public.players[0].availableMoney).toEqual(["1"]);
    // Highest money card starts the new round.
    expect(state.public.activePlayer).toBe("c");
  });
});

describe("thieves", () => {
  it("takes a card from the table for one thief", () => {
    const state = gameState(
      [player("a", { cards: { theives: ["THIEF", "THIEF"] } }), player("b")],
      ["CARS"],
      { revealedCards: ["COINS", "CARS"] }
    );
    expect(useThief(state, ["COINS"]).ok).toBe(true);
    expect(state.public.players[0].cards.coins).toEqual(["COINS"]);
    expect(state.public.players[0].cards.theives).toEqual(["THIEF"]);
    expect(state.public.revealedCards).toEqual(["CARS"]);
    expect(state.public.activePlayer).toBe("b");
  });

  it("rejects cards that are not on the table", () => {
    const state = gameState(
      [player("a", { cards: { theives: ["THIEF"] } }), player("b")],
      ["CARS"],
      { revealedCards: ["COINS"] }
    );
    expect(useThief(state, ["CARS"]).ok).toBe(false);
  });

  it("may even steal a thief", () => {
    const state = gameState(
      [player("a", { cards: { theives: ["THIEF"] } }), player("b")],
      ["CARS"],
      { revealedCards: ["THIEF"] }
    );
    expect(useThief(state, ["THIEF"]).ok).toBe(true);
    expect(state.public.players[0].cards.theives).toEqual(["THIEF"]);
  });
});

describe("scoring", () => {
  it("scores the round categories", () => {
    const a = player("a", {
      cards: {
        jewels: ["SCARAB", "CROSS", "RING"],
        bodyguards: ["BODYGUARDS", "BODYGUARDS"],
        coins: ["COINS"],
        cars: ["CARS", "CARS"],
        drivers: ["DRIVERS"],
        theives: ["THIEF"],
      },
    });
    const b = player("b");
    expect(roundPoints(a, [a, b])).toEqual({
      jewels: 5,
      bodyguards: 5,
      coins: 3,
      cars: 2,
      drivers: 1,
      thieves: 2,
    });
    expect(roundPoints(b, [a, b])).toEqual({
      jewels: -5,
      bodyguards: -2,
      coins: 0,
      cars: 0,
      drivers: 0,
      thieves: 0,
    });
  });

  it("does not pay for cars without a driver", () => {
    const a = player("a", { cards: { cars: ["CARS", "CARS"] } });
    expect(roundPoints(a, [a]).cars).toBe(0);
  });

  it("scores businesses and money at the end", () => {
    const a = player("a", {
      money: ["13", "12"],
      cards: { businesses: ["CASINO", "CASINO", "CASINO", "RACING"] },
    });
    const b = player("b", { money: ["2"] });
    expect(finalPoints(a, [a, b])).toEqual({ businesses: 2 + 5, money: 5 });
    expect(finalPoints(b, [a, b])).toEqual({ businesses: 0, money: -5 });

    const tycoon = player("t", {
      cards: {
        businesses: [
          "CASINO", "TRANSPORTATION", "MOVIE_THEATER", "RACING", "REAL_ESTATE",
          "NIGHTCLUB", "RESTAURANT", "RESTAURANT", "RESTAURANT", "RESTAURANT",
        ],
      },
    });
    expect(finalPoints(tycoon, [tycoon]).businesses).toBe(10 + 10);
    const six = player("s", {
      cards: {
        businesses: ["CASINO", "TRANSPORTATION", "MOVIE_THEATER", "RACING", "REAL_ESTATE", "NIGHTCLUB"],
      },
    });
    expect(finalPoints(six, [six]).businesses).toBe(6);
  });

  it("ends the game after round three with final scoring published", () => {
    const state = gameState(
      [
        player("a", { cards: { coins: ["COINS"], jewels: ["RING"], businesses: ["CASINO"] } }),
        player("b"),
      ],
      [],
      { round: 3 }
    );
    endRound(state);
    expect(state.public.status).toBe("GAME_OVER");
    // Round: coins 3, jewels 0 (one kind), bodyguards tie 0. Final: business 1, money tie 0.
    expect(state.public.players[0].score).toBe(4);
    expect(state.public.players[1].score).toBe(-5);
    expect(state.public.scoring).toHaveLength(4);
    expect(state.public.log).toEqual(state.private.log);
  });

  it("keeps bodyguards, cars and businesses between rounds", () => {
    const state = gameState(
      [player("a", { cards: { coins: ["COINS"], cars: ["CARS"], businesses: ["RACING"], bodyguards: ["BODYGUARDS"] } }), player("b")],
      []
    );
    endRound(state);
    expect(state.public.players[0].cards).toEqual({
      jewels: [],
      bodyguards: ["BODYGUARDS"],
      coins: [],
      theives: [],
      cars: ["CARS"],
      drivers: [],
      businesses: ["RACING"],
    });
  });
});

function findUndefined(value: unknown, path = "root"): string | null {
  if (value === undefined) return path;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findUndefined(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const hit = findUndefined(child, `${path}.${key}`);
      if (hit) return hit;
    }
  }
  return null;
}

describe("database safety", () => {
  // The Realtime Database rejects any write containing undefined, which
  // silently broke the caller's winning bid once.
  it("never leaves undefined in the state after an auction or a round end", () => {
    const state = gameState(
      [player("a"), player("b", { money: ["3", "6", "9", "12"] }), player("c", { money: ["4", "7", "10", "11"] })],
      ["POLICE_RAIDS", "COINS"],
      { revealedCards: ["COINS"] }
    );
    initiateAuction(state);
    pass(state);
    pass(state);
    bid(state, "2"); // caller must bid; resolves the auction
    expect(findUndefined(state)).toBeNull();

    revealCard(state); // police: forced auction
    pass(state);
    pass(state);
    pass(state);
    expect(findUndefined(state)).toBeNull();

    endRound(state);
    expect(findUndefined(state)).toBeNull();
  });
});

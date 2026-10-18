import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { FujiFlushGameState } from "../../types";
import { buildFujiFlushGameState, cardsLeft, playCard } from "../rules";
import {
  DECK_SIZE,
  DISTRIBUTION,
  fullDeck,
  handSize,
  outcomeOf,
} from "../board";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "fuji-flush",
  }));

/** Deterministic deal: no shuffling, the first seat starts. */
const fresh = (...emails: string[]) =>
  buildFujiFlushGameState("lobby", lobby(...emails), () => 0);

const seat = (state: FujiFlushGameState, email: string) =>
  state.public.players.find((p) => p.email === email)!;

/** The rulebook's four-player example, set up by hand. */
function example(): FujiFlushGameState {
  const state = fresh("anne", "paul", "rachel", "camille");
  seat(state, "anne").hand = [6, 9, 2, 2, 2, 2];
  seat(state, "paul").hand = [8, 14, 2, 2, 2, 2];
  seat(state, "rachel").hand = [7, 6, 2, 2, 2, 2];
  seat(state, "camille").hand = [7, 2, 2, 2, 2, 2];
  state.private.deck = [3, 3, 3, 3, 3, 3];
  state.public.deckCount = 6;
  state.public.activePlayer = "anne";
  return state;
}

describe("the deck", () => {
  it("holds ninety cards from 2 to 20 in the printed counts", () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(Math.min(...deck)).toBe(2);
    expect(Math.max(...deck)).toBe(20);
    expect(deck.filter((c) => c === 2)).toHaveLength(16);
    expect(deck.filter((c) => c === 20)).toHaveLength(1);
    expect(Object.values(DISTRIBUTION).reduce((s, n) => s + n, 0)).toBe(90);
  });

  it("deals six cards each, five at a table of seven or eight", () => {
    expect(handSize(3)).toBe(6);
    expect(handSize(6)).toBe(6);
    expect(handSize(7)).toBe(5);
    expect(handSize(8)).toBe(5);
    const three = fresh("a", "b", "c");
    expect(three.public.players.map((p) => p.hand?.length)).toEqual([6, 6, 6]);
    expect(three.public.deckCount).toBe(72);
    const eight = fresh("a", "b", "c", "d", "e", "f", "g", "h");
    expect(eight.public.players.every((p) => p.hand?.length === 5)).toBe(true);
    expect(eight.public.deckCount).toBe(50);
  });
});

describe("a card on the table", () => {
  it("joins equal numbers and flushes lower values, never a matching total", () => {
    const players = [
      { email: "anne", played: 7 },
      { email: "paul", played: 8 },
      { email: "rachel", played: 7 },
      { email: "camille" },
    ];
    // A 14 matches the two 7s' total but is not added to them.
    const fourteen = outcomeOf(players, "camille", 14);
    expect(fourteen.joined).toEqual([]);
    expect(fourteen.value).toBe(14);
    expect(fourteen.level.map((l) => l.email)).toEqual(["anne", "rachel"]);
    expect(fourteen.flushed.map((f) => f.email)).toEqual(["paul"]);
    // A third 7 makes 21 and beats everyone else.
    const seven = outcomeOf(players, "camille", 7);
    expect(seven.joined).toEqual(["anne", "rachel"]);
    expect(seven.value).toBe(21);
    expect(seven.flushed.map((f) => f.email)).toEqual(["paul"]);
    // A 9 sits under the 14.
    const nine = outcomeOf(players, "camille", 9);
    expect(nine.flushed.map((f) => f.email)).toEqual(["paul"]);
    expect(nine.above.map((a) => a.value)).toEqual([14, 14]);
  });
});

describe("the rulebook example", () => {
  it("plays out as printed", () => {
    const state = example();
    expect(playCard(state, 6).ok).toBe(true); // Anne
    expect(seat(state, "anne").played).toBe(6);
    expect(state.public.activePlayer).toBe("paul");

    expect(playCard(state, 8).ok).toBe(true); // Paul beats the 6.
    expect(seat(state, "anne").played).toBeUndefined();
    expect(seat(state, "anne").hand).toEqual([2, 2, 2, 2, 3, 9]);
    expect(seat(state, "anne").flushed).toBe(1);
    expect(state.public.lastPlay?.flushed).toEqual([
      { email: "anne", card: 6, value: 6 },
    ]);
    expect(state.public.discardCount).toBe(1);

    expect(playCard(state, 7).ok).toBe(true); // Rachel: nothing happens.
    expect(seat(state, "paul").played).toBe(8);

    expect(playCard(state, 7).ok).toBe(true); // Camille: two 7s make 14.
    expect(state.public.lastPlay?.joined).toEqual(["rachel"]);
    expect(state.public.lastPlay?.value).toBe(14);
    expect(seat(state, "paul").played).toBeUndefined();
    expect(state.public.notification?.title).toBe(
      "camille plays a 7 with rachel for 14 and flushes paul's 8.",
    );

    expect(playCard(state, 9).ok).toBe(true); // Anne's 9 does not beat 14.

    expect(playCard(state, 14).ok).toBe(true); // Paul's 14 is not added, beats the 9.
    expect(seat(state, "anne").played).toBeUndefined();

    // Rachel's turn: her 7 went through, and Camille's with it.
    expect(state.public.activePlayer).toBe("rachel");
    expect(seat(state, "rachel").played).toBeUndefined();
    expect(seat(state, "camille").played).toBeUndefined();
    expect(seat(state, "rachel").pushed).toBe(1);
    expect(seat(state, "camille").pushed).toBe(1);
    expect(state.public.lastPush).toEqual({
      email: "rachel",
      card: 7,
      members: ["rachel", "camille"],
      turn: 6,
    });
    expect(seat(state, "rachel").hand).toHaveLength(5);
    expect(seat(state, "camille").hand).toHaveLength(5);
    expect(state.public.status).toBe("IN_PROGRESS");
  });

  it("rejects cards not in hand and a play out of turn state", () => {
    const state = example();
    const before = JSON.stringify(state);
    expect(playCard(state, 20).ok).toBe(false);
    expect(playCard(state, Number.NaN).ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("winning", () => {
  it("is pushing your last card through, possibly together", () => {
    const state = fresh("a", "b", "c");
    seat(state, "a").hand = [5];
    seat(state, "b").hand = [5];
    seat(state, "c").hand = [3, 3];
    expect(playCard(state, 5).ok).toBe(true); // a
    expect(playCard(state, 5).ok).toBe(true); // b joins: 10
    expect(playCard(state, 3).ok).toBe(true); // c sits under it
    // Back to a: the 5s go through and both hands are empty.
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winners).toEqual(["a", "b"]);
    expect(state.public.winner).toBeUndefined();
    expect(state.public.notification?.title).toBe(
      "Game over: a and b win together.",
    );
    expect(cardsLeft(seat(state, "c"))).toBe(2);
    expect(state.public.log?.length).toBeGreaterThan(3);
  });

  it("can happen during another player's turn", () => {
    const state = fresh("a", "b", "c");
    seat(state, "a").hand = [9, 2];
    seat(state, "b").hand = [9];
    seat(state, "c").hand = [4, 4];
    playCard(state, 9); // a
    playCard(state, 9); // b joins for 18, last card
    playCard(state, 4); // c
    // a's turn: the 9s go through; b has nothing left and wins alone.
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winners).toEqual(["b"]);
    expect(state.public.winner).toBe("b");
    expect(state.public.notification?.title).toBe("b wins!");
  });

  it("turns the drain into a new stack when the cards run out", () => {
    const state = fresh("a", "b", "c");
    seat(state, "a").hand = [4, 4];
    seat(state, "b").hand = [9, 9];
    seat(state, "c").hand = [2, 2];
    delete state.private.deck;
    state.public.deckCount = 0;
    playCard(state, 4); // a
    // b flushes the 4: the drain, holding only that 4, becomes the stack and a draws it back.
    playCard(state, 9);
    expect(seat(state, "a").hand).toEqual([4, 4]);
    expect(state.public.discardCount).toBe(0);
    expect(state.public.deckCount).toBe(0);
    expect(state.private.log?.some((e) => /stack ran out/.test(e.title))).toBe(
      true,
    );
  });
});

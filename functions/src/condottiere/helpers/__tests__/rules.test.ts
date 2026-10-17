import { describe, expect, it } from "vitest";
import {
  BORDERS,
  fullDeck,
  largestConnected,
  neighbours,
  REGIONS,
} from "../board";
import {
  battlefields,
  buildCondottiereGameState,
  chooseBattlefield,
  pass,
  playCard,
  strengthOf,
  winConditions,
} from "../rules";
import { Card, CondottiereGameState } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "condottiere" as const,
  }));

const newGame = (...emails: string[]) =>
  buildCondottiereGameState("lobby", lobby(...emails), () => 0);

/** A battle in progress at region 7 with given hands; a leads. */
function battle(
  hands: { [email: string]: Card[] },
  region = 7,
): CondottiereGameState {
  const state = newGame(...Object.keys(hands));
  for (const p of state.public.players) {
    p.hand = [...hands[p.email]];
    delete p.line;
    delete p.passed;
  }
  state.public.condottiere = "a";
  state.public.activePlayer = "a";
  expect(chooseBattlefield(state, region).ok).toBe(true);
  return state;
}

describe("map and deck", () => {
  it("has seventeen regions, a connected map and the 110-card deck", () => {
    expect(REGIONS).toHaveLength(17);
    expect(BORDERS.length).toBeGreaterThan(20);
    for (let r = 0; r < 17; r++)
      expect(neighbours(r).length).toBeGreaterThanOrEqual(2);
    expect(largestConnected(REGIONS.map((_, i) => i))).toBe(17);
    expect(largestConnected([0, 1, 3])).toBe(3);
    expect(largestConnected([0, 16])).toBe(1);
    const deck = fullDeck();
    expect(deck).toHaveLength(110);
    expect(deck.filter((c) => c === "M1")).toHaveLength(10);
    expect(deck.filter((c) => c === "SCARECROW")).toHaveLength(16);
    expect(winConditions(4)).toEqual({ total: 5, adjacent: 3 });
    expect(winConditions(3)).toEqual({ total: 6, adjacent: 4 });
  });

  it("deals ten cards each and starts with a choice of battlefield", () => {
    const state = newGame("a", "b", "c");
    expect(state.public.players.every((p) => p.hand?.length === 10)).toBe(true);
    expect(state.public.deckCount).toBe(110 - 30);
    expect(state.public.phase).toBe("CHOOSE");
    expect(battlefields(state)).toHaveLength(17);
  });
});

describe("strength", () => {
  it("adds mercenaries, doubles with a drummer, flattens in winter and lifts the best in spring", () => {
    expect(strengthOf(["M3", "M5", "COURTESAN", "HEROINE"], undefined)).toBe(
      3 + 5 + 1 + 10,
    );
    expect(strengthOf(["M3", "M5", "DRUMMER"], undefined)).toBe(16);
    expect(strengthOf(["M3", "M5", "DRUMMER", "DRUMMER"], undefined)).toBe(16);
    expect(strengthOf(["M3", "M5", "HEROINE"], "WINTER")).toBe(1 + 1 + 10);
    expect(strengthOf(["M3", "M5", "DRUMMER"], "WINTER")).toBe(4);
    expect(strengthOf(["M3", "M5", "M5"], "SPRING")).toBe(3 + 8 + 8);
    expect(strengthOf(["M3", "M5", "DRUMMER"], "SPRING")).toBe(6 + 13);
  });
});

describe("a battle", () => {
  it("goes round the table until everyone passes, then the strongest takes the region", () => {
    const state = battle({
      a: ["M3", "M1"],
      b: ["M5", "COURTESAN", "M1"],
      c: ["M2"],
    });
    expect(state.public.activePlayer).toBe("a");
    expect(playCard(state, 0).ok).toBe(true); // a: 3
    expect(state.public.activePlayer).toBe("b");
    expect(playCard(state, 0).ok).toBe(true); // b: 5
    expect(pass(state).ok).toBe(true); // c out
    expect(playCard(state, 0).ok).toBe(true); // a: +1 = 4
    expect(playCard(state, 0).ok).toBe(true); // b: courtesan = 6
    expect(state.public.activePlayer).toBe("b"); // a has no cards and is passed for it
    expect(pass(state).ok).toBe(true); // b passes: all out
    expect(state.public.phase).toBe("CHOOSE");
    expect(state.public.players[1].regions).toEqual([7]);
    expect(state.public.lastBattle?.winner).toBe("b");
    // b had the only courtesan and the win: holds the token and chooses next.
    expect(state.public.condottiere).toBe("b");
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.players.every((p) => !p.line)).toBe(true);
  });

  it("gives nobody the region on a tie, and leaves the token where it was", () => {
    const state = battle({ a: ["M4"], b: ["M4"], c: ["M1"] });
    playCard(state, 0);
    playCard(state, 0);
    pass(state);
    expect(state.public.phase).toBe("CHOOSE");
    expect(state.public.players.every((p) => !(p.regions || []).length)).toBe(
      true,
    );
    expect(state.public.condottiere).toBe("a");
  });

  it("ends at once on a surrender, winter and spring replace each other, and a bishop clears the top mercenaries", () => {
    const state = battle({
      a: ["M10", "WINTER", "SURRENDER"],
      b: ["M6", "SPRING", "BISHOP"],
      c: ["M1"],
    });
    playCard(state, 0); // a: 10
    playCard(state, 0); // b: 6
    pass(state); // c
    playCard(state, 0); // a: winter -> a 1, b 1
    expect(state.public.season).toBe("WINTER");
    playCard(state, 0); // b: spring -> winter discarded, b's 6 becomes 9, a's 10 becomes 13
    expect(state.public.season).toBe("SPRING");
    expect(state.public.players[0].line).toEqual(["M10"]);
    expect(strengthOf(state.public.players[0].line, "SPRING")).toBe(13);
    // a surrenders while ahead: the battle ends now.
    expect(playCard(state, 0).ok).toBe(true);
    expect(state.public.phase).toBe("CHOOSE");
    expect(state.public.players[0].regions).toEqual([7]);

    const again = battle(
      { a: ["M10", "M2"], b: ["BISHOP", "M3"], c: ["M1"] },
      8,
    );
    playCard(again, 0); // a: 10
    expect(playCard(again, 0, 8).ok).toBe(false); // the Pope may not sit on the battlefield
    expect(playCard(again, 0, 2).ok).toBe(true); // b: bishop, pope to Venezia
    expect(again.public.players[0].line).toEqual([]);
    expect(again.public.pope).toBe(2);
    expect(battlefields(again).includes(2)).toBe(false);
  });

  it("lets a scarecrow take a mercenary back", () => {
    const state = battle({ a: ["M6", "SCARECROW"], b: ["M3"], c: ["M1"] });
    playCard(state, 0);
    playCard(state, 0);
    pass(state);
    expect(playCard(state, 0).ok).toBe(false); // needs a target
    expect(playCard(state, 0, 0).ok).toBe(true);
    expect(state.public.players[0].line).toEqual([]);
    expect(state.public.players[0].hand).toEqual(["M6"]);
  });

  it("redeals ten plus one per region once at most one player has cards", () => {
    const state = battle({ a: ["M4"], b: ["M2"], c: ["M1"] });
    state.public.players[0].regions = [3, 5];
    playCard(state, 0); // a plays its last card
    playCard(state, 0); // b too
    playCard(state, 0); // c too: nobody has cards, the battle resolves
    expect(state.public.phase).toBe("CHOOSE");
    // a won Firenze as well: ten cards plus three regions.
    expect(state.public.players[0].hand).toHaveLength(13);
    expect(state.public.players[1].hand).toHaveLength(10);
    expect(state.public.lastMove?.type).toBe("redeal");
  });

  it("is won by five regions or three adjacent with four players, six and four with three", () => {
    const four = battle({ a: ["M4"], b: ["M1"], c: ["M1"], d: ["M1"] }, 1);
    four.public.players[0].regions = [0, 3]; // Torino and Genova; Milano joins both
    playCard(four, 0);
    pass(four);
    pass(four);
    pass(four);
    expect(four.public.status).toBe("GAME_OVER");
    expect(four.public.winner).toBe("a");

    const three = battle({ a: ["M4"], b: ["M1"], c: ["M1"] }, 1);
    three.public.players[0].regions = [0, 3];
    playCard(three, 0);
    pass(three);
    pass(three);
    expect(three.public.status).toBe("IN_PROGRESS");
    expect(three.public.players[0].regions).toEqual([0, 1, 3]);
  });
});

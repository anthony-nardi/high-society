import { describe, expect, it } from "vitest";
import {
  buildFamilyIncGameState,
  bustChance,
  chipPoints,
  draw,
  INITIAL_PILE,
  pileSize,
  stop,
} from "../rules";
import { ChipValue, FamilyIncGameState } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "family-inc" as const,
  }));

/** A random source that deals the given values in order. */
function dealing(values: ChipValue[]) {
  let i = 0;
  return (pile: FamilyIncGameState["public"]["pile"]) => {
    const want = values[i++];
    // Position of `want` inside the pile's cumulative counts.
    let offset = 0;
    for (const value of [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ] as ChipValue[]) {
      if (value === want) return () => offset / pileSize(pile) + 1e-9;
      offset += pile[value] || 0;
    }
    throw new Error(`${want} not in pile`);
  };
}

function newGame(emails = ["a", "b", "c"]) {
  return buildFamilyIncGameState("lobby", lobby(...emails), () => 0);
}

function drawValue(state: FamilyIncGameState, value: ChipValue) {
  const next = dealing([value])(state.public.pile);
  return draw(state, next);
}

describe("setup", () => {
  it("starts with 135 chips and nothing in front of anyone", () => {
    const state = newGame();
    expect(pileSize(state.public.pile)).toBe(135);
    expect(INITIAL_PILE["1"]).toBe(16);
    expect(INITIAL_PILE["10"]).toBe(11);
    expect(state.public.activePlayer).toBe("a");
    expect(state.public.players.every((p) => p.score === 0 && !p.held)).toBe(
      true,
    );
  });
});

describe("drawing", () => {
  it("adds a new value to the player's chips", () => {
    const state = newGame();
    expect(drawValue(state, "7").ok).toBe(true);
    expect(state.public.players[0].held).toEqual({ "7": 1 });
    expect(state.public.drawnThisTurn).toEqual(["7"]);
    expect(state.public.pile["7"]).toBe(10);
    expect(state.public.activePlayer).toBe("a");
  });

  it("busts on a repeat, gives a diamond for a short turn and passes the turn", () => {
    const state = newGame();
    drawValue(state, "7");
    drawValue(state, "7");
    const a = state.public.players[0];
    expect(a.held).toBeUndefined();
    expect(a.diamonds).toBe(1);
    expect(state.public.lastOutcome).toBe("diamond");
    expect(state.public.activePlayer).toBe("b");
    // Busted chips are gone, not back in the pile.
    expect(state.public.pile["7"]).toBe(9);
  });

  it("gives no diamond after more than three draws", () => {
    const state = newGame();
    for (const v of ["1", "2", "3", "4", "2"] as ChipValue[])
      drawValue(state, v);
    expect(state.public.players[0].diamonds).toBe(0);
    expect(state.public.lastOutcome).toBe("bust");
    expect(state.public.activePlayer).toBe("b");
  });

  it("scores fifty for the third diamond", () => {
    const state = newGame();
    state.public.players[0].diamonds = 2;
    drawValue(state, "5");
    drawValue(state, "5");
    expect(state.public.players[0].diamonds).toBe(0);
    expect(state.public.players[0].score).toBe(50);
    expect(state.public.lastOutcome).toBe("fifty");
  });

  it("knows the bust chance from the pile", () => {
    const state = newGame();
    expect(bustChance(state)).toBe(0);
    drawValue(state, "10");
    // Ten 10s left out of 134.
    expect(bustChance(state)).toBeCloseTo(10 / 134);
  });
});

describe("stopping", () => {
  it("needs at least one draw", () => {
    const state = newGame();
    expect(stop(state).ok).toBe(false);
  });

  it("steals matching chips and banks them at the next turn", () => {
    const state = newGame();
    state.public.players[1].held = { "4": 2, "9": 1 };
    drawValue(state, "4");
    expect(stop(state).ok).toBe(true);
    expect(state.public.players[0].held).toEqual({ "4": 3 });
    expect(state.public.activePlayer).toBe("b");
    // b banks the 9 at the start of their turn.
    expect(state.public.players[1].score).toBe(9);
    expect(state.public.players[1].held).toBeUndefined();
    // a's chips stay in front of them until their next turn.
    expect(chipPoints(state.public.players[0].held)).toBe(12);
  });

  it("banks a's chips when their turn comes round again", () => {
    const state = newGame(["a", "b"]);
    drawValue(state, "6");
    stop(state); // b's turn
    drawValue(state, "2");
    stop(state); // a's turn: banks the 6
    expect(state.public.players[0].score).toBe(6);
    expect(state.public.players[0].held).toBeUndefined();
    expect(state.public.turn).toBe(3);
  });

  it("ends the game when banking reaches 100", () => {
    const state = newGame(["a", "b"]);
    state.public.players[0].score = 95;
    drawValue(state, "6");
    stop(state);
    drawValue(state, "2");
    stop(state);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
    expect(draw(state).ok).toBe(false);
  });
});

describe("the pile", () => {
  it("refills from everything not in front of a player when it runs out", () => {
    const state = newGame(["a", "b"]);
    state.public.pile = { "3": 1 };
    state.public.players[1].held = { "8": 2 };
    drawValue(state, "3");
    expect(pileSize(state.public.pile)).toBe(135 - 2 - 1);
    expect(state.public.pile["8"]).toBe(9);
    expect(state.public.pile["3"]).toBe(15);
  });
});

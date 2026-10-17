import { describe, expect, it } from "vitest";
import { ALL_SPOTS } from "../board";
import {
  buildLyngkGameState,
  claimColour,
  hasMove,
  mayLand,
  moveStack,
  pathsFrom,
  scoreOf,
  shuffledPieces,
} from "../rules";
import { LyngkGameState, Piece } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "lyngk" as const,
  }));

/** a starts. */
const newGame = () => buildLyngkGameState("lobby", lobby("a", "b"), () => 0);

/** A sparse position; everything not listed is empty. */
function position(
  stacks: { [coord: string]: Piece[] },
  claims: { a?: Piece[]; b?: Piece[] } = {},
  active = "a",
): LyngkGameState {
  const state = newGame();
  state.public.stacks = { ...stacks };
  state.public.activePlayer = active;
  const [a, b] = state.public.players;
  if (claims.a) a.colours = claims.a as never;
  if (claims.b) b.colours = claims.b as never;
  return state;
}

describe("board and setup", () => {
  it("has 43 spots in rows of 3 to 7 and back, filled with 43 pieces", () => {
    expect(ALL_SPOTS).toHaveLength(43);
    const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(
      (y) => ALL_SPOTS.filter((c) => c.endsWith(`,${y}`)).length,
    );
    expect(rows).toEqual([3, 4, 5, 6, 7, 6, 5, 4, 3]);
    const bag = shuffledPieces(() => 0.5);
    expect(bag).toHaveLength(43);
    expect(bag.filter((p) => p === "JOKER")).toHaveLength(3);
    expect(bag.filter((p) => p === "RED")).toHaveLength(8);

    const state = newGame();
    expect(Object.keys(state.public.stacks || {})).toHaveLength(43);
    expect(
      Object.values(state.public.stacks || {}).every((s) => s.length === 1),
    ).toBe(true);
    expect(hasMove(state, "a")).toBe(true);
  });
});

describe("claiming", () => {
  it("allows one free colour per turn, two in all, before the move", () => {
    const state = newGame();
    expect(claimColour(state, "RED").ok).toBe(true);
    expect(claimColour(state, "BLUE").ok).toBe(false); // one per turn
    expect(state.public.players[0].colours).toEqual(["RED"]);
    state.public.activePlayer = "b";
    expect(claimColour(state, "RED").ok).toBe(false); // taken
    expect(claimColour(state, "JOKER" as never).ok).toBe(false);
    expect(claimColour(state, "BLUE").ok).toBe(true);
    state.public.activePlayer = "a";
    state.public.players[0].claimedThisTurn = false;
    expect(claimColour(state, "GREEN").ok).toBe(true);
    state.public.players[0].claimedThisTurn = false;
    expect(claimColour(state, "BLACK").ok).toBe(false); // two in all
  });
});

describe("moving", () => {
  it("slides to the first piece in a line, never over pieces", () => {
    const state = position({
      "0,4": ["RED"],
      "3,4": ["BLUE"],
      "5,4": ["GREEN"],
    });
    const paths = pathsFrom(state, "a", "0,4");
    expect(paths).toEqual([["0,4", "3,4"]]);
    expect(moveStack(state, ["0,4", "5,4"]).ok).toBe(false);
    expect(moveStack(state, ["0,4", "3,4"]).ok).toBe(true);
    expect(state.public.stacks?.["3,4"]).toEqual(["BLUE", "RED"]);
    expect(state.public.stacks?.["0,4"]).toBeUndefined();
  });

  it("keeps colours unique, jokers aside, and stacks no taller than five", () => {
    const state = position({ "0,4": ["RED"] });
    expect(mayLand(state, ["RED"], ["RED"])).toBe(false);
    expect(mayLand(state, ["RED"], ["JOKER"])).toBe(true);
    expect(mayLand(state, ["JOKER", "RED"], ["JOKER"])).toBe(true);
    expect(
      mayLand(state, ["RED", "BLUE"], ["GREEN", "BLACK", "IVORY", "JOKER"]),
    ).toBe(false);
  });

  it("restricts neutral pieces: singles onto singles, stacks onto nothing taller", () => {
    const state = position({
      "0,4": ["RED"],
      "1,4": ["BLUE", "GREEN"],
      "2,4": ["BLACK"],
      "4,4": ["IVORY", "BLUE", "GREEN"],
    });
    // A neutral single may not land on the stack next to it.
    expect(pathsFrom(state, "a", "0,4")).toEqual([]);
    // A neutral stack of two may land on a single, not on a stack of three.
    expect(pathsFrom(state, "a", "1,4").sort()).toEqual([
      ["1,4", "0,4"],
      ["1,4", "2,4"],
    ]);
    // Claimed, the same single may land on the stack.
    state.public.players[0].colours = ["RED"];
    expect(pathsFrom(state, "a", "0,4")).toEqual([["0,4", "1,4"]]);
  });

  it("only lets you move neutral stacks and your own, never a joker alone", () => {
    const state = position(
      { "0,4": ["RED"], "1,4": ["BLUE"], "2,4": ["JOKER"], "3,4": ["GREEN"] },
      { a: ["RED"], b: ["BLUE"] },
    );
    expect(pathsFrom(state, "a", "0,4").length).toBeGreaterThan(0);
    expect(pathsFrom(state, "a", "1,4")).toEqual([]); // b's colour
    expect(pathsFrom(state, "a", "2,4")).toEqual([]); // joker
    expect(pathsFrom(state, "a", "3,4").length).toBeGreaterThan(0); // neutral
  });

  it("links through your own colour with the LYNGK rule, each point once", () => {
    // Red is a's. Red at 0,4 can reach red at 3,4, carry on to red at 3,1 (north-east), then land on blue at 6,1.
    const state = position(
      {
        "0,4": ["RED"],
        "3,4": ["RED"],
        "3,1": ["RED"],
        "6,1": ["BLUE"],
        "5,4": ["GREEN"],
      },
      { a: ["RED"] },
    );
    const paths = pathsFrom(state, "a", "0,4").map((p) => p.join(">"));
    expect(paths).toContain("0,4>3,4>5,4");
    expect(paths).toContain("0,4>3,4>3,1>6,1");
    // Landing on red itself is never allowed: two reds in a stack.
    expect(paths.some((p) => p.endsWith(">3,4") || p.endsWith(">3,1"))).toBe(
      false,
    );
    expect(moveStack(state, ["0,4", "3,4", "3,1", "6,1"]).ok).toBe(true);
    expect(state.public.stacks?.["6,1"]).toEqual(["BLUE", "RED"]);
    expect(state.public.stacks?.["3,4"]).toEqual(["RED"]);
    expect(state.public.notification?.title).toMatch(/via 2 LYNGK links/);
  });

  it("does not link when the colour is neutral", () => {
    const state = position({
      "0,4": ["RED"],
      "3,4": ["RED"],
      "5,4": ["GREEN"],
    });
    expect(pathsFrom(state, "a", "0,4")).toEqual([]);
  });
});

describe("stacks of five", () => {
  it("scores a five topped by your colour and takes it off; a neutral five stays", () => {
    const state = position(
      {
        "0,4": ["RED"],
        "1,4": ["BLUE", "GREEN", "BLACK", "IVORY"],
        "5,4": ["GREEN", "BLACK", "IVORY"],
        "6,4": ["RED", "BLUE"],
      },
      { a: ["RED"] },
    );
    expect(moveStack(state, ["0,4", "1,4"]).ok).toBe(true);
    expect(state.public.stacks?.["1,4"]).toBeUndefined();
    expect(state.public.players[0].scored).toBe(1);
    expect(state.public.lastMove?.removed).toBe("1,4");
    expect(state.public.activePlayer).toBe("b");
    // Ivory is neutral: b's neutral stack of three completes a neutral five, which stays as an obstacle.
    expect(moveStack(state, ["5,4", "6,4"]).ok).toBe(true);
    expect(state.public.stacks?.["6,4"]).toHaveLength(5);
    expect(state.public.players[1].scored).toBe(0);
  });
});

describe("end", () => {
  it("passes a stuck player, ends when nobody can move, and breaks ties by smaller stacks", () => {
    const state = position(
      {
        "0,4": ["RED"],
        "1,4": ["BLUE"],
        "6,0": ["GREEN", "BLACK"],
      },
      { a: ["RED"], b: ["BLUE"] },
    );
    // a moves red onto blue: the stack is a's. b has nothing to move (6,0 is neutral but stuck).
    expect(moveStack(state, ["0,4", "1,4"]).ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(scoreOf(state, "a")).toEqual([0, 0, 0, 1, 0]);
    expect(scoreOf(state, "b")).toEqual([0, 0, 0, 0, 0]);
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
  });
});

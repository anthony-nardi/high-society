import { describe, expect, it } from "vitest";
import { ALL_RINGS, components, neighbours } from "../board";
import {
  buildZertzGameState,
  capture,
  captures,
  hasAnyMove,
  hasWon,
  isRemovable,
  place,
  placeableColours,
  removableRings,
  removeRing,
} from "../rules";
import { ZertzGameState } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "zertz" as const,
  }));

const newGame = () => buildZertzGameState("lobby", lobby("a", "b"), () => 0);

describe("board", () => {
  it("has 37 rings and six neighbours around the centre", () => {
    expect(ALL_RINGS).toHaveLength(37);
    expect(new Set(ALL_RINGS).size).toBe(37);
    const around = neighbours("4,3");
    expect(around).toHaveLength(6);
    expect(around.every((c) => ALL_RINGS.includes(c))).toBe(true);
  });

  it("finds connected groups", () => {
    expect(components(ALL_RINGS)).toHaveLength(1);
    expect(components(["4,0", "5,0", "4,3"])).toHaveLength(2);
  });
});

describe("placing and removing", () => {
  it("starts with a full pool, no marbles and player a to move", () => {
    const state = newGame();
    expect(state.public.pool).toEqual({ WHITE: 6, GRAY: 8, BLACK: 10 });
    expect(state.public.rings).toHaveLength(37);
    expect(state.public.activePlayer).toBe("a");
    expect(state.public.phase).toBe("MOVE");
  });

  it("places from the pool and then asks for a ring", () => {
    const state = newGame();
    expect(place(state, "WHITE", "4,3").ok).toBe(true);
    expect(state.public.marbles).toEqual({ "4,3": "WHITE" });
    expect(state.public.pool.WHITE).toBe(5);
    expect(state.public.phase).toBe("REMOVE_RING");
    expect(state.public.activePlayer).toBe("a");
    expect(place(state, "GRAY", "4,4").ok).toBe(false);
  });

  it("only lets edge rings with two free adjacent sides go", () => {
    const state = newGame();
    expect(isRemovable(state, "4,0")).toBe(true); // corner
    expect(isRemovable(state, "5,0")).toBe(true); // edge
    expect(isRemovable(state, "4,3")).toBe(false); // centre
    expect(isRemovable(state, "4,1")).toBe(false); // one ring in
    place(state, "WHITE", "4,0");
    expect(isRemovable(state, "4,0")).toBe(false); // occupied
  });

  it("passes the turn after the ring is removed", () => {
    const state = newGame();
    place(state, "BLACK", "4,3");
    expect(removeRing(state, "4,3").ok).toBe(false);
    expect(removeRing(state, "4,0").ok).toBe(true);
    expect(state.public.rings).toHaveLength(36);
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.phase).toBe("MOVE");
    expect(state.public.turn).toBe(2);
  });

  it("skips the removal when no ring can go", () => {
    const state = newGame();
    // Leave only the centre and its ring of six: every vacant ring has a
    // neighbour on every side once the middle is filled... simplest: a bar.
    state.public.rings = ["3,3", "4,3", "5,3"];
    state.public.marbles = { "3,3": "GRAY", "5,3": "GRAY" };
    expect(removableRings(state)).toEqual(["4,3"]);
    state.public.marbles = { "3,3": "GRAY" };
    state.public.rings = ["3,3", "4,3"];
    // 4,3 is vacant with E, SE, SW... missing: removable. Fill it instead.
    place(state, "WHITE", "4,3");
    expect(state.public.phase).toBe("MOVE");
    expect(state.public.activePlayer).toBe("b");
  });
});

describe("capturing", () => {
  function withMarbles(marbles: ZertzGameState["public"]["marbles"]) {
    const state = newGame();
    state.public.marbles = { ...marbles };
    return state;
  }

  it("is compulsory when available", () => {
    const state = withMarbles({ "3,3": "WHITE", "4,3": "GRAY" });
    expect(
      captures(state)
        .map((c) => c.from)
        .sort(),
    ).toEqual(["3,3", "4,3"]);
    expect(place(state, "BLACK", "1,3").ok).toBe(false);
    expect(capture(state, "3,3", "5,3").ok).toBe(true);
    expect(state.public.marbles).toEqual({ "5,3": "WHITE" });
    expect(state.public.players[0].captured).toEqual({ GRAY: 1 });
    expect(state.public.activePlayer).toBe("b");
  });

  it("must keep jumping with the same marble", () => {
    const state = withMarbles({
      "1,3": "BLACK",
      "2,3": "WHITE",
      "4,3": "WHITE",
    });
    expect(capture(state, "1,3", "3,3").ok).toBe(true);
    expect(state.public.phase).toBe("CONTINUE_CAPTURE");
    expect(state.public.capturingAt).toBe("3,3");
    expect(state.public.activePlayer).toBe("a");
    expect(place(state, "GRAY", "1,3").ok).toBe(false);
    expect(capture(state, "3,3", "5,3").ok).toBe(true);
    expect(state.public.players[0].captured).toEqual({ WHITE: 2 });
    expect(state.public.activePlayer).toBe("b");
  });

  it("rejects jumps that are not straight over a marble onto a vacant ring", () => {
    const state = withMarbles({
      "3,3": "WHITE",
      "4,3": "GRAY",
      "5,3": "BLACK",
    });
    expect(capture(state, "3,3", "5,3").ok).toBe(false);
    expect(capture(state, "3,3", "4,4").ok).toBe(false);
  });
});

describe("isolation and winning", () => {
  it("gives a fully occupied island to the player who cut it off", () => {
    const state = newGame();
    state.public.rings = ["4,0", "5,0", "4,2", "5,2", "4,3", "5,3"];
    state.public.marbles = { "4,0": "WHITE", "5,0": "BLACK", "4,2": "GRAY" };
    state.public.phase = "REMOVE_RING";
    expect(removableRings(state)).toContain("5,3");
    expect(removeRing(state, "5,3").ok).toBe(true);
    expect(state.public.players[0].captured).toEqual({ WHITE: 1, BLACK: 1 });
    expect(state.public.rings.sort()).toEqual(["4,2", "4,3", "5,2"]);
    expect(state.public.marbles).toEqual({ "4,2": "GRAY" });
  });

  it("leaves an island alone while it has a vacant ring", () => {
    const state = newGame();
    state.public.rings = ["4,0", "5,0", "4,2", "5,2", "4,3", "5,3"];
    state.public.marbles = { "4,0": "WHITE" };
    state.public.phase = "REMOVE_RING";
    removeRing(state, "5,3");
    expect(state.public.players[0].captured).toBeUndefined();
    expect(state.public.rings).toContain("5,0");
  });

  it("knows the three winning conditions", () => {
    const player = (
      captured: ZertzGameState["public"]["players"][0]["captured"],
    ) => ({
      email: "a",
      lastActionAt: 0,
      isBot: false,
      captured,
    });
    expect(hasWon(player({ WHITE: 3, GRAY: 3, BLACK: 3 }))).toBe(true);
    expect(hasWon(player({ WHITE: 4 }))).toBe(true);
    expect(hasWon(player({ GRAY: 5 }))).toBe(true);
    expect(hasWon(player({ BLACK: 6 }))).toBe(true);
    expect(hasWon(player({ WHITE: 3, GRAY: 3, BLACK: 2 }))).toBe(false);
  });

  it("ends the game on the capture that completes a win", () => {
    const state = newGame();
    state.public.players[0].captured = { WHITE: 3 };
    state.public.marbles = { "3,3": "BLACK", "4,3": "WHITE" };
    capture(state, "3,3", "5,3");
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
  });

  it("places from captures once the pool is empty, and loses when stuck", () => {
    const state = newGame();
    state.public.pool = {};
    state.public.players[0].captured = { GRAY: 1 };
    expect(placeableColours(state)).toEqual(["GRAY"]);
    expect(place(state, "GRAY", "4,3").ok).toBe(true);
    removeRing(state, "4,0");
    // b has nothing to place and nothing to capture.
    expect(hasAnyMove(state)).toBe(false);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("a");
  });
});

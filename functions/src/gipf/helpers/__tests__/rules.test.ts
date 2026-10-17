import { describe, expect, it } from "vitest";
import { ALL_SPOTS, DOTS, ENTRIES, lineFrom, LINES } from "../board";
import {
  buildGipfGameState,
  legalPushes,
  pushPiece,
  removeRow,
  rows,
} from "../rules";
import { GipfGameState, Side } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "gipf" as const,
  }));

/** a is white and starts. */
const newGame = () => buildGipfGameState("lobby", lobby("a", "b"), () => 0);

function position(
  pieces: { [coord: string]: Side },
  active = "a",
): GipfGameState {
  const state = newGame();
  state.public.pieces = { ...pieces };
  state.public.activePlayer = active;
  return state;
}

describe("board", () => {
  it("has 37 spots, 24 dots, 42 ways in and 21 lines", () => {
    expect(ALL_SPOTS).toHaveLength(37);
    expect(DOTS).toHaveLength(24);
    expect(ENTRIES).toHaveLength(42);
    expect(LINES).toHaveLength(21);
    // A corner dot has one way in, an edge dot two.
    expect(ENTRIES.filter(([dot]) => dot === "8,0")).toHaveLength(1);
    expect(ENTRIES.filter(([dot]) => dot === "6,0")).toHaveLength(2);
    // The line from the dot at 0,4 eastwards crosses the middle row.
    expect(lineFrom("0,4", [1, 0])).toEqual([
      "1,4",
      "2,4",
      "3,4",
      "4,4",
      "5,4",
      "6,4",
      "7,4",
    ]);
  });
});

describe("start", () => {
  it("puts three pieces each on alternating corners with twelve in reserve", () => {
    const state = newGame();
    expect(state.public.pieces).toEqual({
      "7,1": "WHITE",
      "7,4": "BLACK",
      "4,7": "WHITE",
      "1,7": "BLACK",
      "1,4": "WHITE",
      "4,1": "BLACK",
    });
    expect(state.public.players.map((p) => p.reserve)).toEqual([12, 12]);
    expect(state.public.activePlayer).toBe("a");
    expect(legalPushes(state)).toHaveLength(42);
  });
});

describe("pushing", () => {
  it("lands on the spot next to the dot and shoves the line along to the first gap", () => {
    const state = position({ "1,4": "BLACK", "2,4": "WHITE", "4,4": "BLACK" });
    expect(pushPiece(state, "0,4", "1,4").ok).toBe(true);
    expect(state.public.pieces).toEqual({
      "1,4": "WHITE",
      "2,4": "BLACK",
      "3,4": "WHITE",
      "4,4": "BLACK",
    });
    expect(state.public.lastMove).toEqual({
      from: "0,4",
      to: "1,4",
      shifted: ["2,4", "3,4"],
    });
    expect(state.public.players[0].reserve).toBe(11);
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.turn).toBe(2);
  });

  it("refuses a full line, a spot that is not next to the dot, and a push from a spot", () => {
    const full: { [c: string]: Side } = {};
    for (const c of lineFrom("0,4", [1, 0])) full[c] = "BLACK";
    const state = position(full);
    expect(pushPiece(state, "0,4", "1,4").ok).toBe(false);
    expect(pushPiece(state, "8,4", "7,4").ok).toBe(false);
    expect(pushPiece(state, "0,4", "2,4").ok).toBe(false);
    expect(pushPiece(state, "1,4", "2,4").ok).toBe(false);
    expect(legalPushes(state).some(([dot]) => dot === "0,4")).toBe(false);
  });
});

describe("rows", () => {
  it("takes four in a row and leaves pieces beyond a gap alone", () => {
    // White completes 1,4..4,4 by pushing in at 1,4; 5,4 stays empty, so 6,4 and 7,4 are not part of it.
    const state = position({
      "1,4": "WHITE",
      "2,4": "WHITE",
      "3,4": "WHITE",
      "6,4": "BLACK",
      "7,4": "BLACK",
    });
    expect(rows(state)).toEqual([]);
    expect(pushPiece(state, "0,4", "1,4").ok).toBe(true);
    expect(state.public.pieces).toEqual({ "6,4": "BLACK", "7,4": "BLACK" });
    expect(state.public.players[0].reserve).toBe(12 - 1 + 4);
    expect(state.public.players[0].captured).toBe(0);
    expect(state.public.lastMove?.removed?.sort()).toEqual([
      "1,4",
      "2,4",
      "3,4",
      "4,4",
    ]);
    expect(state.public.phase).toBe("MOVE");
    expect(state.public.activePlayer).toBe("b");
  });

  it("captures the other colour in the extension and takes it off the board for good", () => {
    const state = position({
      "2,4": "WHITE",
      "3,4": "WHITE",
      "4,4": "WHITE",
      "5,4": "BLACK",
      "6,4": "BLACK",
    });
    // Pushing in at 1,4 gives W W W W B B with no gap: all six come off.
    expect(pushPiece(state, "0,4", "1,4").ok).toBe(true);
    expect(state.public.pieces).toEqual({});
    expect(state.public.players[0].reserve).toBe(12 - 1 + 4);
    expect(state.public.players[0].captured).toBe(2);
    expect(state.public.lastMove?.removed).toHaveLength(6);
    expect(state.public.notification?.title).toMatch(
      /4 back to reserve, 2 captured/,
    );
  });

  it("gives the opponent the row the mover made for them", () => {
    // Shoving the line along leaves no row here: W B B B W.
    const state = position({
      "1,5": "BLACK",
      "2,5": "BLACK",
      "3,5": "BLACK",
      "4,5": "WHITE",
    });
    expect(pushPiece(state, "0,5", "1,5").ok).toBe(true);
    expect(rows(state)).toEqual([]);
    expect(state.public.activePlayer).toBe("b");

    // Down the column from the dot at 2,2: white's push shoves four blacks into a row of four.
    const again = position({
      "2,3": "BLACK",
      "2,4": "BLACK",
      "2,5": "BLACK",
      "2,6": "BLACK",
    });
    expect(pushPiece(again, "2,2", "2,3").ok).toBe(true);
    // Black takes 2,4..2,7 and the white piece at 2,3 in the extension.
    expect(again.public.pieces).toEqual({});
    expect(again.public.players[1].reserve).toBe(12 + 4);
    expect(again.public.players[1].captured).toBe(1);
    expect(again.public.players[0].reserve).toBe(11);
    expect(again.public.activePlayer).toBe("b");
    expect(again.public.phase).toBe("MOVE");
  });

  it("lets the owner choose between crossing rows", () => {
    // Two white rows crossing at 4,4: the middle row and the middle column.
    const state = position({
      "2,4": "WHITE",
      "3,4": "WHITE",
      "4,4": "WHITE",
      "5,4": "WHITE",
      "4,2": "WHITE",
      "4,3": "WHITE",
      "4,5": "WHITE",
    });
    // Any white push that does not touch these keeps both rows; push in at the far corner.
    expect(pushPiece(state, "8,0", "7,1").ok).toBe(true);
    expect(state.public.phase).toBe("REMOVE_ROW");
    expect(state.public.removing).toBe("a");
    expect(removeRow(state, "4,4").ok).toBe(false); // in both rows
    expect(removeRow(state, "2,4").ok).toBe(true); // the row along y = 4
    expect(state.public.pieces?.["4,2"]).toBe("WHITE");
    expect(state.public.pieces?.["3,4"]).toBeUndefined();
    // The column is now only three: nothing more to take.
    expect(state.public.phase).toBe("MOVE");
    expect(state.public.activePlayer).toBe("b");
  });
});

describe("end", () => {
  it("is lost by the player who must move with an empty reserve", () => {
    const state = newGame();
    state.public.players[1].reserve = 0;
    expect(pushPiece(state, "0,4", "1,4").ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
  });
});

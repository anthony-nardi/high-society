import { describe, expect, it } from "vitest";
import { ALL_POINTS, LINES, ray } from "../board";
import {
  buildYinshGameState,
  moveRing,
  movesFrom,
  placeRing,
  removeRing,
  removeRow,
  rows,
  rowWindows,
} from "../rules";
import { YinshGameState } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "yinsh" as const,
  }));

/** a is white and starts. */
const newGame = () => buildYinshGameState("lobby", lobby("a", "b"), () => 0);

function placed(): YinshGameState {
  const state = newGame();
  state.public.phase = "MOVE_RING";
  state.public.rings = {
    "5,5": "WHITE",
    "6,5": "WHITE",
    "3,3": "WHITE",
    "8,2": "WHITE",
    "2,8": "WHITE",
    "5,6": "BLACK",
    "4,5": "BLACK",
    "7,7": "BLACK",
    "9,1": "BLACK",
    "1,9": "BLACK",
  };
  return state;
}

describe("board", () => {
  it("has 85 points and lines along three axes", () => {
    expect(ALL_POINTS).toHaveLength(85);
    expect(new Set(ALL_POINTS).size).toBe(85);
    expect(ray("6,0", [0, 1])).toContain("6,4");
    const longest = Math.max(...LINES.map((l) => l.length));
    expect(longest).toBe(10);
    // Every point is on exactly one line per axis.
    for (const point of ALL_POINTS) {
      expect(LINES.filter((l) => l.includes(point))).toHaveLength(3);
    }
  });
});

describe("placing rings", () => {
  it("alternates ten placements then starts the moves with white", () => {
    const state = newGame();
    const spots = [
      "5,5",
      "5,6",
      "6,5",
      "4,5",
      "3,3",
      "7,7",
      "8,2",
      "9,1",
      "2,8",
      "1,9",
    ];
    spots.forEach((spot, i) => {
      expect(state.public.activePlayer).toBe(i % 2 === 0 ? "a" : "b");
      expect(placeRing(state, spot).ok).toBe(true);
    });
    expect(state.public.phase).toBe("MOVE_RING");
    expect(state.public.activePlayer).toBe("a");
    expect(placeRing(state, "0,6").ok).toBe(false);
  });

  it("refuses an occupied point", () => {
    const state = newGame();
    placeRing(state, "5,5");
    expect(placeRing(state, "5,5").ok).toBe(false);
  });
});

describe("moving rings", () => {
  it("slides over vacant points and stops after a run of markers", () => {
    const state = placed();
    state.public.markers = { "5,2": "BLACK", "5,3": "BLACK" };
    const targets = movesFrom(state, "5,5");
    expect(targets).toContain("5,4");
    expect(targets).toContain("5,1"); // first vacant after the two markers
    expect(targets).not.toContain("5,0"); // cannot go on after jumping
    expect(targets).not.toContain("5,6"); // a ring blocks
    expect(targets).not.toContain("7,5"); // not past the white ring at 6,5
    expect(targets).not.toContain("6,5");
  });

  it("leaves a marker, flips what it jumped, and passes the turn", () => {
    const state = placed();
    state.public.markers = { "5,3": "BLACK", "5,4": "WHITE" };
    expect(moveRing(state, "5,5", "5,2").ok).toBe(true);
    expect(state.public.rings["5,2"]).toBe("WHITE");
    expect(state.public.rings["5,5"]).toBeUndefined();
    expect(state.public.markers).toEqual({
      "5,5": "WHITE",
      "5,3": "WHITE",
      "5,4": "BLACK",
    });
    expect(state.public.pool).toBe(50);
    expect(state.public.activePlayer).toBe("b");
    expect(state.public.turn).toBe(2);
    expect(moveRing(state, "5,6", "5,7").ok).toBe(true);
    expect(state.public.activePlayer).toBe("a");
  });

  it("only moves your own rings", () => {
    const state = placed();
    expect(moveRing(state, "5,6", "5,7").ok).toBe(false);
  });
});

describe("rows", () => {
  it("finds runs of five of one colour on any axis", () => {
    const state = placed();
    state.public.markers = {
      "1,5": "WHITE",
      "2,5": "WHITE",
      "3,5": "WHITE",
      "4,5": "WHITE",
      "5,5": "WHITE",
      "7,5": "BLACK",
    };
    // 4,5 and 5,5 hold rings in `placed`, which do not count: clear them.
    state.public.rings = { "6,5": "WHITE", "7,7": "BLACK" };
    expect(rows(state)).toEqual([
      { side: "WHITE", cells: ["1,5", "2,5", "3,5", "4,5", "5,5"] },
    ]);
    expect(rowWindows(state, "WHITE")).toEqual([["1,5", "5,5"]]);
    expect(rowWindows(state, "BLACK")).toEqual([]);
  });

  it("offers every window of five in a longer run", () => {
    const state = placed();
    state.public.rings = {};
    state.public.markers = Object.fromEntries(
      ["1,5", "2,5", "3,5", "4,5", "5,5", "6,5"].map((c) => [c, "WHITE"]),
    );
    expect(rowWindows(state, "WHITE")).toEqual([
      ["1,5", "5,5"],
      ["2,5", "6,5"],
    ]);
  });

  it("makes the mover remove their row and a ring, then the opponent theirs", () => {
    const state = placed();
    // White completes 1,5..5,5 by moving the ring off 5,5 (leaving a white marker).
    state.public.rings = {
      "5,5": "WHITE",
      "3,3": "WHITE",
      "8,2": "WHITE",
      "2,8": "WHITE",
      "9,9": "WHITE",
      "7,7": "BLACK",
      "9,1": "BLACK",
      "1,9": "BLACK",
      "0,6": "BLACK",
      "4,10": "BLACK",
    };
    state.public.markers = {
      "1,5": "WHITE",
      "2,5": "WHITE",
      "3,5": "WHITE",
      "4,5": "WHITE",
      // A black row waiting to be completed by the flip of 5,7.
      "5,8": "BLACK",
      "5,9": "BLACK",
      "5,10": "BLACK",
      "4,10": "BLACK",
    };
    delete state.public.markers["4,10"]; // ring there
    state.public.markers["5,7"] = "WHITE";
    state.public.markers["5,6"] = "BLACK";
    // Move 5,5 -> 5,4? That leaves 5,5 white: row 1,5..5,5 complete.
    expect(moveRing(state, "5,5", "5,4").ok).toBe(true);
    expect(state.public.phase).toBe("REMOVE_ROW");
    expect(state.public.activePlayer).toBe("a");
    expect(removeRow(state, "1,5", "5,5").ok).toBe(true);
    expect(state.public.pool).toBe(50 + 5);
    expect(state.public.phase).toBe("REMOVE_RING");
    expect(removeRing(state, "7,7").ok).toBe(false); // not white
    expect(removeRing(state, "9,9").ok).toBe(true);
    expect(state.public.players[0].scored).toBe(1);
    // No black row (the black run is only four), so black moves next.
    expect(state.public.phase).toBe("MOVE_RING");
    expect(state.public.activePlayer).toBe("b");
  });

  it("gives the opponent their row after the mover's, then resumes with the opponent", () => {
    const state = placed();
    state.public.rings = {
      "5,5": "WHITE",
      "3,3": "WHITE",
      "8,2": "WHITE",
      "2,8": "WHITE",
      "9,9": "WHITE",
      "7,7": "BLACK",
      "9,1": "BLACK",
      "1,9": "BLACK",
      "0,6": "BLACK",
      "0,9": "BLACK",
    };
    // White will jump 5,4 (black) landing on 5,3, flipping 5,4 to white... that
    // gives white nothing. Instead: black row 0,7..4,7 completed by a flip.
    state.public.markers = {
      "0,7": "BLACK",
      "1,7": "BLACK",
      "2,7": "BLACK",
      "3,7": "BLACK",
      "4,7": "WHITE",
      "4,6": "BLACK",
    };
    // White ring 5,5 moves SW over 4,6 (black) and 4,7? Direction SW is (-1,+1):
    // 5,5 -> 4,6 (marker) -> 3,7 (marker) -> 2,8 is a white ring: blocked.
    // Use ring 2,8 moving NE (+1,-1): 2,8 -> 3,7 (marker) -> 4,6 (marker) -> 5,5 ring: blocked.
    // Simplest: ring at 5,5 moves E over nothing; set up a flip along SE.
    state.public.markers = {
      "4,7": "WHITE",
      "0,7": "BLACK",
      "1,7": "BLACK",
      "2,7": "BLACK",
      "3,7": "BLACK",
      "5,6": "WHITE",
    };
    state.public.rings["5,5"] = "WHITE";
    delete state.public.rings["3,3"];
    state.public.rings["4,8"] = "WHITE";
    // Ring 4,8 moves NW (0,-1): 4,8 -> 4,7 (white marker, flips to black) -> 4,6 vacant: lands.
    expect(moveRing(state, "4,8", "4,6").ok).toBe(true);
    expect(state.public.markers["4,7"]).toBe("BLACK");
    // White has no row; black has 0,7..4,7.
    expect(state.public.phase).toBe("REMOVE_ROW");
    expect(state.public.activePlayer).toBe("b");
    expect(removeRow(state, "0,7", "4,7").ok).toBe(true);
    expect(removeRing(state, "7,7").ok).toBe(true);
    expect(state.public.players[1].scored).toBe(1);
    // Play resumes with the player after the mover: black.
    expect(state.public.phase).toBe("MOVE_RING");
    expect(state.public.activePlayer).toBe("b");
  });

  it("ends the game on the third ring", () => {
    const state = placed();
    state.public.players[0].scored = 2;
    state.public.phase = "REMOVE_RING";
    state.public.removing = "a";
    state.public.mover = "a";
    expect(removeRing(state, "5,5").ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("a");
    expect(state.public.log).toEqual(state.private.log);
  });

  it("ends when the markers run out, most rings winning", () => {
    const state = placed();
    state.public.pool = 1;
    state.public.players[1].scored = 1;
    expect(moveRing(state, "5,5", "5,4").ok).toBe(true);
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("b");
  });
});

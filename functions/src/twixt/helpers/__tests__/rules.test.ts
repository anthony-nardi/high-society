import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import {
  buildTwixtGameState,
  connection,
  label,
  linksFor,
  placePeg,
  placementProblem,
  removeLink,
  swapSides,
} from "../rules";
import { crosses, holeOf, isHole, reach } from "../board";

const lobby = (...emails: string[]): PlayerInLobby[] =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "twixt",
  }));

/** a is Red and moves first. */
const fresh = () => buildTwixtGameState("l", lobby("a", "b"), () => 0);

describe("the board", () => {
  it("has 572 holes, knight's-move reach and crossing links", () => {
    let holes = 0;
    for (let h = 0; h < 576; h++) if (isHole(h)) holes++;
    expect(holes).toBe(572);
    expect(isHole(holeOf(0, 0))).toBe(false);
    expect(isHole(holeOf(23, 23))).toBe(false);
    expect(reach(holeOf(5, 5)).sort((x, y) => x - y)).toEqual(
      [
        holeOf(6, 7),
        holeOf(7, 6),
        holeOf(7, 4),
        holeOf(6, 3),
        holeOf(4, 3),
        holeOf(3, 4),
        holeOf(3, 6),
        holeOf(4, 7),
      ].sort((x, y) => x - y),
    );
    // (5,5)-(6,7) crosses (5,6)-(7,5)? No: but (5,5)-(7,6) crosses (6,5)-(5,7)... use a known pair.
    expect(
      crosses([holeOf(5, 5), holeOf(7, 6)], [holeOf(6, 5), holeOf(7, 7)]),
    ).toBe(true);
    expect(
      crosses([holeOf(5, 5), holeOf(7, 6)], [holeOf(5, 6), holeOf(7, 7)]),
    ).toBe(false);
    expect(
      crosses([holeOf(5, 5), holeOf(7, 6)], [holeOf(6, 6), holeOf(7, 4)]),
    ).toBe(true);
    expect(
      crosses([holeOf(5, 5), holeOf(7, 6)], [holeOf(7, 6), holeOf(9, 7)]),
    ).toBe(false);
    expect(label(holeOf(0, 0))).toBe("A1");
    expect(label(holeOf(23, 23))).toBe("X24");
  });
});

describe("placing pegs", () => {
  it("keeps each side out of the other's borders and links knight's moves without crossing", () => {
    const state = fresh();
    expect(state.public.activePlayer).toBe("a");
    expect(placementProblem(state, "RED", holeOf(0, 5))).toContain("border");
    expect(placementProblem(state, "RED", holeOf(5, 0))).toBeNull();
    expect(placePeg(state, holeOf(10, 10)).ok).toBe(true);
    expect(state.public.activePlayer).toBe("b");
    expect(placePeg(state, holeOf(10, 10)).ok).toBe(false);
    expect(placePeg(state, holeOf(10, 0)).ok).toBe(false); // Red's border
    expect(placePeg(state, holeOf(11, 12)).ok).toBe(true); // Black
    // Red pegs a knight's move from its first peg and links.
    expect(placePeg(state, holeOf(12, 11)).ok).toBe(true);
    expect(state.public.links).toEqual([[holeOf(10, 10), holeOf(12, 11)]]);
    // Black's (11,12)-(13,11)? That would cross Red's link? (11,12)-(12,10) does.
    expect(linksFor(state, "BLACK", holeOf(12, 10)).length).toBe(0);
    expect(placePeg(state, holeOf(12, 10)).ok).toBe(true);
    expect(state.public.links).toHaveLength(1);
  });

  it("offers the swap once, right after the first peg", () => {
    const state = fresh();
    expect(swapSides(state).ok).toBe(false);
    expect(placePeg(state, holeOf(12, 12)).ok).toBe(true);
    expect(swapSides(state).ok).toBe(true);
    expect(state.public.players[1].side).toBe("RED");
    expect(state.public.players[0].side).toBe("BLACK");
    // The first peg now belongs to b (Red); a moves next as Black.
    expect(state.public.activePlayer).toBe("a");
    expect(placePeg(state, holeOf(0, 5)).ok).toBe(true);
    expect(swapSides(state).ok).toBe(false);
  });

  it("wins when a chain joins the borders, and may drop its own links", () => {
    const state = fresh();
    // Red walks top to bottom in knight's moves: (10,0),(11,2),(10,4)...(11,22), then (13,23): 13 pegs.
    const path: number[] = [];
    for (let i = 0; i < 12; i++) path.push(holeOf(i % 2 ? 11 : 10, i * 2));
    path.push(holeOf(13, 23));
    // Black answers far away.
    for (let i = 0; i < path.length; i++) {
      expect(placePeg(state, path[i]).ok).toBe(true);
      if (state.public.status === "GAME_OVER") break;
      expect(placePeg(state, holeOf(20, 3 + i)).ok).toBe(true);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBe("a");
    expect(state.public.winningPath).toEqual(path);
    expect(connection(state, "BLACK")).toBeNull();

    const again = fresh();
    expect(placePeg(again, holeOf(10, 10)).ok).toBe(true);
    expect(placePeg(again, holeOf(2, 2)).ok).toBe(true);
    expect(placePeg(again, holeOf(12, 11)).ok).toBe(true);
    expect(placePeg(again, holeOf(2, 4)).ok).toBe(true);
    expect(removeLink(again, [holeOf(2, 2), holeOf(2, 4)]).ok).toBe(false);
    expect(removeLink(again, [holeOf(12, 11), holeOf(10, 10)]).ok).toBe(true);
    expect(again.public.links).toBeUndefined();
    expect(again.public.activePlayer).toBe("a");
  });
});

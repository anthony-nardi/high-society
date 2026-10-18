import { describe, expect, it } from "vitest";
import {
  appraiseHuts,
  destinationsOf,
  EPOCHS,
  movableFrom,
  neighbours,
  preview,
  TERRITORIES,
} from "../board";
import { ClansGameState } from "../types";

function state(huts: { [t: number]: { [c: string]: number } }): ClansGameState {
  return {
    id: "l",
    game: "clans",
    players: [
      { email: "a", lastActionAt: 0, isBot: false, colour: "RED", chips: 0 },
      { email: "b", lastActionAt: 0, isBot: true, colour: "BLUE", chips: 0 },
    ],
    activePlayer: "a",
    startAt: "0",
    status: "IN_PROGRESS",
    huts: Object.fromEntries(Object.entries(huts).map(([t, h]) => [t, h])),
    scores: { RED: 0, BLUE: 0, YELLOW: 0, GREEN: 0, BLACK: 0 },
    turn: 1,
  } as ClansGameState;
}

describe("clans helpers", () => {
  it("knows the board and lists moves like the server", () => {
    expect(TERRITORIES).toHaveLength(60);
    const t = 30;
    const [n1, n2] = neighbours(t);
    const s = state({ [t]: { RED: 2 }, [n1]: { BLUE: 1 }, [n2]: { GREEN: 7 } });
    expect(movableFrom(s).sort()).toEqual([n1, t].sort());
    expect(destinationsOf(s, t).sort()).toEqual([n1, n2].sort());
  });

  it("previews the villages a move would found", () => {
    const t = 30;
    const [n1] = neighbours(t);
    const s = state({ [t]: { RED: 2 }, [n1]: { BLUE: 1 } });
    const founded = preview(s, t, n1);
    expect(founded).toHaveLength(1);
    const chart = EPOCHS[0];
    const v = founded[0];
    expect(v.territory).toBe(n1);
    if (!v.destroyed)
      expect(v.points).toBe(
        3 + (chart.favoured === v.terrain ? chart.bonus : 0),
      );
    const strife = appraiseHuts(
      5,
      { RED: 2, BLUE: 1, YELLOW: 1, GREEN: 1, BLACK: 3 },
      11,
    );
    expect(strife.strife).toBe(true);
    expect(strife.colours.sort()).toEqual(["BLACK", "RED"]);
    expect(strife.points).toBe(5);
  });
});

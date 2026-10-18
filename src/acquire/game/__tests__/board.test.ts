import { describe, expect, it } from "vitest";
import { ALL_TILES, analyse, bonuses, canDeclare, priceOf } from "../board";
import { AcquireGameState } from "../types";
import { CHAINS } from "../board";

const state = (over: Partial<AcquireGameState> = {}): AcquireGameState => ({
  id: "l",
  game: "acquire",
  players: [
    {
      email: "a",
      lastActionAt: 0,
      money: 6000,
      isBot: false,
      stocks: { LUXOR: 3 },
    },
    {
      email: "b",
      lastActionAt: 0,
      money: 6000,
      isBot: true,
      stocks: { LUXOR: 1 },
    },
    {
      email: "c",
      lastActionAt: 0,
      money: 6000,
      isBot: true,
      stocks: { LUXOR: 1 },
    },
  ],
  activePlayer: "a",
  turnPlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  phase: "PLACE",
  chains: Object.fromEntries(
    CHAINS.map((c) => [c, { size: 0, stockLeft: 25 }]),
  ) as AcquireGameState["chains"],
  mode: "CLASSIC",
  bought: 0,
  bagCount: 90,
  turn: 1,
  ...over,
});

describe("acquire board helpers", () => {
  it("knows the board, prices, placements, bonuses and the end condition", () => {
    expect(ALL_TILES).toHaveLength(108);
    expect(priceOf("CONTINENTAL", 11)).toBe(900);
    const s = state({ board: { "1A": "LUXOR", "2A": "LUXOR", "4A": "NONE" } });
    s.chains.LUXOR.size = 2;
    expect(analyse(s, "3A")).toEqual({ kind: "extend", chain: "LUXOR" });
    expect(analyse(s, "5A")).toEqual({ kind: "found" });
    expect(analyse(s, "9I")).toEqual({ kind: "lone" });
    // Luxor at 2 is $200: a 2,000 majority, b and c split the 1,000 minority.
    expect(bonuses(s, "LUXOR")).toEqual([
      ["a", 2000],
      ["b", 500],
      ["c", 500],
    ]);
    // Tycoon: b and c split the secondary and tertiary, 1,500 + 1,000.
    s.mode = "TYCOON";
    expect(bonuses(s, "LUXOR")).toEqual([
      ["a", 2000],
      ["b", 1300],
      ["c", 1300],
    ]);
    expect(canDeclare(s)).toBe(false);
    s.chains.LUXOR.size = 11;
    expect(canDeclare(s)).toBe(true);
  });
});

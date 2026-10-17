import { describe, expect, it } from "vitest";
import {
  bustChance,
  chipPoints,
  pileSize,
  stealsOnStop,
  valuesAtRisk,
} from "../odds";
import { FamilyIncGameState } from "../types";

const state = (): FamilyIncGameState => ({
  id: "l",
  game: "family-inc",
  players: [
    { email: "a", lastActionAt: 0, score: 0, diamonds: 0, held: { "4": 1, "7": 1 }, isBot: false },
    { email: "b", lastActionAt: 0, score: 0, diamonds: 0, held: { "4": 2, "9": 1 }, isBot: false },
    { email: "c", lastActionAt: 0, score: 0, diamonds: 0, held: { "7": 3 }, isBot: true },
  ],
  activePlayer: "a",
  startAt: "0",
  status: "IN_PROGRESS",
  pile: { "1": 10, "4": 5, "7": 5 },
  drawnThisTurn: ["4", "7"],
  turn: 1,
});

describe("odds", () => {
  it("counts the pile and points", () => {
    expect(pileSize(state().pile)).toBe(20);
    expect(chipPoints({ "4": 2, "9": 1 })).toBe(17);
  });

  it("works out the bust chance from the pile", () => {
    expect(bustChance(state().pile, { "4": 1, "7": 1 })).toBe(10 / 20);
    expect(bustChance(state().pile, undefined)).toBe(0);
  });

  it("lists what a stop would steal", () => {
    const { steals, points } = stealsOnStop(state(), "a");
    expect(steals).toEqual([
      { from: "b", value: "4", n: 2 },
      { from: "c", value: "7", n: 3 },
    ]);
    expect(points).toBe(8 + 21);
  });

  it("flags values at risk from the active player", () => {
    expect(valuesAtRisk(state(), "b")).toEqual(["4"]);
    expect(valuesAtRisk(state(), "c")).toEqual(["7"]);
    expect(valuesAtRisk(state(), "a")).toEqual([]);
  });
});

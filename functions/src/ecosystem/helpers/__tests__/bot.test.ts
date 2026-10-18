import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../high-society/helpers", () => ({
  wait: vi.fn().mockResolvedValue(undefined),
}));

import { PlayerInLobby } from "../../../shared/types";
import { buildEcosystemGameState, isGameOver } from "../rules";
import { takeBotTurn } from "../bot";
import { chooseBotMove, turnMoves } from "../botSearch";

const lobby = (count: number): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: `Bot #${i + 1}`,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "ecosystem",
  }));

describe("the bot", () => {
  it("puts a bee by a meadow", () => {
    const state = buildEcosystemGameState("l", lobby(3), () => 0);
    const me = state.public.players[0];
    me.grid = { "0_0": "MEADOW", "0_1": "MEADOW" };
    me.hand = ["WOLF", "BEE", "TROUT"];
    const move = chooseBotMove(state);
    expect(move?.card).toBe(1);
    expect([`${move?.row}_${move?.col}`]).toContain(
      ["1_0", "1_1", "-1_0", "-1_1", "0_2", "0_-1"].find(
        (c) => c === `${move?.row}_${move?.col}`,
      ),
    );
  });

  it("plays whole games through at every seat count", () => {
    for (const count of [2, 3, 4, 5, 6]) {
      const state = buildEcosystemGameState("l", lobby(count), () => 0.29);
      let steps = 0;
      while (!isGameOver(state) && steps < 200) {
        expect(turnMoves(state).length).toBeGreaterThan(0);
        takeBotTurn(state);
        steps++;
      }
      expect(isGameOver(state)).toBe(true);
      expect(state.public.results?.length).toBe(count);
      for (const p of state.public.players)
        expect(Object.keys(p.grid || {})).toHaveLength(20);
    }
  }, 60000);
});

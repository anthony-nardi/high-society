import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../high-society/helpers", () => ({
  wait: vi.fn().mockResolvedValue(undefined),
}));

import { PlayerInLobby } from "../../../shared/types";
import { buildClansGameState, isGameOver } from "../rules";
import { takeBotTurn } from "../bot";
import { chooseBotMove, foundsVillage, turnMoves } from "../botSearch";
import { neighbours } from "../board";

const lobby = (count: number): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: `Bot #${i + 1}`,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "clans",
  }));

describe("the bot", () => {
  it("takes a village for its own clan when one is there to take", () => {
    const state = buildClansGameState("l", lobby(3), () => 0);
    const me = state.public.players[0].colour;
    const t = 30;
    const n = neighbours(t)[0];
    state.public.huts = { [String(t)]: { [me]: 3 }, [String(n)]: { [me]: 1 } };
    state.public.activePlayer = "Bot #1";
    const move = chooseBotMove(state);
    expect(move).toBeTruthy();
    expect(foundsVillage(state, move!)).toBe(true);
  });

  it("plays whole games through at every seat count", () => {
    for (const count of [2, 3, 4]) {
      const state = buildClansGameState("l", lobby(count), () => 0.37);
      let steps = 0;
      while (!isGameOver(state) && steps < 400) {
        expect(turnMoves(state).length).toBeGreaterThan(0);
        takeBotTurn(state);
        steps++;
      }
      expect(isGameOver(state)).toBe(true);
      expect(state.public.results?.length).toBe(count);
    }
  }, 120000);
});

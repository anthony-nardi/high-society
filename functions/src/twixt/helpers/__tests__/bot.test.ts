import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../high-society/helpers", () => ({
  wait: vi.fn().mockResolvedValue(undefined),
}));

import { PlayerInLobby } from "../../../shared/types";
import { buildTwixtGameState, isGameOver, placePeg } from "../rules";
import { takeBotTurn } from "../bot";
import { chooseBotMove, distance } from "../botSearch";
import { holeOf } from "../board";

const lobby = (count: number): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: `Bot #${i + 1}`,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "twixt",
  }));

describe("the bot", () => {
  it("measures the pegs each side still needs", () => {
    const state = buildTwixtGameState("l", lobby(2), () => 0);
    // An empty board: thirteen pegs top to bottom in knight's moves.
    expect(distance(state, "RED")).toBe(13);
    expect(distance(state, "BLACK")).toBe(13);
    state.public.pegs = { [String(holeOf(10, 10))]: "RED" };
    expect(distance(state, "RED")).toBe(12);
  });

  it("finishes a chain when one peg wins", () => {
    const state = buildTwixtGameState("l", lobby(2), () => 0);
    const red = state.public.players.find((p) => p.side === "RED")!;
    state.public.activePlayer = red.email;
    for (let i = 0; i < 12; i++) {
      state.public.pegs = {
        ...(state.public.pegs || {}),
        [String(holeOf(i % 2 ? 11 : 10, i * 2))]: "RED",
      };
    }
    // Links come from placing; rebuild them by re-placing the last peg through the rules.
    const pegs = state.public.pegs;
    state.public.pegs = {};
    for (const [h] of Object.entries(pegs)) {
      state.public.activePlayer = red.email;
      expect(placePeg(state, Number(h)).ok).toBe(true);
      state.public.activePlayer = red.email;
    }
    const move = chooseBotMove(state);
    expect(move).toEqual({ kind: "peg", hole: holeOf(13, 23) });
  });

  it("plays whole games through", () => {
    const state = buildTwixtGameState("l", lobby(2), () => 0.3);
    let steps = 0;
    while (!isGameOver(state) && steps < 400) {
      takeBotTurn(state);
      steps++;
    }
    expect(isGameOver(state)).toBe(true);
    expect(state.public.winner || state.public.draw).toBeTruthy();
  }, 120000);
});

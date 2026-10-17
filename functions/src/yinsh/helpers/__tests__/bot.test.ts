import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  shuffle: () => undefined,
  updatePlayerLastAction: () => undefined,
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import { chooseBotMove, evaluate, turnMoves } from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { buildYinshGameState } from "../rules";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "yinsh" as const,
  }));

const search = { timeoutMs: 150, depth: 2 };

describe("placement", () => {
  it("puts rings near the middle", () => {
    const state = buildYinshGameState("l", lobby("Bot #1", "a"), () => 0);
    const move = chooseBotMove(state, search);
    expect(move?.kind).toBe("place");
    if (move?.kind === "place")
      expect(["5,5", "4,5", "5,4", "4,6", "6,4", "5,6", "6,5"]).toContain(
        move.coord,
      );
  });
});

describe("evaluation", () => {
  it("counts scored rings above everything", () => {
    const state = buildYinshGameState("l", lobby("Bot #1", "a"), () => 0);
    state.public.players[0].scored = 1;
    expect(evaluate(state, "Bot #1")).toBeGreaterThan(500);
    expect(evaluate(state, "a")).toBeLessThan(-500);
  });
});

describe("chooseBotMove", () => {
  it("completes a row of five when it can", () => {
    const state = buildYinshGameState("l", lobby("Bot #1", "a"), () => 0);
    state.public.phase = "MOVE_RING";
    state.public.rings = {
      "5,5": "WHITE",
      "8,2": "WHITE",
      "2,8": "WHITE",
      "9,9": "WHITE",
      "3,2": "WHITE",
      "7,7": "BLACK",
      "9,1": "BLACK",
      "1,9": "BLACK",
      "0,6": "BLACK",
      "0,9": "BLACK",
    };
    state.public.markers = {
      "1,5": "WHITE",
      "2,5": "WHITE",
      "3,5": "WHITE",
      "4,5": "WHITE",
    };
    const move = chooseBotMove(state, search);
    // Moving the ring off 5,5 leaves a white marker there and completes the row.
    expect(move).toMatchObject({ kind: "move", from: "5,5" });
    expect(turnMoves(state).length).toBeGreaterThan(10);
  });

  it("plays a whole game of bots to the end", async () => {
    const state = buildYinshGameState("l", lobby("Bot #1", "Bot #2"), () => 0);
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 600) {
      await maybeTakeBotTurn(state, {
        minimumTurnMs: 0,
        search: { timeoutMs: 40, depth: 2 },
      });
      steps++;
      const rings = Object.keys(state.public.rings || {}).length;
      const scored = state.public.players.reduce((s, p) => s + p.scored, 0);
      if (state.public.phase !== "PLACE_RINGS") expect(rings + scored).toBe(10);
      const markers = Object.keys(state.public.markers || {}).length;
      expect(markers + state.public.pool).toBe(51);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner || state.public.draw).toBeTruthy();
  }, 180_000);
});

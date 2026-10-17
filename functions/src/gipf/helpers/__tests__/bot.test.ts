import { describe, expect, it, vi } from "vitest";
import { buildGipfGameState, piecesOf } from "../rules";
import { chooseBotMove, evaluate, turnMoves } from "../botSearch";
import { maybeTakeBotTurn } from "../bot";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "gipf" as const,
  }));

const search = { timeoutMs: 150, depth: 2 };

describe("evaluation", () => {
  it("values reserve and material", () => {
    const state = buildGipfGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.players[0].reserve = 14;
    state.public.players[1].reserve = 10;
    expect(evaluate(state, "Bot #1")).toBeGreaterThan(0);
    expect(evaluate(state, "b")).toBeLessThan(0);
  });
});

describe("chooseBotMove", () => {
  it("completes a row of four when it can", () => {
    const state = buildGipfGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.pieces = {
      "2,4": "WHITE",
      "3,4": "WHITE",
      "4,4": "WHITE",
      "7,1": "BLACK",
      "1,7": "BLACK",
    };
    const move = chooseBotMove(state, search);
    // Any entry onto 1,4 completes 1,4..4,4.
    expect(move).toMatchObject({ kind: "push", to: "1,4" });
    expect(turnMoves(state).length).toBeGreaterThan(30);
  });

  it("plays a whole game of bots to the end", async () => {
    const state = buildGipfGameState("l", lobby("Bot #1", "Bot #2"), () => 0);
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 400) {
      await maybeTakeBotTurn(state, {
        minimumTurnMs: 0,
        search: { timeoutMs: 40, depth: 2 },
      });
      steps++;
      for (const p of state.public.players) {
        expect(p.reserve).toBeGreaterThanOrEqual(0);
        // Nothing is ever created: reserve + on board + lost to the opponent = 15.
        const opp = state.public.players.find((o) => o !== p)!;
        expect(p.reserve + piecesOf(state, p.side) + opp.captured).toBe(15);
      }
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBeTruthy();
  }, 180_000);
});

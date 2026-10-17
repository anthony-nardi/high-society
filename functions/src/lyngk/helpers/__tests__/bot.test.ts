import { describe, expect, it, vi } from "vitest";
import { buildLyngkGameState } from "../rules";
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
    gameName: "lyngk" as const,
  }));

const search = { timeoutMs: 150, depth: 2 };

describe("evaluation", () => {
  it("counts scored fives above everything and values tall owned stacks", () => {
    const state = buildLyngkGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.players[0].scored = 1;
    expect(evaluate(state, "Bot #1")).toBeGreaterThan(30);
    expect(evaluate(state, "b")).toBeLessThan(-30);
  });
});

describe("chooseBotMove", () => {
  it("considers claiming and finishes a five when it can", () => {
    const state = buildLyngkGameState("l", lobby("Bot #1", "b"), () => 0);
    state.public.players[0].colours = ["RED"];
    state.public.stacks = {
      "0,4": ["RED"],
      "1,4": ["BLUE", "GREEN", "BLACK", "IVORY"],
      "3,0": ["GREEN"],
      "2,8": ["BLACK"],
    };
    expect(turnMoves(state).some((m) => m.claim)).toBe(true);
    const move = chooseBotMove(state, search);
    expect(move?.path).toEqual(["0,4", "1,4"]);
  });

  it("plays a whole game of bots to the end", async () => {
    const state = buildLyngkGameState(
      "l",
      lobby("Bot #1", "Bot #2"),
      () => 0.37,
    );
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 300) {
      await maybeTakeBotTurn(state, {
        minimumTurnMs: 0,
        search: { timeoutMs: 40, depth: 1 },
      });
      steps++;
      // Pieces are only ever stacked or scored, never lost.
      const onBoard = Object.values(state.public.stacks || {}).reduce(
        (s, st) => s + st.length,
        0,
      );
      const scored = state.public.players.reduce((s, p) => s + p.scored, 0) * 5;
      expect(onBoard + scored).toBe(43);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner || state.public.draw).toBeTruthy();
    for (const p of state.public.players)
      expect(p.colours?.length ?? 0).toBeLessThanOrEqual(2);
  }, 180_000);
});

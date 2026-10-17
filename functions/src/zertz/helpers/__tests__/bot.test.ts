import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  shuffle: () => undefined,
  updatePlayerLastAction: (player: { lastActionAt: number }) => {
    player.lastActionAt = Date.now();
  },
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import { chooseBotMove, evaluate, turnMoves, winProgress } from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { buildZertzGameState } from "../rules";
import { ALL_RINGS } from "../board";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "zertz" as const,
  }));

const search = { timeoutMs: 150, depth: 2 };

describe("move generation", () => {
  it("offers placements with a few ring removals each at the start", () => {
    const state = buildZertzGameState("l", lobby("Bot #1", "a"), () => 0);
    const moves = turnMoves(state);
    expect(moves.length).toBeGreaterThan(100);
    expect(moves.every((m) => m.kind === "place")).toBe(true);
    const first = moves[0];
    expect(first.kind === "place" && first.remove).toBeTruthy();
  });

  it("offers only capture chains when a capture is available", () => {
    const state = buildZertzGameState("l", lobby("Bot #1", "a"), () => 0);
    state.public.marbles = { "1,3": "BLACK", "2,3": "WHITE", "4,3": "WHITE" };
    const moves = turnMoves(state);
    expect(moves.every((m) => m.kind === "capture")).toBe(true);
    // The two-jump chain exists.
    expect(
      moves.some(
        (m) =>
          m.kind === "capture" &&
          m.jumps.length === 2 &&
          m.jumps[1][1] === "5,3",
      ),
    ).toBe(true);
  });
});

describe("evaluation", () => {
  it("measures progress towards any win", () => {
    expect(winProgress({ WHITE: 2 })).toBe(0.5);
    expect(winProgress({ WHITE: 2, GRAY: 2, BLACK: 2 })).toBeCloseTo(2 / 3);
    expect(winProgress({ BLACK: 6 })).toBe(1);
  });

  it("prefers more and scarcer marbles", () => {
    const state = buildZertzGameState("l", lobby("Bot #1", "a"), () => 0);
    state.public.players[0].captured = { WHITE: 2 };
    state.public.players[1].captured = { BLACK: 2 };
    expect(evaluate(state, "Bot #1")).toBeGreaterThan(0);
  });
});

describe("chooseBotMove", () => {
  it("takes the capture chain that wins", () => {
    const state = buildZertzGameState("l", lobby("Bot #1", "a"), () => 0);
    state.public.players[0].captured = { WHITE: 2 };
    // Jumping 1,3 -> 3,3 -> 5,3 takes two whites and wins with four.
    state.public.marbles = {
      "1,3": "BLACK",
      "2,3": "WHITE",
      "4,3": "WHITE",
      "6,3": "GRAY",
    };
    const move = chooseBotMove(state, search);
    expect(move?.kind).toBe("capture");
    expect(move && move.kind === "capture" ? move.jumps.length : 0).toBe(2);
  });

  it("does not hand the opponent a capture when it can avoid it", () => {
    const state = buildZertzGameState("l", lobby("Bot #1", "a"), () => 0);
    state.public.marbles = { "4,3": "WHITE" };
    state.public.rings = ALL_RINGS.filter((r) => r !== "4,0");
    const move = chooseBotMove(state, search);
    expect(move?.kind).toBe("place");
    if (move?.kind === "place") {
      // Placing next to the lone white would give a an immediate capture.
      expect(["3,3", "5,3", "4,2", "5,2", "3,4", "4,4"]).not.toContain(move.to);
    }
  });

  it("plays a whole game of bots to a winner", async () => {
    const state = buildZertzGameState("l", lobby("Bot #1", "Bot #2"), () => 0);
    let turns = 0;
    while (state.public.status !== "GAME_OVER" && turns < 300) {
      await maybeTakeBotTurn(state, {
        minimumTurnMs: 0,
        search: { timeoutMs: 40, depth: 2 },
      });
      turns++;
      expect(state.public.phase).toBe("MOVE");
      // Marbles are conserved between pool, board and captures.
      const onBoard = Object.keys(state.public.marbles || {}).length;
      const inPool = Object.values(state.public.pool).reduce(
        (a, b) => a + b,
        0,
      );
      const captured = state.public.players.reduce(
        (sum, p) =>
          sum + Object.values(p.captured || {}).reduce((a, b) => a + b, 0),
        0,
      );
      expect(onBoard + inPool + captured).toBe(24);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner).toBeDefined();
    expect(turns).toBeLessThan(300);
  }, 120_000);
});

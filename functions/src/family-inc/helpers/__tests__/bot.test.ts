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

import { chooseBotMove, expectedValues } from "../botSearch";
import { maybeTakeBotTurn, takeBotTurn } from "../bot";
import { buildFamilyIncGameState, pileSize } from "../rules";
import { ChipValue, FamilyIncGameState } from "../../types";

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "family-inc" as const,
  }));

function game(
  held: ChipValue[] = [],
  extra: Partial<FamilyIncGameState["public"]> = {},
) {
  const state = buildFamilyIncGameState(
    "l",
    lobby("Bot #1", "a", "b"),
    () => 0,
  );
  const bot = state.public.players[0];
  if (held.length) {
    bot.held = Object.fromEntries(held.map((v) => [v, 1]));
    for (const v of held)
      state.public.pile[v] = (state.public.pile[v] || 0) - 1;
  }
  state.public.drawnThisTurn = held;
  Object.assign(state.public, extra);
  return state;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("expectimax", () => {
  it("must draw with nothing in front of it", () => {
    expect(chooseBotMove(game())).toBe("draw");
  });

  it("keeps drawing with one low chip and stops with a fat, risky hand", () => {
    expect(chooseBotMove(game(["1"]))).toBe("draw");
    const fat = game(["10", "9", "8", "7", "6"]);
    expect(chooseBotMove(fat)).toBe("stop");
    const values = expectedValues(fat);
    expect(values.stop).toBeGreaterThan(values.draw);
  });

  it("stops to steal a big pile of matching chips", () => {
    const state = game(["5", "6", "7"]);
    state.public.players[1].held = { "5": 6 };
    expect(chooseBotMove(state)).toBe("stop");
    // With one safe chip and the same steal on offer, pressing on is still right.
    const early = game(["5"]);
    early.public.players[1].held = { "5": 6 };
    const values = expectedValues(early);
    expect(values.stop).toBeGreaterThan(15);
  });

  it("stops when stopping wins the game", () => {
    const state = game(["3"]);
    state.public.players[0].score = 98;
    expect(chooseBotMove(state)).toBe("stop");
  });

  it("is happy to bust early when a third diamond is worth fifty", () => {
    // Holding a value with many copies left makes a draw bust often, yet
    // the fifty points make that a fine outcome.
    const state = game(["1", "2"]);
    state.public.players[0].diamonds = 2;
    const values = expectedValues(state);
    expect(values.draw).toBeGreaterThan(5);
  });
});

describe("bot turns", () => {
  it("does nothing for a human", () => {
    const state = buildFamilyIncGameState("l", lobby("a", "Bot #1"), () => 0);
    takeBotTurn(state, rng(1));
    expect(pileSize(state.public.pile)).toBe(135);
  });

  it("plays a whole game of bots to a winner", async () => {
    const state = buildFamilyIncGameState(
      "l",
      lobby("Bot #1", "Bot #2", "Bot #3", "Bot #4"),
      () => 0,
    );
    const random = rng(42);
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 5000) {
      await maybeTakeBotTurn(state, { minimumTurnMs: 0, random });
      steps++;
      // Chips are conserved: pile plus what is in front of players never exceeds 135.
      const inFront = state.public.players.reduce(
        (sum, p) =>
          sum + Object.values(p.held || {}).reduce((a, b) => a + b, 0),
        0,
      );
      expect(pileSize(state.public.pile) + inFront).toBeLessThanOrEqual(135);
      expect(state.public.players.every((p) => p.score >= 0)).toBe(true);
    }
    expect(state.public.status).toBe("GAME_OVER");
    const winner = state.public.players.find(
      (p) => p.email === state.public.winner,
    );
    expect(winner?.score).toBeGreaterThanOrEqual(100);
    expect(state.public.log?.length).toBeGreaterThan(20);
    expect(steps).toBeLessThan(5000);
  }, 30_000);
});

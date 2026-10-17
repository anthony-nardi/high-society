import { describe, expect, it, vi } from "vitest";
import { buildShangriLaGameState, scoreOf } from "../rules";
import { chooseBotMove, evaluate, turnMoves } from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { MASTERS } from "../board";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "shangri-la" as const,
  }));

const search = { timeoutMs: 150, depth: 2 };

describe("setup policy", () => {
  it("spreads its first masters over different, well-connected villages", () => {
    const state = buildShangriLaGameState(
      "l",
      lobby("Bot #1", "Bot #2", "Bot #3"),
      () => 0,
    );
    const picked = new Set<number>();
    for (let i = 0; i < 3; i++) {
      const move = chooseBotMove(state, search);
      expect(move?.kind).toBe("setup");
      if (move?.kind !== "setup") return;
      picked.add(move.village);
      state.public.villages[move.village].spaces = {
        [move.type]: { owner: "Bot #1" },
      };
      state.public.players[0].placed = [
        ...(state.public.players[0].placed || []),
        move.type,
      ];
    }
    expect(picked.size).toBe(3);
  });
});

describe("play", () => {
  it("prefers a journey that makes masters", () => {
    const state = buildShangriLaGameState(
      "l",
      lobby("Bot #1", "b", "c"),
      () => 0,
    );
    state.public.phase = "PLAY";
    for (const p of state.public.players) p.placed = [...MASTERS];
    state.public.villages[0].spaces = {
      HEALER: { owner: "Bot #1", student: true },
      PRIEST: { owner: "Bot #1", student: true },
      RAINMAKER: { owner: "b" },
    };
    state.public.villages[1].spaces = { ASTROLOGER: { owner: "c" } };
    const moves = turnMoves(state);
    expect(moves.some((m) => m.kind === "journey")).toBe(true);
    const move = chooseBotMove(state, search);
    expect(move?.kind).toBe("journey");
    const before = evaluate(state)[0];
    expect(before).toBeGreaterThan(0);
  });

  it("plays four bots to the end with every tile accounted for", async () => {
    const state = buildShangriLaGameState(
      "l",
      lobby("Bot #1", "Bot #2", "Bot #3", "Bot #4"),
      () => 0.4,
    );
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 3000) {
      await maybeTakeBotTurn(state, {
        minimumTurnMs: 0,
        search: { timeoutMs: 25, depth: 1 },
      });
      steps++;
      for (const p of state.public.players) {
        const onBoard = state.public.villages.reduce(
          (n, v) =>
            n +
            Object.values(v.spaces || {})
              .filter((s) => s.owner === p.email)
              .reduce((m, s) => m + 1 + (s.student ? 1 : 0), 0),
          0,
        );
        const supply = Object.values(p.supply).reduce((s, n) => s + n, 0);
        expect(onBoard + supply).toBe(42);
      }
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.bridges?.length ?? 0).toBeLessThanOrEqual(23);
    expect(state.public.winner || state.public.draw).toBeTruthy();
    expect(
      state.public.players.some((p) => scoreOf(state, p.email).masters > 0),
    ).toBe(true);
  }, 240_000);
});

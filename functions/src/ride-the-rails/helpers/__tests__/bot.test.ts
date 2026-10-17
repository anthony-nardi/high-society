import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../high-society/helpers", () => ({
  wait: vi.fn().mockResolvedValue(undefined),
}));

import { PlayerInLobby } from "../../../shared/types";
import { buildRideTheRailsGameState, isGameOver } from "../rules";
import { takeBotTurn } from "../bot";
import { chooseBotMove, journeys, turnMoves } from "../botSearch";
import { CHICAGO, hexIndex } from "../board";

const lobby = (count: number): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: `Bot #${i + 1}`,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "ride-the-rails",
  }));

const BOSTON = hexIndex(19, 3);
const NEW_YORK = hexIndex(19, 4);
const PHILADELPHIA = hexIndex(18, 4);

describe("the bot", () => {
  it("takes a share, lays track and carries a passenger", () => {
    const state = buildRideTheRailsGameState("l", lobby(3), () => 0.3);
    takeBotTurn(state);
    expect(state.public.turn).toBe(2);
    const taken = state.public.players.find((p) => p.shares);
    expect(taken).toBeDefined();
    while (state.public.phase === "SHARE") takeBotTurn(state);
    expect(state.public.phase).toBe("BUILD");
    takeBotTurn(state);
    expect(Object.keys(state.public.track || {}).length).toBe(1);
  });

  it("prefers the journey that pays itself and starves the others", () => {
    const state = buildRideTheRailsGameState("l", lobby(3), () => 0);
    state.public.phase = "RIDE";
    state.public.seat = 0;
    state.public.activePlayer = state.public.order[0];
    const me = state.public.players.find(
      (p) => p.email === state.public.order[0],
    )!;
    const rival = state.public.players.find(
      (p) => p.email === state.public.order[1],
    )!;
    me.shares = { RED: 2 };
    rival.shares = { BLUE: 3 };
    state.public.track = {
      RED: [BOSTON, NEW_YORK],
      BLUE: [NEW_YORK, PHILADELPHIA],
    };
    expect(journeys(state).length).toBeGreaterThan(2);
    const move = chooseBotMove(state);
    expect(move?.kind).toBe("ride");
    if (move?.kind === "ride")
      expect(move.journey.legs.every((l) => l.railroad === "RED")).toBe(true);
  });

  it("goes for Chicago when Orange opens", () => {
    const state = buildRideTheRailsGameState("l", lobby(3), () => 0);
    state.public.round = 2;
    state.public.phase = "BUILD";
    state.public.seat = 0;
    state.public.activePlayer = state.public.order[0];
    const me = state.public.players.find(
      (p) => p.email === state.public.order[0],
    )!;
    me.shares = { ORANGE: 1 };
    const move = chooseBotMove(state);
    expect(move).toEqual({ kind: "build", railroad: "ORANGE", hex: CHICAGO });
  });

  it("lists every legal move and plays whole games through", () => {
    for (const count of [3, 4, 5]) {
      const state = buildRideTheRailsGameState("l", lobby(count), () => 0.5);
      let steps = 0;
      while (!isGameOver(state) && steps < 2000) {
        expect(turnMoves(state).length).toBeGreaterThan(0);
        takeBotTurn(state);
        steps++;
      }
      expect(isGameOver(state)).toBe(true);
      expect(state.public.round).toBe(6);
      const total = state.public.players.reduce((n, p) => n + p.money, 0);
      expect(total).toBeGreaterThan(0);
    }
  }, 60000);
});

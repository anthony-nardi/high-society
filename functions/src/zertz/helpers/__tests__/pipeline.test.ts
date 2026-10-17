import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/helpers", () => ({
  shuffle: () => undefined,
  updatePlayerLastAction: () => undefined,
  updateGameState: vi.fn().mockResolvedValue(undefined),
  getGameName: vi.fn(),
  createGame: vi.fn(),
}));

import zertz from "../../module";
import { playBots } from "../../../shared/game";
import { buildZertzGameState } from "../rules";

const lobby = [
  {
    email: "human",
    ready: true,
    joinedAt: "0",
    isBot: false,
    gameName: "zertz" as const,
  },
  {
    email: "Bot #1",
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "zertz" as const,
  },
];

describe("capture chains through the module pipeline", () => {
  it("keeps the turn with the human between jumps and lets the bot move after", async () => {
    const state = buildZertzGameState("l", lobby, () => 0);
    state.public.marbles = { "1,3": "BLACK", "2,3": "WHITE", "4,3": "WHITE" };

    expect(
      zertz.actions.captureMarble(state, { from: "1,3", to: "3,3" }).ok,
    ).toBe(true);
    await playBots(zertz, state);
    expect(state.public.phase).toBe("CONTINUE_CAPTURE");
    expect(state.public.capturingAt).toBe("3,3");
    expect(state.public.activePlayer).toBe("human");

    expect(
      zertz.actions.captureMarble(state, { from: "3,3", to: "5,3" }).ok,
    ).toBe(true);
    expect(state.public.activePlayer).toBe("Bot #1");
    await playBots(zertz, state);
    expect(state.public.activePlayer).toBe("human");
    expect(state.public.players[0].captured).toEqual({ WHITE: 2 });
  });
});

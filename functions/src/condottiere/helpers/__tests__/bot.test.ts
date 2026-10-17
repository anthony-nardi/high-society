import { describe, expect, it, vi } from "vitest";
import { buildCondottiereGameState, chooseBattlefield } from "../rules";
import { chooseBattleMove, chooseRegion, regionValue } from "../botSearch";
import { maybeTakeBotTurn } from "../bot";
import { fullDeck } from "../board";
import { Card } from "../../types";

vi.mock("../../../shared/helpers", () => ({
  updateGameState: vi.fn().mockResolvedValue(undefined),
}));

const lobby = (...emails: string[]) =>
  emails.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "condottiere" as const,
  }));

function battle(hands: { [email: string]: Card[] }, region = 7) {
  const state = buildCondottiereGameState(
    "l",
    lobby(...Object.keys(hands)),
    () => 0,
  );
  for (const p of state.public.players) p.hand = [...hands[p.email]];
  state.public.condottiere = Object.keys(hands)[0];
  state.public.activePlayer = state.public.condottiere;
  chooseBattlefield(state, region);
  return state;
}

describe("judgement", () => {
  it("values a region that joins its own, and one that would hand a rival the game", () => {
    const state = buildCondottiereGameState(
      "l",
      lobby("Bot #1", "b", "c", "d"),
      () => 0,
    );
    state.public.players[0].regions = [0];
    state.public.players[1].regions = [14, 15]; // Spoleto and Roma
    expect(regionValue(state, "Bot #1", 1)).toBeGreaterThan(
      regionValue(state, "Bot #1", 2),
    );
    // Napoli would give b three adjacent with Roma and Spoleto: worth denying.
    expect(regionValue(state, "Bot #1", 16)).toBeGreaterThan(
      regionValue(state, "Bot #1", 2),
    );
    // Any region that would complete b's three: Firenze, Urbino, Siena, Ancona or Napoli.
    expect([10, 11, 12, 13, 16]).toContain(chooseRegion(state, "Bot #1"));
  });

  it("plays the cheapest card that takes the lead, and passes when already safe", () => {
    const state = battle({
      "Bot #1": ["M1", "M3", "M6"],
      b: ["M2"],
      c: ["M1"],
    });
    // b leads with 2 after Bot #1 opens? Bot #1 opens: nothing on the table, plays its cheapest.
    const first = chooseBattleMove(state);
    expect(first.kind).toBe("play");
    state.public.players[1].line = ["M2"];
    state.public.players[1].passed = true;
    state.public.players[2].passed = true;
    state.public.players[0].line = ["M3"];
    // Ahead with nobody left to answer: pass.
    expect(chooseBattleMove(state)).toEqual({ kind: "pass" });
  });

  it("plays five bots to the end", async () => {
    const state = buildCondottiereGameState(
      "l",
      lobby("Bot #1", "Bot #2", "Bot #3", "Bot #4", "Bot #5"),
      () => 0.41,
    );
    let steps = 0;
    while (state.public.status !== "GAME_OVER" && steps < 5000) {
      await maybeTakeBotTurn(state, { minimumTurnMs: 0 });
      steps++;
      const cards =
        (state.private.deck || []).length +
        (state.private.discard || []).length +
        state.public.players.reduce(
          (s, p) => s + (p.hand || []).length + (p.line || []).length,
          0,
        );
      expect(cards).toBe(fullDeck().length);
    }
    expect(state.public.status).toBe("GAME_OVER");
    expect(state.public.winner || state.public.draw).toBeTruthy();
  }, 120_000);
});

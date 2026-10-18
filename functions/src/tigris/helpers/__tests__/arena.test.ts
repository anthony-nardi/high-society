import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { buildTigrisGameState, isGameOver } from "../rules";
import { takeBotTurn } from "../bot";

/*
 * Bots against bots, to the end: run with ARENA=1 to see how long the
 * judgement takes and how games end. Skipped in the ordinary suite.
 */

const lobby = (count: number): PlayerInLobby[] =>
  Array.from({ length: count }, (_, i) => ({
    email: `Bot #${i + 1}`,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "tigris",
  }));

describe.skipIf(!process.env.ARENA)("arena", () => {
  it("plays three-bot games to the end", () => {
    for (let game = 0; game < 2; game++) {
      const state = buildTigrisGameState("arena", lobby(3));
      let decisions = 0;
      let slowest = 0;
      const started = Date.now();
      while (!isGameOver(state) && decisions < 2000) {
        const t = Date.now();
        takeBotTurn(state);
        slowest = Math.max(slowest, Date.now() - t);
        decisions++;
      }
      const seconds = (Date.now() - started) / 1000;
      appendFileSync(
        process.env.ARENA_LOG || "arena-tigris.log",
        `game ${game + 1}: ${decisions} decisions, ${state.public.turn} turns, ${seconds.toFixed(1)}s, slowest ${slowest}ms, ` +
          `${state.public.notification?.title} ${state.public.notification?.message ?? ""} ` +
          state.public.players
            .map(
              (p) =>
                `${p.email}: ${Object.values(p.points).join("/")} +${p.treasures}`,
            )
            .join(" | ") +
          String.fromCharCode(10),
      );
      expect(isGameOver(state)).toBe(true);
    }
  }, 600_000);
});

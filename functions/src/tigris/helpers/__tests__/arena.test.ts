import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { TigrisGameState } from "../../types";
import { buildTigrisGameState, isGameOver } from "../rules";
import { applyMove, chooseMove } from "../botSearch";
import {
  applyMove as legacyApply,
  chooseMove as legacyChoose,
} from "./legacyBot";

/*
 * Self-play: the current bot against the one first shipped, rotating
 * seats. Run with ARENA=1; skipped in the ordinary suite because it plays
 * whole games. Figures go to arena-tigris.log.
 */

const lobby = (names: string[]): PlayerInLobby[] =>
  names.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "tigris",
  }));

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function play(seed: number, names: string[], fresh: Set<string>) {
  const state: TigrisGameState = buildTigrisGameState(
    `arena-${seed}`,
    lobby(names),
    rng(seed),
  );
  let decisions = 0;
  let slowest = 0;
  const started = Date.now();
  while (!isGameOver(state) && decisions < 3000) {
    const email = state.public.activePlayer;
    const t = Date.now();
    if (fresh.has(email)) {
      const move = chooseMove(state);
      if (!move || !applyMove(state, move)?.ok) break;
    } else {
      const move = legacyChoose(state);
      if (!move || !legacyApply(state, move)?.ok) break;
    }
    slowest = Math.max(slowest, Date.now() - t);
    decisions++;
  }
  return {
    state,
    decisions,
    slowest,
    seconds: (Date.now() - started) / 1000,
  };
}

describe.skipIf(!process.env.ARENA)("arena", () => {
  it("pits the current bot against the first one", () => {
    const log = process.env.ARENA_LOG || "arena-tigris.log";
    const names = ["A", "B", "C"];
    const games = Number(process.env.ARENA_GAMES || 6);
    let freshWins = 0;
    for (let seed = 1; seed <= games; seed++) {
      const fresh = new Set([names[seed % 3]]);
      const { state, decisions, slowest, seconds } = play(seed, names, fresh);
      const winners = state.public.winners || [];
      const freshWon = winners.some((w) => fresh.has(w));
      if (freshWon) freshWins += 1 / winners.length;
      appendFileSync(
        log,
        `seed ${seed}: fresh=${[...fresh].join("")} winners=${winners.join(",")} ` +
          `${state.public.turn} turns ${decisions} decisions ${seconds.toFixed(1)}s slowest ${slowest}ms ` +
          `${state.public.notification?.message ?? ""} ` +
          state.public.players
            .map(
              (p) =>
                `${p.email}:${Object.values(p.points).join("/")}+${p.treasures}`,
            )
            .join(" ") +
          String.fromCharCode(10),
      );
      expect(isGameOver(state)).toBe(true);
    }
    appendFileSync(
      log,
      `fresh bot won ${freshWins} of ${games} three-seat games (one seat in three)` +
        String.fromCharCode(10),
    );
  }, 1_800_000);
});

import { describe, expect, it } from "vitest";
import { buildAcquireGameState, getActivePlayer } from "../rules";
import { takeBotStep } from "../botSearch";
import { takeBotStep as legacyStep } from "./legacyBot";
import { AcquireGameState, Mode } from "../../types";

/*
 * Self-play: the current bot against the previous one, two seats each,
 * in both modes. Run with ARENA=1 to see the figures; it is skipped in
 * the ordinary suite because it plays dozens of whole games.
 */

const lobby = (names: string[]) =>
  names.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: "acquire" as const,
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

function play(seed: number, mode: Mode, newSeats: Set<string>) {
  const names = ["A", "B", "C", "D"];
  const state: AcquireGameState = buildAcquireGameState(
    `arena-${seed}`,
    lobby(names),
    rng(seed),
    { mode },
  );
  let steps = 0;
  while (state.public.status !== "GAME_OVER" && steps++ < 4000) {
    const who = getActivePlayer(state)?.email ?? "";
    if (newSeats.has(who)) takeBotStep(state);
    else legacyStep(state);
  }
  const best = Math.max(...state.public.players.map((p) => p.money));
  const winners = state.public.players.filter((p) => p.money === best);
  process.stdout.write(
    `  game ${seed} ${mode}: ${steps} steps, ${state.public.notification?.message ?? state.public.notification?.title}
`,
  );
  return {
    winners: winners.map((w) => w.email),
    players: state.public.players,
  };
}

const run = process.env.ARENA ? describe : describe.skip;

run("arena: new bot against the old one", () => {
  for (const mode of ["TYCOON", "CLASSIC"] as Mode[]) {
    it(`wins more often than it loses in ${mode} mode`, () => {
      let newWins = 0;
      let oldWins = 0;
      let newMoney = 0;
      let oldMoney = 0;
      const games = 24;
      for (let seed = 1; seed <= games; seed++) {
        // Alternate which seats the new bot takes so seating evens out.
        const seats = seed % 2 ? new Set(["A", "C"]) : new Set(["B", "D"]);
        const { winners, players } = play(seed, mode, seats);
        for (const w of winners) {
          if (seats.has(w)) newWins += 1 / winners.length;
          else oldWins += 1 / winners.length;
        }
        for (const p of players) {
          if (seats.has(p.email)) newMoney += p.money;
          else oldMoney += p.money;
        }
      }
      process.stdout.write(
        `${mode}: new ${newWins.toFixed(1)} wins, old ${oldWins.toFixed(1)}; average cash new $${Math.round(newMoney / (games * 2))}, old $${Math.round(oldMoney / (games * 2))}
`,
      );
      expect(newWins).toBeGreaterThan(oldWins);
    }, 600000);
  }
});

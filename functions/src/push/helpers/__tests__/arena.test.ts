import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { PushGameState } from "../../types";
import {
  buildPushGameState,
  drawCard,
  placeCard,
  scoreOf,
  takeColumn,
} from "../rules";
import { placements, points } from "../board";
import { takeBotTurn } from "../bot";

/*
 * Arena: the judgement bot against simple rivals, to check it is worth
 * its salt. Run with ARENA=1; the ordinary suite plays twenty games.
 */

const GAMES = process.env.ARENA ? Number(process.env.ARENA_GAMES || 60) : 20;

const lobby = (names: string[]): PlayerInLobby[] =>
  names.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "push",
  }));

/**
 * A cautious rival: draws until a column is worth eight or three cards
 * are out, places where it fits first, never protects, and chooses the
 * most valuable column.
 */
function cautious(state: PushGameState, random: () => number) {
  const pub = state.public;
  const columns = pub.columns || [];
  const best = () => {
    let i = 0;
    columns.forEach((c, j) => {
      if (points(c) > points(columns[i])) i = j;
    });
    return i;
  };
  if (pub.phase === "CHOOSE") {
    takeColumn(state, best(), random);
    return;
  }
  if (pub.pending) {
    placeCard(state, placements(columns, pub.pending)[0]);
    return;
  }
  const total = columns.reduce((s, c) => s + c.length, 0);
  if (
    columns.length &&
    (points(columns[best()]) >= 8 || total >= 4 || !pub.deckCount)
  ) {
    takeColumn(state, best(), random);
    return;
  }
  drawCard(state, random);
}

function play(seats: string[], seed: number) {
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const state = buildPushGameState("arena", lobby(seats), random);
  let guard = 0;
  while (state.public.status === "IN_PROGRESS" && guard++ < 5000) {
    const active = state.public.players.find(
      (p) => p.email === state.public.activePlayer,
    )!;
    if (active.isBot) takeBotTurn(state, random);
    else cautious(state, random);
  }
  return state;
}

describe("the bot in the arena", () => {
  it("beats cautious rivals over many games", () => {
    const wins: { [email: string]: number } = {};
    const score: { [email: string]: number } = {};
    for (let g = 0; g < GAMES; g++) {
      const seats =
        g % 2
          ? ["Bot #1", "cautious1", "cautious2"]
          : ["cautious1", "Bot #1", "cautious2", "cautious3"];
      const state = play(seats, 29 + g);
      expect(state.public.status).toBe("GAME_OVER");
      for (const w of state.public.winners || [])
        wins[w] = (wins[w] || 0) + 1 / (state.public.winners || []).length;
      for (const p of state.public.players)
        score[p.email] = (score[p.email] || 0) + scoreOf(p);
    }
    if (process.env.ARENA)
      appendFileSync("arena.log", JSON.stringify({ wins, score }) + "\n");
    // A fair share of three- and four-player games would be under a third.
    expect(wins["Bot #1"] || 0).toBeGreaterThan(GAMES * 0.3);
  });
});

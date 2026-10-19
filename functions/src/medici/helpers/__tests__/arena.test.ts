import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../../../shared/types";
import { MediciGameState } from "../../types";
import {
  bid,
  buildMediciGameState,
  canBid,
  drawCard,
  freeSpace,
  mayDraw,
  offerLot,
  pass,
} from "../rules";
import { takeBotTurn } from "../bot";
import { applyMove, chooseBotMove, TUNING } from "../botSearch";
import { shipValue } from "../board";

/*
 * Arena: the judgement bot against simple rivals, to check it is worth
 * its salt. Run with ARENA=1; the ordinary suite plays a handful of games.
 */

const GAMES = process.env.ARENA ? Number(process.env.ARENA_GAMES || 60) : 20;

const lobby = (names: string[]): PlayerInLobby[] =>
  names.map((email) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: email.startsWith("Bot"),
    gameName: "medici",
  }));

/** Draws the biggest lot allowed and bids a florin more whenever the lot fits and is worth more than that. */
function greedy(state: MediciGameState) {
  const pub = state.public;
  const me = pub.players.find((p) => p.email === pub.activePlayer)!;
  if (pub.phase === "DRAW") {
    if (mayDraw(state)) drawCard(state);
    else offerLot(state);
    return;
  }
  const lot = pub.lot || [];
  const floor = (pub.highBid || 0) + 1;
  if (
    canBid(state, me) &&
    lot.length <= freeSpace(state, me) &&
    shipValue(lot) * 2 >= floor &&
    floor <= me.money
  )
    bid(state, floor);
  else pass(state);
}

/** A judgement bot with its own dials, standing in for a rival of another temper. */
function judge(state: MediciGameState, random: () => number) {
  const tuning = { ...TUNING, ...JSON.parse(process.env.RIVAL || "{}") };
  applyMove(state, chooseBotMove(state, random, tuning));
}

function play(seats: string[], seed: number) {
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const state = buildMediciGameState("arena", lobby(seats), random);
  let guard = 0;
  while (state.public.status === "IN_PROGRESS" && guard++ < 2000) {
    const active = state.public.players.find(
      (p) => p.email === state.public.activePlayer,
    )!;
    if (active.isBot) takeBotTurn(state, random);
    else if (process.env.RIVAL) judge(state, random);
    else greedy(state);
  }
  return state;
}

describe("the bot in the arena", () => {
  it("beats greedy bidders over many games", () => {
    if (process.env.TUNING)
      Object.assign(TUNING, JSON.parse(process.env.TUNING));
    const wins: { [email: string]: number } = {};
    const money: { [email: string]: number } = {};
    for (let g = 0; g < GAMES; g++) {
      const seats =
        g % 2
          ? ["Bot #1", "greedy1", "greedy2"]
          : ["greedy1", "Bot #1", "greedy2", "greedy3"];
      const state = play(seats, 17 + g);
      expect(state.public.status).toBe("GAME_OVER");
      for (const w of state.public.winners || [])
        wins[w] = (wins[w] || 0) + 1 / (state.public.winners || []).length;
      for (const p of state.public.players)
        money[p.email] = (money[p.email] || 0) + p.money;
    }
    if (process.env.ARENA)
      appendFileSync(
        "arena.log",
        JSON.stringify({
          tuning: process.env.TUNING,
          rival: process.env.RIVAL,
          wins,
          money,
        }) + "\n",
      );
    // A fair share of three- and four-player games would be under a third.
    expect(wins["Bot #1"] || 0).toBeGreaterThan(GAMES * 0.3);
  });
});

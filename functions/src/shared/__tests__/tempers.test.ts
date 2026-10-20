import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlayerInLobby } from "../types";
import { buildMediciGameState } from "../../medici/helpers/rules";
import { takeBotTurn as mediciTurn } from "../../medici/helpers/bot";
import { buildPushGameState } from "../../push/helpers/rules";
import { takeBotTurn as pushTurn } from "../../push/helpers/bot";
import { PushGameState } from "../../push/types";
import { MediciGameState } from "../../medici/types";

/*
 * Do the tempers show in play? Three bots of different temper sit at the
 * same table many times; the cautious one should pay least per lot and
 * bust least, the reckless one most. Run with ARENA=1 for the numbers.
 */

const GAMES = process.env.ARENA ? Number(process.env.ARENA_GAMES || 60) : 12;

const SEATS: [string, string][] = [
  ["Bot #1", "carla"],
  ["Bot #2", "sam"],
  ["Bot #3", "rita"],
];

const lobby = (game: "medici" | "push"): PlayerInLobby[] =>
  SEATS.map(([email, persona]) => ({
    email,
    ready: true,
    joinedAt: "0",
    isBot: true,
    gameName: game,
    persona,
  }));

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe("bot tempers", () => {
  it("make the cautious bot pay less per lot in Medici than the reckless one", () => {
    const paid: { [email: string]: number } = {};
    const lots: { [email: string]: number } = {};
    for (let g = 0; g < GAMES; g++) {
      const random = rng(101 + g);
      const state = buildMediciGameState("t", lobby("medici"), random);
      for (const p of state.public.players)
        p.persona = SEATS.find(([e]) => e === p.email)?.[1];
      let guard = 0;
      while (state.public.status === "IN_PROGRESS" && guard++ < 3000) {
        const before = state.public.turn;
        mediciTurn(state as MediciGameState, random);
        const last = state.public.lastAuction;
        if (last && last.email && last.amount && state.public.turn !== before) {
          paid[last.email] = (paid[last.email] || 0) + last.amount;
          lots[last.email] = (lots[last.email] || 0) + 1;
        }
      }
    }
    const perLot = Object.fromEntries(
      SEATS.map(([e]) => [e, lots[e] ? paid[e] / lots[e] : 0]),
    );
    if (process.env.ARENA)
      appendFileSync(
        "tempers.log",
        JSON.stringify({ medici: perLot, lots }) + "\n",
      );
    expect(perLot["Bot #1"]).toBeLessThan(perLot["Bot #3"]);
  });

  it("make the reckless bot draw more and bust more in PUSH than the cautious one", () => {
    const drawn: { [email: string]: number } = {};
    const busts: { [email: string]: number } = {};
    const turns: { [email: string]: number } = {};
    for (let g = 0; g < GAMES; g++) {
      const random = rng(202 + g);
      const state = buildPushGameState("t", lobby("push"), random);
      for (const p of state.public.players)
        p.persona = SEATS.find(([e]) => e === p.email)?.[1];
      let guard = 0;
      let lastTurn = -1;
      while (state.public.status === "IN_PROGRESS" && guard++ < 6000) {
        const pub = state.public;
        if (pub.turn !== lastTurn) {
          lastTurn = pub.turn;
          turns[pub.turnPlayer] = (turns[pub.turnPlayer] || 0) + 1;
        }
        const drawnBefore = pub.drawn;
        const bustsBefore =
          pub.lastRoll?.reason === "BUST" ? pub.lastRoll.turn : -1;
        pushTurn(state as PushGameState, random);
        if (pub.drawn > drawnBefore && pub.phase === "PUSH")
          drawn[pub.turnPlayer] = (drawn[pub.turnPlayer] || 0) + 1;
        if (
          pub.lastRoll?.reason === "BUST" &&
          pub.lastRoll.turn !== bustsBefore &&
          pub.lastRoll.turn === pub.turn
        )
          busts[pub.lastRoll.email] = (busts[pub.lastRoll.email] || 0) + 1;
      }
    }
    const perTurn = Object.fromEntries(
      SEATS.map(([e]) => [
        e,
        {
          draws: (drawn[e] || 0) / (turns[e] || 1),
          busts: (busts[e] || 0) / (turns[e] || 1),
        },
      ]),
    );
    if (process.env.ARENA)
      appendFileSync("tempers.log", JSON.stringify({ push: perTurn }) + "\n");
    expect(perTurn["Bot #3"].draws).toBeGreaterThan(perTurn["Bot #1"].draws);
  });
});

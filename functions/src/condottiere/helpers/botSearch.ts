import { Card, CondottiereGameState, CondottierePlayerState } from "../types";
import {
  isMercenary,
  largestConnected,
  mercenaryValue,
  neighbours,
  REGIONS,
} from "./board";
import {
  battlefields,
  controllerOf,
  getActivePlayer,
  popeTargets,
  strengthOf,
  totals,
} from "./rules";

/*
 * Bot decision making for Condottiere. Hidden hands and bluffing make a
 * search a poor fit, so the bot plays by judgement: how much a region is
 * worth to it, how the battle stands, and which card changes it most for
 * the least.
 */

export type BotMove =
  | { kind: "choose"; region: number }
  | { kind: "play"; index: number; target?: number }
  | { kind: "pass" };

/** How much a region is worth to a player: adjacency to their own, and denial of a rival close to winning. */
export function regionValue(
  gameState: CondottiereGameState,
  email: string,
  region: number,
) {
  const me = gameState.public.players.find(
    (p) => p.email === email,
  ) as CondottierePlayerState;
  const mine = me.regions || [];
  const withIt = [...mine, region];
  let value = 1;
  if (largestConnected(withIt) > largestConnected(mine)) value += 2;
  if (
    largestConnected(withIt) >= gameState.public.winAdjacent ||
    withIt.length >= gameState.public.winTotal
  )
    value += 10;
  for (const p of gameState.public.players) {
    if (p.email === email) continue;
    const theirs = p.regions || [];
    const theirsWithIt = [...theirs, region];
    if (
      largestConnected(theirsWithIt) >= gameState.public.winAdjacent ||
      theirsWithIt.length >= gameState.public.winTotal
    )
      value += 6;
    else if (neighbours(region).some((n) => theirs.includes(n))) value += 1;
  }
  return value;
}

export function chooseRegion(
  gameState: CondottiereGameState,
  email: string,
): number {
  const options = battlefields(gameState);
  return options.reduce(
    (best, r) =>
      regionValue(gameState, email, r) > regionValue(gameState, email, best)
        ? r
        : best,
    options[0],
  );
}

/** A hand's fighting power: mercenaries at face value plus the heroines. */
function handPower(hand: Card[]) {
  return hand.reduce(
    (s, c) =>
      s + (isMercenary(c) ? mercenaryValue(c) : c === "HEROINE" ? 10 : 0),
    0,
  );
}

/** The bot's move in a battle: a card index with any target, or a pass. */
export function chooseBattleMove(gameState: CondottiereGameState): BotMove {
  const me = getActivePlayer(gameState) as CondottierePlayerState;
  const hand = me.hand || [];
  if (!hand.length) return { kind: "pass" };
  const region = gameState.public.battlefield as number;
  const value = regionValue(gameState, me.email, region);
  const season = gameState.public.season;
  const all = totals(gameState);
  const mine = strengthOf(me.line, season);
  const rivals = all.filter((t) => t.email !== me.email);
  const bestRival = Math.max(0, ...rivals.map((t) => t.strength));
  const rivalsIn = gameState.public.players.filter(
    (p) => p.email !== me.email && !p.passed && (p.hand || []).length > 0,
  );
  const leading = mine > bestRival;

  // Already ahead with nobody left to answer: stop spending.
  if (leading && rivalsIn.length === 0) return { kind: "pass" };

  const indexOf = (card: Card) => hand.findIndex((c) => c === card);
  const committed = (me.line || []).length;
  // How much the bot is willing to commit: more for valuable regions, less when its hand is thin.
  const budget = value * 4 + (committed ? 4 : 0);
  const spent = handPower(me.line || []);

  // Surrender while ahead locks in the win.
  if (leading && indexOf("SURRENDER") >= 0)
    return { kind: "play", index: indexOf("SURRENDER") };

  if (!leading) {
    const gap = bestRival - mine;
    // Winter flattens a rival's big cards when ours are small.
    if (indexOf("WINTER") >= 0 && season !== "WINTER") {
      const after = Math.max(
        0,
        ...rivals.map((t) => {
          const p = gameState.public.players.find(
            (x) => x.email === t.email,
          ) as CondottierePlayerState;
          return strengthOf(p.line, "WINTER");
        }),
      );
      if (strengthOf(me.line, "WINTER") >= after && gap > 3)
        return { kind: "play", index: indexOf("WINTER") };
    }
    // A Bishop removes the biggest mercenaries on the table when they are not ours.
    if (indexOf("BISHOP") >= 0) {
      let top = 0;
      for (const p of gameState.public.players)
        for (const c of p.line || []) top = Math.max(top, mercenaryValue(c));
      const myTop = Math.max(0, ...(me.line || []).map(mercenaryValue));
      if (top > 0 && myTop < top && gap >= top) {
        const targets = popeTargets(gameState);
        // Park the Pope on the region a rival wants most.
        let pope: number | undefined;
        let popeValue = -1;
        for (const r of targets) {
          const v = Math.max(
            ...gameState.public.players
              .filter((p) => p.email !== me.email)
              .map((p) => regionValue(gameState, p.email, r)),
          );
          if (v > popeValue) {
            popeValue = v;
            pope = r;
          }
        }
        return { kind: "play", index: indexOf("BISHOP"), target: pope };
      }
    }
    if (spent + gap > budget) return { kind: "pass" };
    // Spring when our strongest cards would gain the most.
    if (
      indexOf("SPRING") >= 0 &&
      season !== "SPRING" &&
      strengthOf(me.line, "SPRING") > bestRival
    )
      return { kind: "play", index: indexOf("SPRING") };
    // A Drummer doubles a line already worth something.
    if (
      indexOf("DRUMMER") >= 0 &&
      !(me.line || []).includes("DRUMMER") &&
      (me.line || []).filter(isMercenary).length >= 2
    ) {
      const line = [...(me.line || []), "DRUMMER" as Card];
      if (strengthOf(line, season) > bestRival)
        return { kind: "play", index: indexOf("DRUMMER") };
    }
    // The cheapest mercenary that takes the lead, else the biggest we have if the region matters.
    const mercs = hand
      .map((c, i) => ({
        c,
        i,
        v: isMercenary(c)
          ? season === "WINTER"
            ? 1
            : mercenaryValue(c)
          : c === "HEROINE"
            ? 10
            : 0,
      }))
      .filter((m) => m.v > 0)
      .sort((a, b) => a.v - b.v);
    const drummer = (me.line || []).includes("DRUMMER");
    const enough = mercs.find(
      (m) => mine + (drummer && isMercenary(m.c) ? m.v * 2 : m.v) > bestRival,
    );
    if (enough) return { kind: "play", index: enough.i };
    if (mercs.length && value >= 3 && spent < budget)
      return { kind: "play", index: mercs[mercs.length - 1].i };
    return { kind: "pass" };
  }

  // Leading with rivals still in: add a courtesan to claim the token, otherwise hold.
  if (indexOf("COURTESAN") >= 0) {
    const myCourtesans = (me.line || []).filter(
      (c) => c === "COURTESAN",
    ).length;
    const theirs = Math.max(
      0,
      ...gameState.public.players
        .filter((p) => p.email !== me.email)
        .map((p) => (p.line || []).filter((c) => c === "COURTESAN").length),
    );
    if (myCourtesans <= theirs)
      return { kind: "play", index: indexOf("COURTESAN") };
  }
  return { kind: "pass" };
}

export function chooseBotMove(gameState: CondottiereGameState): BotMove | null {
  const player = getActivePlayer(gameState);
  if (!player) return null;
  if (gameState.public.phase === "CHOOSE") {
    const region = chooseRegion(gameState, player.email);
    return region === undefined ? null : { kind: "choose", region };
  }
  return chooseBattleMove(gameState);
}

export const describeRegion = (region: number) =>
  REGIONS[region]?.name ?? String(region);
export { controllerOf };

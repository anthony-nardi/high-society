import { Journey, Railroad, RideTheRailsGameState } from "../types";
import {
  CITIES,
  distance,
  isCity,
  isMountain,
  OPENS,
  RAILROADS,
  ROUNDS,
} from "./board";
import {
  buildTrack,
  endBuild,
  getActivePlayer,
  hasRoom,
  legalPlacements,
  linksFrom,
  openRailroads,
  payoutsFor,
  ride,
  sharesOf,
  takeShare,
  traceJourney,
  trackOf,
} from "./rules";

/*
 * The bot's judgement: a share by how much the railroad will pay, track
 * by the links and bonuses it earns, and a journey by what it pays the
 * rider less what it hands the others. Everything here is pure.
 */

export type BotMove =
  | { kind: "share"; railroad: Railroad }
  | { kind: "build"; railroad: Railroad; hex: number }
  | { kind: "end" }
  | { kind: "ride"; journey: Journey };

const MAX_LEGS = 8;
const MAX_JOURNEYS = 2500;

/** Every link of a railroad, counted once per pair of cities. */
export function linkCount(
  gameState: RideTheRailsGameState,
  railroad: Railroad,
) {
  let n = 0;
  for (const city of CITIES) {
    if (!trackOf(gameState, railroad).includes(city)) continue;
    n += linksFrom(gameState, railroad, city).filter((l) => l.to > city).length;
  }
  return n;
}

/** Every journey worth considering, from every waiting passenger. */
export function journeys(gameState: RideTheRailsGameState): Journey[] {
  const out: Journey[] = [];
  const passengers = gameState.public.passengers || [];
  for (const start of passengers) {
    const used = new Set<number>([start]);
    const legs: Journey["legs"] = [];
    const walk = (at: number) => {
      if (out.length >= MAX_JOURNEYS || legs.length >= MAX_LEGS) return;
      for (const railroad of RAILROADS) {
        for (const link of linksFrom(gameState, railroad, at, used)) {
          legs.push({ railroad, to: link.to });
          for (const h of link.path) used.add(h);
          out.push({ start, legs: legs.map((l) => ({ ...l })) });
          walk(link.to);
          for (const h of link.path) used.delete(h);
          legs.pop();
        }
      }
    };
    walk(start);
  }
  return out;
}

/** Every move open to the active player (journeys capped). */
export function turnMoves(gameState: RideTheRailsGameState): BotMove[] {
  const player = getActivePlayer(gameState);
  if (!player || gameState.public.status !== "IN_PROGRESS") return [];
  switch (gameState.public.phase) {
    case "SHARE":
      return openRailroads(gameState)
        .filter((r) => gameState.public.supply[r] > 0)
        .map((railroad) => ({ kind: "share", railroad }));
    case "BUILD":
      return [
        ...legalPlacements(gameState, player).map(
          ({ railroad, hex }) => ({ kind: "build", railroad, hex }) as BotMove,
        ),
        { kind: "end" },
      ];
    case "RIDE":
      return journeys(gameState).map((journey) => ({ kind: "ride", journey }));
    default:
      return [];
  }
}

export function applyMove(gameState: RideTheRailsGameState, move: BotMove) {
  switch (move.kind) {
    case "share":
      return takeShare(gameState, move.railroad);
    case "build":
      return buildTrack(gameState, move.railroad, move.hex);
    case "end":
      return endBuild(gameState);
    case "ride":
      return ride(gameState, move.journey);
    default:
      return { ok: false as const, reason: "Unknown move." };
  }
}

const roundsLeft = (gameState: RideTheRailsGameState) =>
  ROUNDS - gameState.public.round + 1;

function shareScore(gameState: RideTheRailsGameState, railroad: Railroad) {
  const me = getActivePlayer(gameState);
  if (!me) return 0;
  const pub = gameState.public;
  const others = pub.players
    .filter((p) => p.email !== me.email)
    .reduce((n, p) => n + sharesOf(p, railroad), 0);
  const track = trackOf(gameState, railroad).length;
  const links = linkCount(gameState, railroad);
  let score = links * 1.2 + track * 0.15;
  score += sharesOf(me, railroad) * 0.6;
  score -= others * 0.5;
  if (OPENS[railroad] === pub.round) score += 2.5;
  if (track === 0 && OPENS[railroad] < pub.round) score -= 1;
  score += (roundsLeft(gameState) / ROUNDS) * (track === 0 ? 1.5 : 0);
  return score;
}

/** Cities this railroad does not yet reach and could still enter. */
function targets(gameState: RideTheRailsGameState, railroad: Railroad) {
  const track = trackOf(gameState, railroad);
  return CITIES.filter((c) => !track.includes(c) && hasRoom(gameState, c));
}

function buildScore(
  gameState: RideTheRailsGameState,
  railroad: Railroad,
  hex: number,
) {
  const me = getActivePlayer(gameState);
  if (!me) return -1;
  const before = linkCount(gameState, railroad);
  const trial = JSON.parse(JSON.stringify(gameState)) as RideTheRailsGameState;
  const moneyBefore = me.money;
  if (!buildTrack(trial, railroad, hex).ok) return -1;
  const mine = trial.public.players.find((p) => p.email === me.email);
  const gained = (mine?.money ?? moneyBefore) - moneyBefore;
  const newLinks = linkCount(trial, railroad) - before;
  const weight = Math.min(roundsLeft(gameState), 4);
  let score = gained;
  score += newLinks * (1.5 + sharesOf(me, railroad) * 0.8 * weight * 0.5);
  if (isCity(hex)) {
    score += 1.2;
  } else {
    const goals = targets(gameState, railroad);
    const nearest = Math.min(...goals.map((c) => distance(hex, c)), 99);
    const fromTrack = Math.min(
      ...goals.flatMap((c) =>
        trackOf(gameState, railroad).map((t) => distance(t, c)),
      ),
      99,
    );
    // Reward getting closer to a city the railroad does not reach yet.
    score += Math.max(0, fromTrack - nearest) * 1.6;
    score += Math.max(0, 2.5 - nearest) * 0.5;
  }
  if (isMountain(hex)) score -= 1.3;
  return score;
}

function rideScore(gameState: RideTheRailsGameState, journey: Journey) {
  const me = getActivePlayer(gameState);
  const traced = traceJourney(gameState, journey);
  if (!me || !traced.ok) return -Infinity;
  const pay = payoutsFor(gameState, traced.route);
  const mine = pay.dividends.find((d) => d.email === me.email)?.amount ?? 0;
  const rivals = pay.dividends
    .filter((d) => d.email !== me.email)
    .map((d) => d.amount);
  const worst = rivals.length ? Math.max(...rivals) : 0;
  const total = rivals.reduce((n, a) => n + a, 0);
  return pay.earned + mine - worst * 0.7 - total * 0.15;
}

/** The best move for the active player, or nothing when none is legal. */
export function chooseBotMove(
  gameState: RideTheRailsGameState,
): BotMove | null {
  const player = getActivePlayer(gameState);
  if (!player) return null;
  switch (gameState.public.phase) {
    case "SHARE": {
      let best: BotMove | null = null;
      let bestScore = -Infinity;
      for (const move of turnMoves(gameState)) {
        if (move.kind !== "share") continue;
        const score = shareScore(gameState, move.railroad);
        if (score > bestScore) {
          bestScore = score;
          best = move;
        }
      }
      return best;
    }
    case "BUILD": {
      let best: BotMove = { kind: "end" };
      let bestScore = 0.3;
      for (const { railroad, hex } of legalPlacements(gameState, player)) {
        const score = buildScore(gameState, railroad, hex);
        if (score > bestScore) {
          bestScore = score;
          best = { kind: "build", railroad, hex };
        }
      }
      return best;
    }
    case "RIDE": {
      let best: BotMove | null = null;
      let bestScore = -Infinity;
      for (const journey of journeys(gameState)) {
        const score = rideScore(gameState, journey);
        if (score > bestScore) {
          bestScore = score;
          best = { kind: "ride", journey };
        }
      }
      return best;
    }
    default:
      return null;
  }
}

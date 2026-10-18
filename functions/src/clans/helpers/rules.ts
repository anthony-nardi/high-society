import {
  ClansGameState,
  ClansPlayerState,
  Colour,
  Huts,
  Village,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  COLOURS,
  coloursIn,
  countHuts,
  EPOCHS,
  epochOf,
  FROZEN_AT,
  isTerritory,
  label,
  neighbours,
  terrainOf,
  TERRITORIES,
  VILLAGE_COUNT,
} from "./board";

/*
 * Pure rules for Clans: everything here mutates the state it is given and
 * never touches the database.
 */

export function appendLog(gameState: ClansGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: ClansGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: ClansGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: ClansGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: ClansGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: ClansGameState) {
  return gameState.public.status === "GAME_OVER";
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One hut of every colour in each region of five, placed at random within it. */
export function dealHuts(random: () => number) {
  const huts: { [territory: string]: Huts } = {};
  const regions = new Map<number, number[]>();
  TERRITORIES.forEach((t, i) => {
    regions.set(t.region, [...(regions.get(t.region) || []), i]);
  });
  for (const territories of regions.values()) {
    const colours = shuffled(COLOURS, random);
    territories.forEach((t, i) => {
      huts[String(t)] = { [colours[i]]: 1 };
    });
  }
  return huts;
}

export function buildClansGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): ClansGameState {
  const seats = players.slice(0, 4);
  const colours = shuffled(COLOURS, random);
  const playersMetadata: ClansPlayerState[] = seats.map((player, i) => ({
    email: player.email,
    lastActionAt: 0,
    colour: colours[i],
    chips: 0,
    isBot: !!player.isBot,
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];
  return {
    public: {
      id: lobbyUID,
      game: "clans",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      huts: dealHuts(random),
      scores: { RED: 0, BLUE: 0, YELLOW: 0, GREEN: 0, BLACK: 0 },
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. Each player holds a secret clan; ${seats.length < 5 ? `${5 - seats.length} clan${5 - seats.length === 1 ? " belongs" : "s belong"} to nobody. ` : ""}${starter.email} moves first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const hutsAt = (gameState: ClansGameState, t: number): Huts =>
  gameState.public.huts?.[String(t)] || {};

export const sizeAt = (gameState: ClansGameState, t: number) =>
  countHuts(hutsAt(gameState, t));

export const villagesFounded = (gameState: ClansGameState) =>
  (gameState.public.villages || []).length;

export const currentEpoch = (gameState: ClansGameState) =>
  epochOf(villagesFounded(gameState));

/** Why huts may not go from one territory to another, or nothing. */
export function moveProblem(
  gameState: ClansGameState,
  from: number,
  to: number,
): string | null {
  if (!isTerritory(from) || !isTerritory(to))
    return "That is not on the board.";
  const size = sizeAt(gameState, from);
  if (size === 0) return "There are no huts there to move.";
  if (size >= FROZEN_AT)
    return `A group of ${FROZEN_AT} or more huts can no longer move.`;
  if (!neighbours(from).includes(to))
    return "Huts only move to a neighbouring territory across a river.";
  if (sizeAt(gameState, to) === 0)
    return "Huts may only move to a territory that already holds huts.";
  return null;
}

export type Move = { from: number; to: number };

export function legalMoves(gameState: ClansGameState): Move[] {
  const out: Move[] = [];
  for (const key of Object.keys(gameState.public.huts || {})) {
    const from = Number(key);
    for (const to of neighbours(from))
      if (!moveProblem(gameState, from, to)) out.push({ from, to });
  }
  return out;
}

/** A territory with huts and no occupied neighbour is a village. */
export function isIsolated(gameState: ClansGameState, t: number) {
  return (
    sizeAt(gameState, t) > 0 &&
    neighbours(t).every((n) => sizeAt(gameState, n) === 0)
  );
}

/** What founding a village here would be worth, before it happens. */
export function appraise(
  gameState: ClansGameState,
  t: number,
  villagesSoFar = villagesFounded(gameState),
): Omit<Village, "founder"> {
  const epoch = epochOf(villagesSoFar);
  const chart = EPOCHS[epoch];
  const terrain = terrainOf(t);
  const before = hutsAt(gameState, t);
  const strife = coloursIn(before).length === COLOURS.length;
  const huts: Huts = {};
  for (const c of COLOURS) {
    const n = before[c] ?? 0;
    if (n > 0 && !(strife && n === 1)) huts[c] = n;
  }
  const destroyed = chart.forbidden === terrain;
  const bonus = chart.favoured === terrain ? chart.bonus : 0;
  const value = destroyed ? 0 : countHuts(huts);
  return {
    territory: t,
    terrain,
    epoch,
    huts,
    colours: coloursIn(huts),
    points: destroyed ? 0 : value + bonus,
    bonus: destroyed ? 0 : bonus,
    strife,
    destroyed,
  };
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

function found(
  gameState: ClansGameState,
  t: number,
  founder: ClansPlayerState,
) {
  const village: Village = {
    ...appraise(gameState, t),
    founder: founder.email,
  };
  for (const c of village.colours) gameState.public.scores[c] += village.points;
  founder.chips += 1;
  const huts = { ...(gameState.public.huts || {}) };
  delete huts[String(t)];
  gameState.public.huts = huts;
  gameState.public.villages = [...(gameState.public.villages || []), village];
  appendLog(gameState, {
    timestamp: Date.now(),
    title: village.destroyed
      ? `Village ${villagesFounded(gameState)} in ${label(village.terrain).toLowerCase()} is razed: ${label(village.terrain).toLowerCase()} is forbidden in epoch ${village.epoch + 1}.`
      : `Village ${villagesFounded(gameState)}: ${village.colours.map(label).join(", ")} score ${village.points}${village.bonus ? ` (${village.bonus} for ${label(village.terrain).toLowerCase()})` : ""}${village.strife ? "; strife drove out the lone huts" : ""}.`,
  });
  return village;
}

function finish(gameState: ClansGameState, why: string) {
  const pub = gameState.public;
  pub.status = "GAME_OVER";
  pub.results = pub.players.map((p) => ({
    email: p.email,
    colour: p.colour,
    track: pub.scores[p.colour],
    chips: p.chips,
    total: pub.scores[p.colour] + p.chips,
  }));
  const best = Math.max(...pub.results.map((r) => r.total));
  const winners = pub.results.filter((r) => r.total === best);
  if (winners.length === 1) pub.winner = winners[0].email;
  else pub.draw = true;
  const reveal = pub.results
    .map(
      (r) =>
        `${r.email} led the ${label(r.colour)} clan: ${r.track} + ${r.chips} chips = ${r.total}`,
    )
    .join("; ");
  announce(
    gameState,
    winners.length === 1
      ? `${winners[0].email} wins!`
      : `${winners.map((w) => w.email).join(" and ")} share the win.`,
    `${why} ${reveal}.`,
  );
  publishLog(gameState);
}

function nextPlayer(gameState: ClansGameState) {
  const players = gameState.public.players;
  const i = players.findIndex((p) => p.email === gameState.public.activePlayer);
  const next = players[(i + 1) % players.length];
  gameState.public.activePlayer = next.email;
  next.lastActionAt = Date.now();
}

/** Move every hut from one territory to a neighbouring one. */
export function moveHuts(
  gameState: ClansGameState,
  from: number,
  to: number,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  const problem = moveProblem(gameState, from, to);
  if (problem) return { ok: false, reason: problem };

  const pub = gameState.public;
  const huts = { ...(pub.huts || {}) };
  const moving = huts[String(from)];
  const target: Huts = { ...huts[String(to)] };
  for (const c of COLOURS) {
    const n = moving[c] ?? 0;
    if (n) target[c] = (target[c] ?? 0) + n;
  }
  delete huts[String(from)];
  huts[String(to)] = target;
  pub.huts = huts;
  pub.lastMove = { email: player.email, from, to };
  pub.turn += 1;
  player.lastActionAt = Date.now();

  // Villages: the destination first, then anything the move cut off.
  const founded: number[] = [];
  const candidates = [to, ...neighbours(from).filter((n) => n !== to)];
  for (const t of candidates) {
    if (villagesFounded(gameState) >= VILLAGE_COUNT) break;
    if (isIsolated(gameState, t)) {
      found(gameState, t, player);
      founded.push(t);
    }
  }
  if (founded.length) pub.lastMove.founded = founded;
  announce(
    gameState,
    `${player.email} moves ${countHuts(moving)} hut${countHuts(moving) === 1 ? "" : "s"} into ${label(terrainOf(to)).toLowerCase()}${founded.length ? ` and founds ${founded.length === 1 ? "a village" : `${founded.length} villages`}` : ""}.`,
  );

  if (villagesFounded(gameState) >= VILLAGE_COUNT) {
    finish(gameState, "The twelfth village is founded.");
    return { ok: true };
  }
  nextPlayer(gameState);
  if (legalMoves(gameState).length === 0) {
    finish(gameState, "No huts can move.");
  }
  return { ok: true };
}

export const colourLabel = (c: Colour) => label(c);

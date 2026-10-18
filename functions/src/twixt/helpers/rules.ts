import { Link, Side, TwixtGameState, TwixtPlayerState } from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  borders,
  crosses,
  HOLES,
  inBorder,
  isHole,
  linkOf,
  other,
  reach,
  sameLink,
} from "./board";

/*
 * Pure rules for TwixT: everything here mutates the state it is given and
 * never touches the database.
 */

export function appendLog(gameState: TwixtGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: TwixtGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: TwixtGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: TwixtGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: TwixtGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: TwixtGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function buildTwixtGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): TwixtGameState {
  const seats = players.slice(0, 2);
  const redFirst = random() < 0.5;
  const playersMetadata: TwixtPlayerState[] = seats.map((player, i) => ({
    email: player.email,
    lastActionAt: 0,
    side: (i === 0) === redFirst ? "RED" : "BLACK",
    isBot: !!player.isBot,
  }));
  const red = playersMetadata.find((p) => p.side === "RED") as TwixtPlayerState;
  return {
    public: {
      id: lobbyUID,
      game: "twixt",
      players: playersMetadata,
      activePlayer: red.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      moves: 0,
      swapOffered: false,
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${red.email} is Red, joining top to bottom, and pegs first; Black may swap sides after the first peg.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const pegAt = (
  gameState: TwixtGameState,
  hole: number,
): Side | undefined => gameState.public.pegs?.[String(hole)];

export const linksOf = (gameState: TwixtGameState): Link[] =>
  gameState.public.links || [];

export const sideOf = (player: TwixtPlayerState) => player.side;

/** Why a peg may not go here, or nothing. */
export function placementProblem(
  gameState: TwixtGameState,
  side: Side,
  hole: number,
): string | null {
  if (!isHole(hole)) return "That is not a hole on the board.";
  if (pegAt(gameState, hole)) return "That hole already holds a peg.";
  if (inBorder(hole, other(side)))
    return "Only the other player may peg their own border rows.";
  return null;
}

/** The links a new peg of this side would make: every own peg a knight's move away not blocked by a crossing. */
export function linksFor(
  gameState: TwixtGameState,
  side: Side,
  hole: number,
  extraLinks: Link[] = [],
): Link[] {
  const existing = [...linksOf(gameState), ...extraLinks];
  const out: Link[] = [];
  for (const n of reach(hole)) {
    if (pegAt(gameState, n) !== side) continue;
    const link = linkOf(hole, n);
    if (existing.some((l) => sameLink(l, link))) continue;
    if (existing.some((l) => crosses(l, link))) continue;
    if (out.some((l) => crosses(l, link))) continue;
    out.push(link);
  }
  return out;
}

/** Whether a side's pegs join its two borders, and the chain if so. */
export function connection(
  gameState: TwixtGameState,
  side: Side,
): number[] | null {
  const [from, to] = borders(side);
  const pegs = gameState.public.pegs || {};
  const adjacency = new Map<number, number[]>();
  for (const [a, b] of linksOf(gameState)) {
    if (pegs[String(a)] !== side) continue;
    adjacency.set(a, [...(adjacency.get(a) || []), b]);
    adjacency.set(b, [...(adjacency.get(b) || []), a]);
  }
  const goal = new Set(to);
  const parent = new Map<number, number>();
  const queue: number[] = [];
  for (const h of from)
    if (pegs[String(h)] === side) {
      parent.set(h, -1);
      queue.push(h);
    }
  while (queue.length) {
    const h = queue.shift() as number;
    if (goal.has(h)) {
      const path: number[] = [];
      for (let x = h; x !== -1; x = parent.get(x) as number) path.unshift(x);
      return path;
    }
    for (const n of adjacency.get(h) || []) {
      if (parent.has(n)) continue;
      parent.set(n, h);
      queue.push(n);
    }
  }
  return null;
}

export function emptyHoles(gameState: TwixtGameState, side: Side): number[] {
  const out: number[] = [];
  for (let h = 0; h < HOLES; h++)
    if (!placementProblem(gameState, side, h)) out.push(h);
  return out;
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

function finish(
  gameState: TwixtGameState,
  winner: TwixtPlayerState | null,
  why: string,
) {
  const pub = gameState.public;
  pub.status = "GAME_OVER";
  if (winner) pub.winner = winner.email;
  else pub.draw = true;
  announce(
    gameState,
    winner ? `${winner.email} wins!` : "The game is a draw.",
    why,
  );
  publishLog(gameState);
}

function nextPlayer(gameState: TwixtGameState) {
  const players = gameState.public.players;
  const i = players.findIndex((p) => p.email === gameState.public.activePlayer);
  const next = players[(i + 1) % players.length];
  gameState.public.activePlayer = next.email;
  next.lastActionAt = Date.now();
}

/** Place a peg; every legal link to it is added at once. */
export function placePeg(
  gameState: TwixtGameState,
  hole: number,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  const problem = placementProblem(gameState, player.side, hole);
  if (problem) return { ok: false, reason: problem };

  const pub = gameState.public;
  pub.pegs = { ...(pub.pegs || {}), [String(hole)]: player.side };
  const added = linksFor(gameState, player.side, hole);
  if (added.length) pub.links = [...linksOf(gameState), ...added];
  pub.moves += 1;
  pub.turn += 1;
  pub.lastMove = { type: "peg", email: player.email, hole };
  if (added.length) pub.lastMove.added = added;
  player.lastActionAt = Date.now();
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `${player.email} pegs ${label(hole)}${added.length ? ` and links ${added.length}` : ""}.`,
  });

  const path = connection(gameState, player.side);
  if (path) {
    pub.winningPath = path;
    finish(
      gameState,
      player,
      `${player.email} joins the ${player.side === "RED" ? "top to the bottom" : "left to the right"}.`,
    );
    return { ok: true };
  }
  nextPlayer(gameState);
  const next = getActivePlayer(gameState) as TwixtPlayerState;
  if (emptyHoles(gameState, next.side).length === 0) {
    finish(gameState, null, "No hole is left to peg.");
    return { ok: true };
  }
  if (pub.moves === 1) {
    announce(
      gameState,
      `${next.email} may swap sides or peg.`,
      "After the first peg the second player may take over Red instead.",
    );
  } else {
    pub.notification = {
      timestamp: Date.now(),
      title: `${player.email} pegs ${label(hole)}${added.length ? ` and links ${added.length}` : ""}.`,
    };
  }
  return { ok: true };
}

/** The pie rule: right after the first peg, the second player may take Red. */
export function swapSides(gameState: TwixtGameState): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  const pub = gameState.public;
  if (pub.moves !== 1 || pub.swapOffered)
    return {
      ok: false,
      reason: "Sides may only be swapped right after the first peg.",
    };
  for (const p of pub.players) p.side = other(p.side);
  pub.swapOffered = true;
  pub.turn += 1;
  pub.lastMove = { type: "swap", email: player.email };
  announce(
    gameState,
    `${player.email} swaps sides and takes Red.`,
    `${player.email} now joins top to bottom; the first peg is theirs.`,
  );
  // The swapper now owns the first peg, so the other player moves next.
  nextPlayer(gameState);
  return { ok: true };
}

/** Take away one of your own links, to make room for another. */
export function removeLink(
  gameState: TwixtGameState,
  link: Link,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "No active player." };
  if (
    !Array.isArray(link) ||
    link.length !== 2 ||
    !isHole(link[0]) ||
    !isHole(link[1])
  )
    return { ok: false, reason: "That is not a link." };
  const wanted = linkOf(link[0], link[1]);
  const index = linksOf(gameState).findIndex((l) => sameLink(l, wanted));
  if (index < 0) return { ok: false, reason: "There is no such link." };
  if (pegAt(gameState, wanted[0]) !== player.side)
    return { ok: false, reason: "You may only remove your own links." };
  const links = [...linksOf(gameState)];
  links.splice(index, 1);
  if (links.length) gameState.public.links = links;
  else delete gameState.public.links;
  gameState.public.turn += 1;
  gameState.public.lastMove = {
    type: "unlink",
    email: player.email,
    link: wanted,
  };
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `${player.email} removes the link ${label(wanted[0])}–${label(wanted[1])}.`,
  });
  return { ok: true };
}

/** A hole's name: column letter and row number, as on the printed board. */
export function label(hole: number) {
  const c = hole % 24;
  const r = Math.floor(hole / 24);
  return `${String.fromCharCode(65 + c)}${r + 1}`;
}

import {
  Colour,
  COLOURS,
  Coord,
  MarbleCounts,
  ZertzGameState,
  ZertzPlayerState,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import { ALL_RINGS, components, DIRECTIONS, neighbours, step } from "./board";

/*
 * Pure rules for ZÈRTZ (basic game): everything here mutates the state it is
 * given and never touches the database.
 */

export const POOL_START: MarbleCounts = { WHITE: 6, GRAY: 8, BLACK: 10 };
/** Win with this many of every colour... */
export const WIN_OF_EACH = 3;
/** ...or this many of one colour. */
export const WIN_OF_ONE: { [colour in Colour]: number } = {
  WHITE: 4,
  GRAY: 5,
  BLACK: 6,
};

export const count = (counts: MarbleCounts | undefined, colour: Colour) =>
  counts?.[colour] || 0;

export function addMarble(
  counts: MarbleCounts | undefined,
  colour: Colour,
  n = 1,
) {
  const next: MarbleCounts = { ...(counts || {}) };
  const total = (next[colour] || 0) + n;
  if (total > 0) next[colour] = total;
  else delete next[colour];
  return next;
}

export function appendLog(gameState: ZertzGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: ZertzGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: ZertzGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function getActivePlayer(gameState: ZertzGameState) {
  return gameState.public.players.find(
    (player) => player.email === gameState.public.activePlayer,
  );
}

export function getOpponent(gameState: ZertzGameState) {
  return gameState.public.players.find(
    (player) => player.email !== gameState.public.activePlayer,
  );
}

export function isGameOver(gameState: ZertzGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function buildZertzGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): ZertzGameState {
  const playersMetadata: ZertzPlayerState[] = players
    .slice(0, 2)
    .map((player) => ({
      email: player.email,
      lastActionAt: 0,
      isBot: !!player.isBot,
    }));
  const starter =
    playersMetadata[Math.floor(random() * playersMetadata.length)];

  return {
    public: {
      id: lobbyUID,
      game: "zertz",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      rings: [...ALL_RINGS],
      pool: { ...POOL_START },
      phase: "MOVE",
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${starter.email} goes first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Board queries
// ---------------------------------------------------------------------------

export function hasRing(gameState: ZertzGameState, coord: Coord) {
  return gameState.public.rings.includes(coord);
}

export function marbleAt(
  gameState: ZertzGameState,
  coord: Coord,
): Colour | undefined {
  return gameState.public.marbles?.[coord];
}

export function isVacant(gameState: ZertzGameState, coord: Coord) {
  return hasRing(gameState, coord) && !marbleAt(gameState, coord);
}

export function vacantRings(gameState: ZertzGameState) {
  return gameState.public.rings.filter((coord) => !marbleAt(gameState, coord));
}

/** Landing rings for jumps from `from`. */
export function jumpsFrom(gameState: ZertzGameState, from: Coord): Coord[] {
  if (!marbleAt(gameState, from)) return [];
  const targets: Coord[] = [];
  for (const direction of DIRECTIONS) {
    const over = step(from, direction);
    const to = step(from, direction, 2);
    if (marbleAt(gameState, over) && isVacant(gameState, to)) targets.push(to);
  }
  return targets;
}

/** Every marble that can capture right now, with its landing rings. */
export function captures(
  gameState: ZertzGameState,
): { from: Coord; to: Coord[] }[] {
  const result: { from: Coord; to: Coord[] }[] = [];
  for (const from of Object.keys(gameState.public.marbles || {})) {
    const to = jumpsFrom(gameState, from);
    if (to.length) result.push({ from, to });
  }
  return result;
}

/**
 * A free ring can be slid off the board: it is vacant and two consecutive
 * neighbouring positions have no ring (the edge, or a gap).
 */
export function isRemovable(gameState: ZertzGameState, coord: Coord) {
  if (!isVacant(gameState, coord)) return false;
  const around = neighbours(coord).map((n) => hasRing(gameState, n));
  for (let i = 0; i < around.length; i++) {
    if (!around[i] && !around[(i + 1) % around.length]) return true;
  }
  return false;
}

export function removableRings(gameState: ZertzGameState) {
  return gameState.public.rings.filter((coord) =>
    isRemovable(gameState, coord),
  );
}

/** Colours the active player may place: from the pool, or their own captures once it is empty. */
export function placeableColours(gameState: ZertzGameState): Colour[] {
  const fromPool = COLOURS.filter(
    (colour) => count(gameState.public.pool, colour) > 0,
  );
  if (fromPool.length) return fromPool;
  const player = getActivePlayer(gameState);
  return COLOURS.filter((colour) => count(player?.captured, colour) > 0);
}

export function hasWon(player: ZertzPlayerState) {
  const captured = player.captured || {};
  if (COLOURS.every((colour) => count(captured, colour) >= WIN_OF_EACH))
    return true;
  return COLOURS.some(
    (colour) => count(captured, colour) >= WIN_OF_ONE[colour],
  );
}

/** Whether the player to move has any legal move at all. */
export function hasAnyMove(gameState: ZertzGameState) {
  if (gameState.public.phase === "REMOVE_RING")
    return removableRings(gameState).length > 0;
  if (gameState.public.phase === "CONTINUE_CAPTURE") return true;
  if (captures(gameState).length) return true;
  return (
    placeableColours(gameState).length > 0 && vacantRings(gameState).length > 0
  );
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function finish(
  gameState: ZertzGameState,
  winner: ZertzPlayerState,
  why: string,
) {
  gameState.public.status = "GAME_OVER";
  gameState.public.winner = winner.email;
  gameState.public.phase = "MOVE";
  delete gameState.public.capturingAt;
  announce(gameState, `${winner.email} wins!`, why);
  publishLog(gameState);
}

function describe(counts: MarbleCounts | undefined) {
  return COLOURS.filter((c) => count(counts, c))
    .map((c) => `${count(counts, c)} ${c.toLowerCase()}`)
    .join(", ");
}

/** Hands the turn over, after checking for a win or a stuck opponent. */
function endTurn(gameState: ZertzGameState) {
  const mover = getActivePlayer(gameState);
  const next = getOpponent(gameState);
  if (!mover || !next) return;

  if (hasWon(mover)) {
    finish(gameState, mover, `Captured ${describe(mover.captured)}.`);
    return;
  }

  gameState.public.phase = "MOVE";
  delete gameState.public.capturingAt;
  gameState.public.activePlayer = next.email;
  gameState.public.turn += 1;

  if (!hasAnyMove(gameState)) {
    finish(
      gameState,
      mover,
      `${next.email} has no marble to place and no capture to make.`,
    );
  }
}

/** After a ring is removed: fully occupied islands go to the mover. */
function claimIsolated(gameState: ZertzGameState, mover: ZertzPlayerState) {
  const groups = components(gameState.public.rings);
  if (groups.length < 2) return;
  const claimed: Colour[] = [];
  for (const group of groups) {
    if (!group.every((coord) => marbleAt(gameState, coord))) continue;
    for (const coord of group) {
      const colour = marbleAt(gameState, coord) as Colour;
      claimed.push(colour);
      mover.captured = addMarble(mover.captured, colour, 1);
      delete gameState.public.marbles?.[coord];
    }
    gameState.public.rings = gameState.public.rings.filter(
      (coord) => !group.includes(coord),
    );
  }
  if (claimed.length) {
    announce(
      gameState,
      `${mover.email} isolates ${claimed.length} marble${claimed.length === 1 ? "" : "s"} and takes ${claimed
        .map((c) => c.toLowerCase())
        .join(", ")}.`,
    );
  }
}

/** Place a marble of `colour` on the vacant ring `to`. */
export function place(
  gameState: ZertzGameState,
  colour: Colour,
  to: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "MOVE")
    return fail("Finish your current move first.");
  if (captures(gameState).length)
    return fail("A capture is available, and capturing is compulsory.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!COLOURS.includes(colour)) return fail("Choose white, gray or black.");
  if (!placeableColours(gameState).includes(colour)) {
    return fail(`No ${colour.toLowerCase()} marble is available to place.`);
  }
  if (!isVacant(gameState, to)) return fail("Choose a vacant ring.");

  if (count(gameState.public.pool, colour) > 0) {
    gameState.public.pool = addMarble(gameState.public.pool, colour, -1);
  } else {
    player.captured = addMarble(player.captured, colour, -1);
  }
  gameState.public.marbles = {
    ...(gameState.public.marbles || {}),
    [to]: colour,
  };
  gameState.public.lastMove = { type: "place", to, colour };
  player.lastActionAt = Date.now();
  announce(
    gameState,
    `${player.email} places a ${colour.toLowerCase()} marble on ${to}.`,
  );

  if (removableRings(gameState).length > 0) {
    gameState.public.phase = "REMOVE_RING";
  } else {
    appendLog(gameState, {
      timestamp: Date.now(),
      title: "No ring can be removed.",
    });
    endTurn(gameState);
  }
  return { ok: true };
}

/** Remove the free ring at `coord` after a placement. */
export function removeRing(
  gameState: ZertzGameState,
  coord: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "REMOVE_RING")
    return fail("Place a marble first.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!isRemovable(gameState, coord)) {
    return fail(
      "That ring cannot be removed: it must be vacant and free on two adjacent sides.",
    );
  }

  gameState.public.rings = gameState.public.rings.filter((c) => c !== coord);
  gameState.public.lastMove = { type: "remove", from: coord };
  announce(gameState, `${player.email} removes ring ${coord}.`);
  claimIsolated(gameState, player);
  endTurn(gameState);
  return { ok: true };
}

/** Jump the marble at `from` over a neighbour onto `to`, capturing it. */
export function capture(
  gameState: ZertzGameState,
  from: Coord,
  to: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (gameState.public.phase === "REMOVE_RING")
    return fail("Remove a ring first.");
  if (
    gameState.public.phase === "CONTINUE_CAPTURE" &&
    gameState.public.capturingAt !== from
  ) {
    return fail(
      `You must keep jumping with the marble on ${gameState.public.capturingAt}.`,
    );
  }
  if (!jumpsFrom(gameState, from).includes(to))
    return fail("That is not a legal jump.");

  const direction = DIRECTIONS.find((d) => step(from, d, 2) === to);
  if (!direction) return fail("That is not a legal jump.");
  const over = step(from, direction);
  const marbles = { ...(gameState.public.marbles || {}) };
  const jumper = marbles[from];
  const taken = marbles[over];
  delete marbles[from];
  delete marbles[over];
  marbles[to] = jumper;
  gameState.public.marbles = marbles;
  player.captured = addMarble(player.captured, taken, 1);
  gameState.public.lastMove = { type: "capture", from, to, colour: taken };
  player.lastActionAt = Date.now();
  announce(
    gameState,
    `${player.email} jumps ${from} to ${to} and captures a ${taken.toLowerCase()} marble.`,
  );

  if (jumpsFrom(gameState, to).length > 0 && !hasWon(player)) {
    gameState.public.phase = "CONTINUE_CAPTURE";
    gameState.public.capturingAt = to;
    return { ok: true };
  }

  endTurn(gameState);
  return { ok: true };
}

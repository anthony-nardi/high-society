import { Coord, Side, YinshGameState, YinshPlayerState } from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import { DIRECTIONS, isPoint, LINES, step } from "./board";

/*
 * Pure rules for YINSH (standard game): everything here mutates the state it
 * is given and never touches the database.
 */

export const RINGS_PER_PLAYER = 5;
export const MARKERS = 51;
export const ROW_LENGTH = 5;
export const RINGS_TO_WIN = 3;

export function appendLog(gameState: YinshGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: YinshGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: YinshGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: YinshGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: YinshGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function opponentOf(gameState: YinshGameState, email: string) {
  return gameState.public.players.find(
    (p) => p.email !== email,
  ) as YinshPlayerState;
}

export function isGameOver(gameState: YinshGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function buildYinshGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): YinshGameState {
  const first = Math.floor(random() * 2);
  const playersMetadata: YinshPlayerState[] = players
    .slice(0, 2)
    .map((player, i) => ({
      email: player.email,
      lastActionAt: 0,
      side: i === first ? "WHITE" : "BLACK",
      scored: 0,
      isBot: !!player.isBot,
    }));
  const starter = playersMetadata[first];

  return {
    public: {
      id: lobbyUID,
      game: "yinsh",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      pool: MARKERS,
      phase: "PLACE_RINGS",
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${starter.email} plays white and places first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const ringAt = (gameState: YinshGameState, coord: Coord) =>
  gameState.public.rings?.[coord];
export const markerAt = (gameState: YinshGameState, coord: Coord) =>
  gameState.public.markers?.[coord];
export const isEmpty = (gameState: YinshGameState, coord: Coord) =>
  isPoint(coord) && !ringAt(gameState, coord) && !markerAt(gameState, coord);

export function ringsOf(gameState: YinshGameState, side: Side): Coord[] {
  return Object.entries(gameState.public.rings || {})
    .filter(([, s]) => s === side)
    .map(([coord]) => coord);
}

export function ringsPlaced(gameState: YinshGameState) {
  return Object.keys(gameState.public.rings || {}).length;
}

/** Where the ring at `from` may land: vacant points, or the first vacant point after a run of markers. */
export function movesFrom(gameState: YinshGameState, from: Coord): Coord[] {
  const targets: Coord[] = [];
  for (const direction of DIRECTIONS) {
    let current = step(from, direction);
    let jumped = false;
    while (isPoint(current)) {
      if (ringAt(gameState, current)) break;
      if (markerAt(gameState, current)) {
        jumped = true;
      } else {
        targets.push(current);
        if (jumped) break;
      }
      current = step(current, direction);
    }
  }
  return targets;
}

/** Every move for a side, as [from, to] pairs. */
export function allMoves(
  gameState: YinshGameState,
  side: Side,
): [Coord, Coord][] {
  const moves: [Coord, Coord][] = [];
  for (const from of ringsOf(gameState, side)) {
    for (const to of movesFrom(gameState, from)) moves.push([from, to]);
  }
  return moves;
}

export type Run = { side: Side; cells: Coord[] };

/** Every maximal straight run of five or more markers of one colour. */
export function rows(gameState: YinshGameState): Run[] {
  const runs: Run[] = [];
  for (const line of LINES) {
    let current: Coord[] = [];
    let side: Side | undefined;
    const flush = () => {
      if (side && current.length >= ROW_LENGTH)
        runs.push({ side, cells: current });
      current = [];
      side = undefined;
    };
    for (const coord of line) {
      const marker = markerAt(gameState, coord);
      if (marker && marker === side) {
        current.push(coord);
      } else {
        flush();
        if (marker) {
          side = marker;
          current = [coord];
        }
      }
    }
    flush();
  }
  return runs;
}

/** Every removable window of exactly five, as [first, last] endpoints. */
export function rowWindows(
  gameState: YinshGameState,
  side: Side,
): [Coord, Coord][] {
  const windows: [Coord, Coord][] = [];
  for (const run of rows(gameState)) {
    if (run.side !== side) continue;
    for (let i = 0; i + ROW_LENGTH <= run.cells.length; i++) {
      windows.push([run.cells[i], run.cells[i + ROW_LENGTH - 1]]);
    }
  }
  return windows;
}

/** The five points from `from` to `to`, if they are a straight row of the side's markers. */
export function windowCells(
  gameState: YinshGameState,
  side: Side,
  from: Coord,
  to: Coord,
): Coord[] | null {
  for (const direction of DIRECTIONS) {
    if (step(from, direction, ROW_LENGTH - 1) !== to) continue;
    const cells = Array.from({ length: ROW_LENGTH }, (_, i) =>
      step(from, direction, i),
    );
    if (cells.every((c) => markerAt(gameState, c) === side)) return cells;
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function finish(
  gameState: YinshGameState,
  winner: YinshPlayerState | null,
  why: string,
) {
  gameState.public.status = "GAME_OVER";
  if (winner) gameState.public.winner = winner.email;
  else gameState.public.draw = true;
  announce(
    gameState,
    winner ? `${winner.email} wins!` : "The game is a draw.",
    why,
  );
  publishLog(gameState);
}

/**
 * After a move or a removal: whoever has rows must remove them, the mover
 * first; otherwise the turn passes to the player after the mover.
 */
function resolve(gameState: YinshGameState) {
  const mover =
    playerByEmail(gameState, gameState.public.mover) ||
    getActivePlayer(gameState);
  if (!mover) return;
  const other = opponentOf(gameState, mover.email);

  for (const player of [mover, other]) {
    if (rowWindows(gameState, player.side).length > 0) {
      gameState.public.phase = "REMOVE_ROW";
      gameState.public.removing = player.email;
      gameState.public.activePlayer = player.email;
      return;
    }
  }

  delete gameState.public.removing;
  gameState.public.activePlayer = other.email;
  gameState.public.turn += 1;
  gameState.public.phase = "MOVE_RING";

  if (gameState.public.pool <= 0) {
    const [a, b] = gameState.public.players;
    finish(
      gameState,
      a.scored === b.scored ? null : a.scored > b.scored ? a : b,
      "The markers ran out.",
    );
    return;
  }
  if (allMoves(gameState, other.side).length === 0) {
    // Not covered by the rulebook; passing keeps the game going.
    announce(gameState, `${other.email} has no move and passes.`);
    gameState.public.activePlayer = mover.email;
    gameState.public.turn += 1;
    if (allMoves(gameState, mover.side).length === 0) {
      const [a, b] = gameState.public.players;
      finish(
        gameState,
        a.scored === b.scored ? null : a.scored > b.scored ? a : b,
        "Neither player can move.",
      );
    }
  }
}

/** Opening: put one of your five rings on a vacant point. */
export function placeRing(
  gameState: YinshGameState,
  coord: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "PLACE_RINGS")
    return fail("All rings are placed.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!isEmpty(gameState, coord)) return fail("Choose a vacant point.");

  gameState.public.rings = {
    ...(gameState.public.rings || {}),
    [coord]: player.side,
  };
  player.lastActionAt = Date.now();
  announce(
    gameState,
    `${player.email} places a ${player.side.toLowerCase()} ring on ${coord}.`,
  );

  const other = opponentOf(gameState, player.email);
  gameState.public.activePlayer = other.email;
  gameState.public.turn += 1;
  if (ringsPlaced(gameState) >= RINGS_PER_PLAYER * 2) {
    gameState.public.phase = "MOVE_RING";
    appendLog(gameState, {
      timestamp: Date.now(),
      title: "All rings are placed. White moves first.",
    });
    // White moved last in placement? No: ten placements alternate, so the
    // player to move now is white again.
  }
  return { ok: true };
}

/** Move a ring, leaving a marker behind and flipping everything jumped. */
export function moveRing(
  gameState: YinshGameState,
  from: Coord,
  to: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "MOVE_RING")
    return fail("Not the moment to move a ring.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (ringAt(gameState, from) !== player.side)
    return fail("Choose one of your own rings.");
  if (!movesFrom(gameState, from).includes(to))
    return fail("That ring cannot move there.");
  if (gameState.public.pool <= 0) return fail("No markers are left.");

  const direction = DIRECTIONS.find((d) => {
    let c = step(from, d);
    while (isPoint(c)) {
      if (c === to) return true;
      c = step(c, d);
    }
    return false;
  });
  if (!direction) return fail("That ring cannot move there.");

  const rings = { ...(gameState.public.rings || {}) };
  const markers = { ...(gameState.public.markers || {}) };
  delete rings[from];
  rings[to] = player.side;
  markers[from] = player.side;
  gameState.public.pool -= 1;

  const flipped: Coord[] = [];
  let c = step(from, direction);
  while (c !== to) {
    if (markers[c]) {
      markers[c] = markers[c] === "WHITE" ? "BLACK" : "WHITE";
      flipped.push(c);
    }
    c = step(c, direction);
  }
  gameState.public.rings = rings;
  gameState.public.markers = markers;
  gameState.public.lastMove = { from, to, flipped };
  gameState.public.mover = player.email;
  player.lastActionAt = Date.now();
  announce(
    gameState,
    `${player.email} moves a ring ${from} to ${to}${flipped.length ? ` and flips ${flipped.length} marker${flipped.length === 1 ? "" : "s"}` : ""}.`,
  );
  resolve(gameState);
  return { ok: true };
}

/** Take a row of five of your markers off the board; a ring comes next. */
export function removeRow(
  gameState: YinshGameState,
  from: Coord,
  to: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "REMOVE_ROW")
    return fail("There is no row to remove.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  const cells =
    windowCells(gameState, player.side, from, to) ||
    windowCells(gameState, player.side, to, from);
  if (!cells)
    return fail("Choose five of your markers in a straight, unbroken row.");

  const markers = { ...(gameState.public.markers || {}) };
  for (const cell of cells) delete markers[cell];
  gameState.public.markers = markers;
  gameState.public.pool += ROW_LENGTH;
  announce(
    gameState,
    `${player.email} removes a row of five ${player.side.toLowerCase()} markers.`,
  );
  gameState.public.phase = "REMOVE_RING";
  return { ok: true };
}

/** Score a ring after a row. Three rings wins. */
export function removeRing(
  gameState: YinshGameState,
  coord: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "REMOVE_RING")
    return fail("Remove a row first.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (ringAt(gameState, coord) !== player.side)
    return fail("Choose one of your own rings.");

  const rings = { ...(gameState.public.rings || {}) };
  delete rings[coord];
  gameState.public.rings = rings;
  player.scored += 1;
  announce(
    gameState,
    `${player.email} removes a ring and has ${player.scored} of ${RINGS_TO_WIN}.`,
  );
  if (player.scored >= RINGS_TO_WIN) {
    finish(gameState, player, `Three rings removed.`);
    return { ok: true };
  }
  resolve(gameState);
  return { ok: true };
}

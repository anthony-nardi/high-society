import { Coord, GipfGameState, GipfPlayerState, Side } from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  CORNERS,
  Direction,
  directionTo,
  ENTRIES,
  isDot,
  lineFrom,
  LINES,
  step,
} from "./board";

/*
 * Pure rules for the basic game of GIPF (no GIPF-pieces): everything here
 * mutates the state it is given and never touches the database.
 */

export const PIECES_PER_PLAYER = 15;
export const RESERVE_AT_START = 12;
export const ROW_LENGTH = 4;

export function appendLog(gameState: GipfGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: GipfGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: GipfGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: GipfGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: GipfGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function opponentOf(gameState: GipfGameState, email: string) {
  return gameState.public.players.find(
    (p) => p.email !== email,
  ) as GipfPlayerState;
}

export function isGameOver(gameState: GipfGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function buildGipfGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): GipfGameState {
  const first = Math.floor(random() * 2);
  const playersMetadata: GipfPlayerState[] = players
    .slice(0, 2)
    .map((player, i) => ({
      email: player.email,
      lastActionAt: 0,
      side: i === first ? "WHITE" : "BLACK",
      reserve: RESERVE_AT_START,
      captured: 0,
      isBot: !!player.isBot,
    }));
  const starter = playersMetadata[first];

  // Three pieces each on the corners, colours alternating around the board.
  const pieces: { [coord: Coord]: Side } = {};
  CORNERS.forEach((corner, i) => {
    pieces[corner] = i % 2 === 0 ? "WHITE" : "BLACK";
  });

  return {
    public: {
      id: lobbyUID,
      game: "gipf",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      pieces,
      phase: "MOVE",
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${starter.email} plays white and pushes first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const pieceAt = (gameState: GipfGameState, coord: Coord) =>
  gameState.public.pieces?.[coord];

export function piecesOf(gameState: GipfGameState, side: Side) {
  return Object.values(gameState.public.pieces || {}).filter((s) => s === side)
    .length;
}

/** Index of the first vacant spot along a line, or -1 when the line is full. */
function firstVacant(gameState: GipfGameState, spots: Coord[]) {
  return spots.findIndex((c) => !pieceAt(gameState, c));
}

export function canPush(
  gameState: GipfGameState,
  dot: Coord,
  direction: Direction,
) {
  return firstVacant(gameState, lineFrom(dot, direction)) !== -1;
}

/** Every legal push, as the dot and the spot the new piece lands on. */
export function legalPushes(gameState: GipfGameState): [Coord, Coord][] {
  return ENTRIES.filter(([dot, d]) => canPush(gameState, dot, d)).map(
    ([dot, d]) => [dot, step(dot, d)],
  );
}

export type Row = { side: Side; cells: Coord[] };

/**
 * Every row of four or more, grown to the whole unbroken run of pieces of
 * either colour it sits in, since all of that comes off together.
 */
export function rows(gameState: GipfGameState): Row[] {
  const found = new Map<string, Row>();
  for (const line of LINES) {
    let start = 0;
    while (start < line.length) {
      if (!pieceAt(gameState, line[start])) {
        start++;
        continue;
      }
      // An unbroken run of pieces of any colour.
      let end = start;
      while (end + 1 < line.length && pieceAt(gameState, line[end + 1])) end++;
      const group = line.slice(start, end + 1);
      // Any four of one colour inside it claims the whole group.
      let run = 1;
      for (let i = 1; i <= group.length; i++) {
        const same =
          i < group.length &&
          pieceAt(gameState, group[i]) === pieceAt(gameState, group[i - 1]);
        if (same) {
          run++;
          continue;
        }
        if (run >= ROW_LENGTH) {
          const side = pieceAt(gameState, group[i - 1]) as Side;
          const key = `${side}:${group.join("|")}`;
          found.set(key, { side, cells: group });
        }
        run = 1;
      }
      start = end + 1;
    }
  }
  return [...found.values()];
}

export function rowsFor(gameState: GipfGameState, side: Side): Row[] {
  return rows(gameState).filter((r) => r.side === side);
}

function intersect(a: Row, b: Row) {
  const cells = new Set(a.cells);
  return b.cells.some((c) => cells.has(c));
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function finish(
  gameState: GipfGameState,
  winner: GipfPlayerState,
  why: string,
) {
  gameState.public.status = "GAME_OVER";
  gameState.public.winner = winner.email;
  announce(gameState, `${winner.email} wins!`, why);
  publishLog(gameState);
}

/** Take a row off: own pieces back to the reserve, the other colour captured. */
function takeRow(gameState: GipfGameState, player: GipfPlayerState, row: Row) {
  const pieces = { ...(gameState.public.pieces || {}) };
  const colours: Side[] = [];
  let returned = 0;
  let captured = 0;
  for (const cell of row.cells) {
    const colour = pieces[cell];
    colours.push(colour);
    if (colour === player.side) {
      returned++;
      player.reserve += 1;
    } else {
      captured++;
      player.captured += 1;
    }
    delete pieces[cell];
  }
  gameState.public.pieces = pieces;
  gameState.public.lastMove = {
    ...gameState.public.lastMove,
    removed: [...(gameState.public.lastMove?.removed || []), ...row.cells],
    removedColours: [
      ...(gameState.public.lastMove?.removedColours || []),
      ...colours,
    ],
  };
  announce(
    gameState,
    `${player.email} takes a row of ${row.cells.length}: ${returned} back to reserve${captured ? `, ${captured} captured` : ""}.`,
  );
}

/**
 * After a push or a removal: the mover's rows come off first, then the
 * opponent's. Rows that do not touch come off by themselves; rows that
 * cross each other are the owner's choice.
 */
function resolve(gameState: GipfGameState) {
  const mover =
    playerByEmail(gameState, gameState.public.mover) ||
    getActivePlayer(gameState);
  if (!mover) return;
  const other = opponentOf(gameState, mover.email);

  for (const player of [mover, other]) {
    let own = rowsFor(gameState, player.side);
    while (own.length) {
      const crossing = own.some((a, i) =>
        own.some((b, j) => i !== j && intersect(a, b)),
      );
      if (crossing) {
        gameState.public.phase = "REMOVE_ROW";
        gameState.public.removing = player.email;
        gameState.public.activePlayer = player.email;
        return;
      }
      takeRow(gameState, player, own[0]);
      own = rowsFor(gameState, player.side);
    }
  }

  delete gameState.public.removing;
  gameState.public.phase = "MOVE";
  gameState.public.activePlayer = other.email;
  gameState.public.turn += 1;
  if (other.reserve <= 0) {
    finish(gameState, mover, `${other.email} has no pieces left to play.`);
  }
}

/** Push a piece in from a dot onto the adjacent spot, shoving the line along. */
export function pushPiece(
  gameState: GipfGameState,
  dot: Coord,
  to: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "MOVE") return fail("Take your row first.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.reserve <= 0) return fail("You have no pieces left to play.");
  if (!isDot(dot))
    return fail("Pieces come in from the dots around the board.");
  const direction = directionTo(dot, to);
  if (!direction) return fail("Push onto the spot next to the dot.");
  const spots = lineFrom(dot, direction);
  const vacant = firstVacant(gameState, spots);
  if (vacant === -1)
    return fail("That line is full; a piece may not be pushed off the board.");

  const pieces = { ...(gameState.public.pieces || {}) };
  for (let i = vacant; i > 0; i--) pieces[spots[i]] = pieces[spots[i - 1]];
  pieces[spots[0]] = player.side;
  gameState.public.pieces = pieces;
  player.reserve -= 1;
  gameState.public.lastMove = {
    from: dot,
    to: spots[0],
    shifted: spots.slice(1, vacant + 1),
  };
  gameState.public.mover = player.email;
  player.lastActionAt = Date.now();
  announce(
    gameState,
    `${player.email} pushes a ${player.side.toLowerCase()} piece in at ${to}${vacant ? `, shoving ${vacant} piece${vacant === 1 ? "" : "s"} along` : ""}.`,
  );

  resolve(gameState);
  return { ok: true };
}

/** Choose which crossing row to take, by a piece that lies only in that row. */
export function removeRow(
  gameState: GipfGameState,
  coord: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "REMOVE_ROW")
    return fail("There is no row to choose.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  const candidates = rowsFor(gameState, player.side).filter((r) =>
    r.cells.includes(coord),
  );
  if (candidates.length === 0)
    return fail("That piece is not in one of your rows.");
  if (candidates.length > 1)
    return fail(
      "That piece lies in more than one row; tap a piece that is only in the row you want.",
    );

  takeRow(gameState, player, candidates[0]);
  resolve(gameState);
  return { ok: true };
}

import { Coord, DvonnGameState, DvonnPlayerState, Piece, Side } from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import { ALL_SPACES, DIRECTIONS, isSpace, neighbours, step } from "./board";

/*
 * Pure rules for DVONN: everything here mutates the state it is given and
 * never touches the database.
 */

export const PIECES_PER_PLAYER = 23;
export const DVONN_PIECES = 3;
export const SPACES = ALL_SPACES.length;

export function appendLog(gameState: DvonnGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: DvonnGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: DvonnGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: DvonnGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: DvonnGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function opponentOf(gameState: DvonnGameState, email: string) {
  return gameState.public.players.find(
    (p) => p.email !== email,
  ) as DvonnPlayerState;
}

export function playerOfSide(gameState: DvonnGameState, side: Side) {
  return gameState.public.players.find(
    (p) => p.side === side,
  ) as DvonnPlayerState;
}

export function isGameOver(gameState: DvonnGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function buildDvonnGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): DvonnGameState {
  const first = Math.floor(random() * 2);
  const playersMetadata: DvonnPlayerState[] = players
    .slice(0, 2)
    .map((player, i) => ({
      email: player.email,
      lastActionAt: 0,
      side: i === first ? "WHITE" : "BLACK",
      pieces: PIECES_PER_PLAYER,
      // White places the first and third DVONN piece, black the second.
      dvonn: i === first ? 2 : 1,
      isBot: !!player.isBot,
    }));
  const starter = playersMetadata[first];

  return {
    public: {
      id: lobbyUID,
      game: "dvonn",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "PLACE",
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${starter.email} plays white and places the first DVONN piece.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const stackAt = (gameState: DvonnGameState, coord: Coord) =>
  gameState.public.stacks?.[coord];
export const isOccupied = (gameState: DvonnGameState, coord: Coord) =>
  !!stackAt(gameState, coord)?.length;
export const isEmpty = (gameState: DvonnGameState, coord: Coord) =>
  isSpace(coord) && !isOccupied(gameState, coord);
export const topOf = (
  gameState: DvonnGameState,
  coord: Coord,
): Piece | undefined => {
  const stack = stackAt(gameState, coord);
  return stack?.[stack.length - 1];
};
export const heightOf = (gameState: DvonnGameState, coord: Coord) =>
  stackAt(gameState, coord)?.length ?? 0;
export const hasDvonn = (stack: Piece[] | undefined) =>
  !!stack?.includes("DVONN");

/** A stack with every one of its six neighbours on the board occupied cannot move. */
export function isSurrounded(gameState: DvonnGameState, coord: Coord) {
  const around = neighbours(coord);
  return around.length === 6 && around.every((c) => isOccupied(gameState, c));
}

/** Where the stack at `from` may go: exactly its height away, in a straight line, onto pieces. */
export function movesFrom(gameState: DvonnGameState, from: Coord): Coord[] {
  const stack = stackAt(gameState, from);
  if (!stack?.length) return [];
  const top = stack[stack.length - 1];
  if (top === "DVONN") return [];
  if (isSurrounded(gameState, from)) return [];
  const targets: Coord[] = [];
  for (const direction of DIRECTIONS) {
    const to = step(from, direction, stack.length);
    if (isSpace(to) && isOccupied(gameState, to)) targets.push(to);
  }
  return targets;
}

export function stacksOf(gameState: DvonnGameState, side: Side): Coord[] {
  return Object.keys(gameState.public.stacks || {}).filter(
    (coord) => topOf(gameState, coord) === side,
  );
}

export function allMoves(
  gameState: DvonnGameState,
  side: Side,
): [Coord, Coord][] {
  const moves: [Coord, Coord][] = [];
  for (const from of stacksOf(gameState, side)) {
    for (const to of movesFrom(gameState, from)) moves.push([from, to]);
  }
  return moves;
}

/** Every occupied space linked, through occupied spaces, to a DVONN piece. */
export function connectedToDvonn(gameState: DvonnGameState): Set<Coord> {
  const stacks = gameState.public.stacks || {};
  const seen = new Set<Coord>();
  const queue = Object.keys(stacks).filter((c) => hasDvonn(stacks[c]));
  for (const c of queue) seen.add(c);
  while (queue.length) {
    const current = queue.pop() as Coord;
    for (const next of neighbours(current)) {
      if (stacks[next]?.length && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/** Pieces each side controls: the heights of the stacks topped by their colour. */
export function scores(gameState: DvonnGameState): {
  WHITE: number;
  BLACK: number;
} {
  const totals = { WHITE: 0, BLACK: 0 };
  for (const [coord, stack] of Object.entries(gameState.public.stacks || {})) {
    const top = topOf(gameState, coord);
    if (top === "WHITE" || top === "BLACK") totals[top] += stack.length;
  }
  return totals;
}

export function piecesPlaced(gameState: DvonnGameState) {
  return Object.values(gameState.public.stacks || {}).reduce(
    (sum, stack) => sum + stack.length,
    0,
  );
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function finish(gameState: DvonnGameState) {
  const totals = scores(gameState);
  gameState.public.scores = totals;
  gameState.public.status = "GAME_OVER";
  const white = playerOfSide(gameState, "WHITE");
  const black = playerOfSide(gameState, "BLACK");
  const winner =
    totals.WHITE === totals.BLACK
      ? null
      : totals.WHITE > totals.BLACK
        ? white
        : black;
  if (winner) gameState.public.winner = winner.email;
  else gameState.public.draw = true;
  announce(
    gameState,
    winner ? `${winner.email} wins!` : "The game is a draw.",
    `White controls ${totals.WHITE} pieces, black ${totals.BLACK}.`,
  );
  publishLog(gameState);
}

/** Take every stack that lost contact with the DVONN pieces off the board. */
function removeDisconnected(gameState: DvonnGameState): Coord[] {
  const stacks = { ...(gameState.public.stacks || {}) };
  const linked = connectedToDvonn(gameState);
  const removed: Coord[] = [];
  const tops: Piece[] = [];
  for (const coord of Object.keys(stacks)) {
    if (!linked.has(coord)) {
      removed.push(coord);
      tops.push(stacks[coord][stacks[coord].length - 1]);
      delete stacks[coord];
    }
  }
  if (removed.length) {
    gameState.public.stacks = stacks;
    gameState.public.lastMove = {
      ...gameState.public.lastMove,
      removed,
      removedTops: tops,
    };
  }
  return removed;
}

/** After a move: the opponent moves if they can, else the mover again, else the game ends. */
function passTurn(gameState: DvonnGameState, mover: DvonnPlayerState) {
  const other = opponentOf(gameState, mover.email);
  gameState.public.turn += 1;
  if (allMoves(gameState, other.side).length > 0) {
    gameState.public.activePlayer = other.email;
    return;
  }
  if (allMoves(gameState, mover.side).length > 0) {
    announce(gameState, `${other.email} cannot move and passes.`);
    gameState.public.activePlayer = mover.email;
    return;
  }
  finish(gameState);
}

/** Opening: put a piece on any empty space, DVONN pieces first. */
export function placePiece(
  gameState: DvonnGameState,
  coord: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "PLACE") return fail("All pieces are placed.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!isEmpty(gameState, coord)) return fail("Choose an empty space.");

  const piece: Piece = player.dvonn > 0 ? "DVONN" : player.side;
  if (piece === "DVONN") player.dvonn -= 1;
  else player.pieces -= 1;
  gameState.public.stacks = {
    ...(gameState.public.stacks || {}),
    [coord]: [piece],
  };
  gameState.public.lastMove = { placed: coord };
  player.lastActionAt = Date.now();
  announce(
    gameState,
    `${player.email} places a ${piece === "DVONN" ? "DVONN" : piece.toLowerCase()} piece on ${coord}.`,
  );

  const other = opponentOf(gameState, player.email);
  gameState.public.turn += 1;
  if (piecesPlaced(gameState) >= SPACES) {
    gameState.public.phase = "MOVE";
    const white = playerOfSide(gameState, "WHITE");
    gameState.public.activePlayer = white.email;
    announce(gameState, "The board is full. White moves first.");
    if (allMoves(gameState, "WHITE").length === 0)
      passTurn(gameState, opponentOf(gameState, white.email));
    return { ok: true };
  }
  gameState.public.activePlayer = other.email;
  return { ok: true };
}

/** Move a stack you control exactly its height, in a straight line, onto other pieces. */
export function moveStack(
  gameState: DvonnGameState,
  from: Coord,
  to: Coord,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  if (gameState.public.phase !== "MOVE") return fail("Place all pieces first.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  const stack = stackAt(gameState, from);
  if (!stack?.length || stack[stack.length - 1] !== player.side)
    return fail("Choose a stack with your piece on top.");
  if (isSurrounded(gameState, from))
    return fail("That stack is surrounded and cannot move.");
  if (!movesFrom(gameState, from).includes(to))
    return fail(
      `A stack of ${stack.length} moves exactly ${stack.length} space${stack.length === 1 ? "" : "s"} in a straight line onto other pieces.`,
    );

  const stacks = { ...(gameState.public.stacks || {}) };
  stacks[to] = [...(stacks[to] || []), ...stack];
  delete stacks[from];
  gameState.public.stacks = stacks;
  gameState.public.lastMove = { from, to };
  player.lastActionAt = Date.now();

  const removed = removeDisconnected(gameState);
  const lost = removed.length
    ? ` ${removed.length} stack${removed.length === 1 ? "" : "s"} lost contact with the DVONN pieces and ${removed.length === 1 ? "is" : "are"} removed.`
    : "";
  announce(
    gameState,
    `${player.email} moves a stack of ${stack.length} from ${from} to ${to}.${lost}`,
  );

  passTurn(gameState, player);
  return { ok: true };
}

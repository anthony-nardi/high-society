import {
  Colour,
  Coord,
  LyngkGameState,
  LyngkPlayerState,
  LyngkScore,
  Piece,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import { ALL_SPOTS, DIRECTIONS, isSpot, step } from "./board";

/*
 * Pure rules for LYNGK: everything here mutates the state it is given and
 * never touches the database.
 */

export const COLOURS: Colour[] = ["RED", "BLUE", "GREEN", "BLACK", "IVORY"];
export const PIECES_PER_COLOUR = 8;
export const JOKERS = 3;
export const MAX_HEIGHT = 5;
export const CLAIMS_PER_PLAYER = 2;
/** A double, triple or quadruple move: at most three links. */
export const MAX_LINKS = 3;

export function appendLog(gameState: LyngkGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: LyngkGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: LyngkGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: LyngkGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: LyngkGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function opponentOf(gameState: LyngkGameState, email: string) {
  return gameState.public.players.find(
    (p) => p.email !== email,
  ) as LyngkPlayerState;
}

export function isGameOver(gameState: LyngkGameState) {
  return gameState.public.status === "GAME_OVER";
}

/** A full bag of pieces, shuffled with the given random source. */
export function shuffledPieces(random: () => number = Math.random): Piece[] {
  const bag: Piece[] = [];
  for (const colour of COLOURS)
    for (let i = 0; i < PIECES_PER_COLOUR; i++) bag.push(colour);
  for (let i = 0; i < JOKERS; i++) bag.push("JOKER");
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function buildLyngkGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): LyngkGameState {
  const first = Math.floor(random() * 2);
  const playersMetadata: LyngkPlayerState[] = players
    .slice(0, 2)
    .map((player) => ({
      email: player.email,
      lastActionAt: 0,
      scored: 0,
      isBot: !!player.isBot,
    }));
  const starter = playersMetadata[first];

  const bag = shuffledPieces(random);
  const stacks: { [coord: Coord]: Piece[] } = {};
  ALL_SPOTS.forEach((spot, i) => {
    stacks[spot] = [bag[i]];
  });

  return {
    public: {
      id: lobbyUID,
      game: "lyngk",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      stacks,
      turn: 1,
    },
    private: {
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${starter.email} moves first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const stackAt = (gameState: LyngkGameState, coord: Coord) =>
  gameState.public.stacks?.[coord];
export const topOf = (stack: Piece[] | undefined): Piece | undefined =>
  stack?.[stack.length - 1];

/** Who has claimed a colour, if anyone. */
export function claimerOf(
  gameState: LyngkGameState,
  piece: Piece | undefined,
): string | undefined {
  if (!piece || piece === "JOKER") return undefined;
  return gameState.public.players.find((p) => p.colours?.includes(piece))
    ?.email;
}

export function unclaimedColours(gameState: LyngkGameState): Colour[] {
  return COLOURS.filter((c) => !claimerOf(gameState, c));
}

/** Whether `email` may pick up the stack at `coord`: neutral tops and their own. */
export function mayMove(
  gameState: LyngkGameState,
  email: string,
  coord: Coord,
) {
  const top = topOf(stackAt(gameState, coord));
  if (!top || top === "JOKER") return false;
  const owner = claimerOf(gameState, top);
  return !owner || owner === email;
}

/** Whether a moving stack may come to rest on a target stack. */
export function mayLand(
  gameState: LyngkGameState,
  mover: Piece[],
  target: Piece[],
) {
  if (mover.length + target.length > MAX_HEIGHT) return false;
  const colours = [...mover, ...target].filter((p) => p !== "JOKER");
  if (new Set(colours).size !== colours.length) return false;
  const top = topOf(mover);
  if (!claimerOf(gameState, top)) {
    // Neutral: a single only onto a single, a stack onto nothing taller than itself.
    if (mover.length === 1) return target.length === 1;
    return target.length <= mover.length;
  }
  return true;
}

/** The first occupied spot from `from` in a direction, crossing empty spots only. */
export function firstOccupied(
  gameState: LyngkGameState,
  from: Coord,
  direction: [number, number],
  ignore: Coord,
): Coord | null {
  let current = step(from, direction);
  while (isSpot(current)) {
    if (current !== ignore && stackAt(gameState, current)?.length)
      return current;
    current = step(current, direction);
  }
  return null;
}

/**
 * Every legal path for the stack at `from` by `email`: from, then any LYNGK
 * links (spots topped by the mover's own colour, each used once), then the
 * landing spot.
 */
export function pathsFrom(
  gameState: LyngkGameState,
  email: string,
  from: Coord,
): Coord[][] {
  const stack = stackAt(gameState, from);
  if (!stack?.length || !mayMove(gameState, email, from)) return [];
  const top = topOf(stack) as Piece;
  const linking = claimerOf(gameState, top) === email;
  const paths: Coord[][] = [];

  const extend = (current: Coord, path: Coord[], used: Set<Coord>) => {
    for (const direction of DIRECTIONS) {
      const next = firstOccupied(gameState, current, direction, from);
      if (!next || used.has(next)) continue;
      const target = stackAt(gameState, next) as Piece[];
      if (linking && topOf(target) === top) {
        // A LYNGK point: the stack passes on from here instead of landing.
        if (path.length - 1 < MAX_LINKS) {
          extend(next, [...path, next], new Set([...used, next]));
        }
        continue;
      }
      if (mayLand(gameState, stack, target)) paths.push([...path, next]);
    }
  };
  extend(from, [from], new Set([from]));
  return paths;
}

export function allPaths(gameState: LyngkGameState, email: string): Coord[][] {
  return Object.keys(gameState.public.stacks || {}).flatMap((from) =>
    pathsFrom(gameState, email, from),
  );
}

export function hasMove(gameState: LyngkGameState, email: string) {
  return Object.keys(gameState.public.stacks || {}).some(
    (from) => pathsFrom(gameState, email, from).length > 0,
  );
}

/** Fives taken, then stacks of four, three, two and one controlled on the board. */
export function scoreOf(gameState: LyngkGameState, email: string): LyngkScore {
  const player = playerByEmail(gameState, email);
  const score: LyngkScore = [player?.scored ?? 0, 0, 0, 0, 0];
  for (const stack of Object.values(gameState.public.stacks || {})) {
    if (claimerOf(gameState, topOf(stack)) !== email) continue;
    if (stack.length >= 1 && stack.length <= 4) score[5 - stack.length] += 1;
  }
  return score;
}

export function compareScores(a: LyngkScore, b: LyngkScore) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

const fail = (reason: string): ActionResult => ({ ok: false, reason });

function finish(gameState: LyngkGameState) {
  const [a, b] = gameState.public.players;
  const scores = {
    [a.email]: scoreOf(gameState, a.email),
    [b.email]: scoreOf(gameState, b.email),
  };
  gameState.public.scores = scores;
  gameState.public.status = "GAME_OVER";
  const cmp = compareScores(scores[a.email], scores[b.email]);
  const winner = cmp === 0 ? null : cmp > 0 ? a : b;
  if (winner) gameState.public.winner = winner.email;
  else gameState.public.draw = true;
  announce(
    gameState,
    winner ? `${winner.email} wins!` : "The game is a draw.",
    `${a.email} ${scores[a.email][0]} stacks of five, ${b.email} ${scores[b.email][0]}.`,
  );
  publishLog(gameState);
}

/** After a move: the opponent moves if they can, else the mover again, else the game ends. */
function passTurn(gameState: LyngkGameState, mover: LyngkPlayerState) {
  const other = opponentOf(gameState, mover.email);
  gameState.public.turn += 1;
  delete mover.claimedThisTurn;
  if (hasMove(gameState, other.email)) {
    gameState.public.activePlayer = other.email;
    delete other.claimedThisTurn;
    return;
  }
  if (hasMove(gameState, mover.email)) {
    announce(gameState, `${other.email} cannot move and passes.`);
    gameState.public.activePlayer = mover.email;
    return;
  }
  finish(gameState);
}

/** Before moving: make a free colour yours, at most one per turn and two in all. */
export function claimColour(
  gameState: LyngkGameState,
  colour: Colour,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!COLOURS.includes(colour))
    return fail("That is not a colour you can claim.");
  if ((player.colours?.length ?? 0) >= CLAIMS_PER_PLAYER)
    return fail("You already have two colours.");
  if (player.claimedThisTurn) return fail("One claim per turn.");
  if (claimerOf(gameState, colour)) return fail("That colour is taken.");

  player.colours = [...(player.colours || []), colour];
  player.claimedThisTurn = true;
  player.lastActionAt = Date.now();
  gameState.public.lastMove = { claimed: colour };
  announce(gameState, `${player.email} claims ${colour.toLowerCase()}.`);
  return { ok: true };
}

/** Move a piece or stack along a path of first-met spots, linking through your own colour. */
export function moveStack(
  gameState: LyngkGameState,
  path: Coord[],
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (!Array.isArray(path) || path.length < 2)
    return fail("A move needs a start and a landing spot.");
  const from = path[0];
  const legal = pathsFrom(gameState, player.email, from);
  if (
    !legal.some(
      (p) => p.length === path.length && p.every((c, i) => c === path[i]),
    )
  )
    return fail("That is not a legal move.");

  const stacks = { ...(gameState.public.stacks || {}) };
  const mover = stacks[from];
  const to = path[path.length - 1];
  const landed = [...stacks[to], ...mover];
  stacks[to] = landed;
  delete stacks[from];
  gameState.public.stacks = stacks;
  gameState.public.lastMove = { path };
  player.lastActionAt = Date.now();
  const links = path.length - 2;
  let title = `${player.email} moves a stack of ${mover.length} from ${from} to ${to}${links ? ` via ${links} LYNGK link${links === 1 ? "" : "s"}` : ""}.`;

  if (landed.length === MAX_HEIGHT) {
    const owner = claimerOf(gameState, topOf(landed));
    if (owner) {
      const scorer = playerByEmail(gameState, owner) as LyngkPlayerState;
      scorer.scored += 1;
      delete stacks[to];
      gameState.public.stacks = stacks;
      gameState.public.lastMove = { path, removed: to, removedPieces: landed };
      title += ` A stack of five is complete: ${scorer.email} scores it (${scorer.scored}).`;
    } else {
      title += " A neutral stack of five is complete and stays as an obstacle.";
    }
  }
  announce(gameState, title);

  passTurn(gameState, player);
  return { ok: true };
}

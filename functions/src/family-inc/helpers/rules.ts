import {
  ChipCounts,
  ChipValue,
  CHIP_VALUES,
  FamilyIncGameState,
  FamilyIncPlayerState,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";

/*
 * Pure rules for Family Inc.: everything here mutates the game state it is
 * given and never touches the database. Randomness comes in through the
 * `random` argument so games can be replayed in tests.
 */

export const WIN_SCORE = 100;
export const DIAMONDS_TO_SCORE = 3;
export const DIAMOND_SCORE = 50;
/** Busting after this many draws or fewer earns a diamond. */
export const DIAMOND_DRAW_LIMIT = 3;

/** 16 each of 1 to 5 and 11 each of 6 to 10: 135 chips. */
export const INITIAL_PILE: ChipCounts = {
  "1": 16,
  "2": 16,
  "3": 16,
  "4": 16,
  "5": 16,
  "6": 11,
  "7": 11,
  "8": 11,
  "9": 11,
  "10": 11,
};

export const count = (counts: ChipCounts | undefined, value: ChipValue) =>
  counts?.[value] || 0;

export const pileSize = (counts: ChipCounts | undefined) =>
  CHIP_VALUES.reduce((sum, value) => sum + count(counts, value), 0);

export const chipPoints = (counts: ChipCounts | undefined) =>
  CHIP_VALUES.reduce(
    (sum, value) => sum + count(counts, value) * Number(value),
    0,
  );

/** Values the player holds at least one of, ascending. */
export const heldValues = (counts: ChipCounts | undefined) =>
  CHIP_VALUES.filter((value) => count(counts, value) > 0);

function addChip(counts: ChipCounts, value: ChipValue, n = 1): ChipCounts {
  const next = { ...counts };
  const total = (next[value] || 0) + n;
  if (total > 0) next[value] = total;
  else delete next[value];
  return next;
}

export function appendLog(gameState: FamilyIncGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: FamilyIncGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: FamilyIncGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function getActivePlayer(gameState: FamilyIncGameState) {
  return gameState.public.players.find(
    (player) => player.email === gameState.public.activePlayer,
  );
}

export function isGameOver(gameState: FamilyIncGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function buildFamilyIncGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): FamilyIncGameState {
  const playersMetadata: FamilyIncPlayerState[] = players.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    score: 0,
    diamonds: 0,
    isBot: !!player.isBot,
  }));
  const starter =
    playersMetadata[Math.floor(random() * playersMetadata.length)];

  return {
    public: {
      id: lobbyUID,
      game: "family-inc",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      pile: { ...INITIAL_PILE },
      drawnThisTurn: [],
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

/** Everything not in front of a player goes back into the pile. */
function refillPile(gameState: FamilyIncGameState) {
  const pile: ChipCounts = { ...INITIAL_PILE };
  for (const player of gameState.public.players) {
    for (const value of CHIP_VALUES) {
      const n = count(player.held, value);
      if (n) pile[value] = Math.max(0, (pile[value] || 0) - n);
    }
  }
  gameState.public.pile = pile;
}

/** Draws one chip at random from the pile, weighted by what is left. */
function drawFromPile(
  gameState: FamilyIncGameState,
  random: () => number,
): ChipValue {
  const pile = gameState.public.pile;
  const total = pileSize(pile);
  if (total === 0) refillPile(gameState);
  let roll = Math.floor(random() * pileSize(gameState.public.pile));
  for (const value of CHIP_VALUES) {
    const n = count(gameState.public.pile, value);
    if (roll < n) {
      gameState.public.pile = addChip(gameState.public.pile, value, -1);
      return value;
    }
    roll -= n;
  }
  throw new Error("The pile is empty.");
}

function finish(gameState: FamilyIncGameState, winner: FamilyIncPlayerState) {
  gameState.public.status = "GAME_OVER";
  gameState.public.winner = winner.email;
  announce(
    gameState,
    `${winner.email} reaches ${winner.score} points and wins!`,
    "Game over.",
  );
  publishLog(gameState);
}

/** The next player's turn: they bank whatever is in front of them first. */
function startNextTurn(gameState: FamilyIncGameState) {
  const players = gameState.public.players;
  const index = players.findIndex(
    (p) => p.email === gameState.public.activePlayer,
  );
  const next = players[(index + 1) % players.length];
  gameState.public.activePlayer = next.email;
  gameState.public.drawnThisTurn = [];
  gameState.public.turn += 1;

  const banked = chipPoints(next.held);
  if (banked > 0) {
    next.score += banked;
    const values = heldValues(next.held)
      .map((value) => `${count(next.held, value)}×${value}`)
      .join(", ");
    delete next.held;
    announce(
      gameState,
      `${next.email} banks ${banked} point${banked === 1 ? "" : "s"} (${values}).`,
      `${next.email} now has ${next.score}.`,
    );
    if (next.score >= WIN_SCORE) {
      finish(gameState, next);
      return;
    }
  }
}

const fail = (reason: string): ActionResult => ({ ok: false, reason });

/** The active player draws a chip. A repeat value busts the turn. */
export function draw(
  gameState: FamilyIncGameState,
  random: () => number = Math.random,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");

  const value = drawFromPile(gameState, random);
  gameState.public.lastDraw = value;
  player.lastActionAt = Date.now();

  if (count(player.held, value) === 0) {
    player.held = addChip(player.held || {}, value, 1);
    gameState.public.drawnThisTurn = [
      ...(gameState.public.drawnThisTurn || []),
      value,
    ];
    delete gameState.public.lastOutcome;
    announce(gameState, `${player.email} drew a ${value}.`);
    if (pileSize(gameState.public.pile) === 0) refillPile(gameState);
    return { ok: true };
  }

  // Bust: everything in front of the player leaves the game.
  const draws = (gameState.public.drawnThisTurn || []).length + 1;
  const lost = chipPoints(player.held);
  delete player.held;
  if (pileSize(gameState.public.pile) === 0) refillPile(gameState);

  if (draws <= DIAMOND_DRAW_LIMIT) {
    player.diamonds += 1;
    if (player.diamonds >= DIAMONDS_TO_SCORE) {
      player.diamonds = 0;
      player.score += DIAMOND_SCORE;
      gameState.public.lastOutcome = "fifty";
      announce(
        gameState,
        `${player.email} busted on a ${value} after ${draws} draw${draws === 1 ? "" : "s"} and completes three diamonds: +${DIAMOND_SCORE}!`,
        `${player.email} now has ${player.score}.`,
      );
      if (player.score >= WIN_SCORE) {
        finish(gameState, player);
        return { ok: true };
      }
    } else {
      gameState.public.lastOutcome = "diamond";
      announce(
        gameState,
        `${player.email} busted on a ${value} after ${draws} draw${draws === 1 ? "" : "s"} and receives a diamond.`,
        `${player.email} has ${player.diamonds} diamond${player.diamonds === 1 ? "" : "s"}.`,
      );
    }
  } else {
    gameState.public.lastOutcome = "bust";
    announce(
      gameState,
      `${player.email} busted on a ${value} after ${draws} draws and loses ${lost} point${lost === 1 ? "" : "s"} of chips.`,
    );
  }

  startNextTurn(gameState);
  return { ok: true };
}

/** The active player stops, steals matching chips, and the turn passes. */
export function stop(gameState: FamilyIncGameState): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if ((gameState.public.drawnThisTurn || []).length === 0) {
    return fail("Draw at least one chip before stopping.");
  }

  player.lastActionAt = Date.now();
  const stolen: string[] = [];
  for (const other of gameState.public.players) {
    if (other.email === player.email) continue;
    for (const value of heldValues(player.held)) {
      const n = count(other.held, value);
      if (n > 0) {
        player.held = addChip(player.held || {}, value, n);
        other.held = addChip(other.held || {}, value, -n);
        if (heldValues(other.held).length === 0) delete other.held;
        stolen.push(`${n}×${value} from ${other.email}`);
      }
    }
  }

  const keeps = chipPoints(player.held);
  gameState.public.lastOutcome = "stop";
  announce(
    gameState,
    stolen.length
      ? `${player.email} stops with ${keeps} points of chips and steals ${stolen.join(", ")}.`
      : `${player.email} stops with ${keeps} point${keeps === 1 ? "" : "s"} of chips.`,
    "They bank them at the start of their next turn, unless someone steals them first.",
  );

  startNextTurn(gameState);
  return { ok: true };
}

/** Public information: chance that the next draw busts the active player. */
export function bustChance(gameState: FamilyIncGameState) {
  const player = getActivePlayer(gameState);
  const total = pileSize(gameState.public.pile);
  if (!player || total === 0) return 0;
  const bad = heldValues(player.held).reduce(
    (sum, value) => sum + count(gameState.public.pile, value),
    0,
  );
  return bad / total;
}

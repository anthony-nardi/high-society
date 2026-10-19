import {
  Breakdown,
  CoralReefGameState,
  CoralReefPlayerState,
  Grid,
  Play,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  canMove,
  canPlace,
  cellKey,
  chooseFlips,
  countOf,
  faceUp,
  foodWeb,
  fullDeck,
  HAND_SIZE,
  label,
  placings,
  PLANKTON_PLACES,
  ROUNDS,
  scoreGrid,
} from "./board";

/*
 * Pure rules for Ecosystem: Coral Reef: everything here mutates the state
 * it is given and never touches the database. Picks are simultaneous:
 * each choice is kept private until everyone has made one, then all are
 * placed at once.
 */

export function appendLog(gameState: CoralReefGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: CoralReefGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: CoralReefGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: CoralReefGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: CoralReefGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: CoralReefGameState) {
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

let neutralRandom: () => number = Math.random;
/** Tests pin the neutral hand's discards. */
export function setNeutralRandom(random: () => number) {
  neutralRandom = random;
}

export function buildCoralReefGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): CoralReefGameState {
  const seats = players.slice(0, 6);
  const deck = shuffled(fullDeck(), random);
  const playersMetadata: CoralReefPlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    hand: deck.splice(0, HAND_SIZE),
    isBot: !!player.isBot,
  }));
  const state: CoralReefGameState = {
    public: {
      id: lobbyUID,
      game: "coral-reef",
      players: playersMetadata,
      activePlayer: playersMetadata[0].email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      round: 1,
      pick: 0,
      turn: 1,
    },
    private: {
      deck,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. Ten cards each: keep one, place it, pass the rest left. Round 2 passes right.${seats.length === 2 ? " A neutral third hand joins the circle." : ""}`,
        },
      ],
    },
  };
  if (seats.length === 2)
    state.public.neutral = { hand: deck.splice(0, HAND_SIZE) };
  setActive(state);
  return state;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const hasChosen = (gameState: CoralReefGameState, email: string) =>
  (gameState.public.chosen || []).includes(email);

export function mayAct(gameState: CoralReefGameState, email: string) {
  if (isGameOver(gameState)) return false;
  const player = playerByEmail(gameState, email);
  return (
    !!player && !hasChosen(gameState, email) && (player.hand || []).length > 0
  );
}

export const gridOf = (player: CoralReefPlayerState): Grid => player.grid || {};

/** Why a play is not allowed, or nothing. */
export function playProblem(
  gameState: CoralReefGameState,
  email: string,
  play: Omit<Play, "email">,
): string | null {
  const player = playerByEmail(gameState, email);
  if (!player) return "You are not at this table.";
  if (hasChosen(gameState, email)) return "You have already chosen this pick.";
  const hand = player.hand || [];
  if (!Number.isInteger(play.card) || play.card < 0 || play.card >= hand.length)
    return "That card is not in your hand.";
  if (!canPlace(gridOf(player), play.row, play.col))
    return "A card must go in an empty space touching your reef, within 4 rows and 5 columns.";
  if (play.swap && play.move)
    return "An Octopus moves one card or swaps two, not both.";
  if (play.swap || play.move) {
    if (hand[play.card] !== "OCTOPUS")
      return "Only an Octopus lets you move or swap cards.";
    const grid: Grid = {
      ...gridOf(player),
      [cellKey(play.row, play.col)]: "OCTOPUS",
    };
    if (play.swap) {
      const [a, b] = play.swap;
      if (!grid[a] || !grid[b] || a === b)
        return "Swap two different cards in your reef.";
    }
    if (play.move) {
      const [from, to] = play.move;
      if (!canMove(grid, from, to))
        return "Move a card to an empty space that keeps your reef whole and within 4 by 5.";
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Every player's breakdown, whales' flips chosen, the plankton placing compared across the table. */
export function scoreAll(gameState: CoralReefGameState): Breakdown[] {
  const players = gameState.public.players;
  const grids = players.map((p) => gridOf(p));
  const flips = grids.map((g) => chooseFlips(g));
  const plankton = grids.map((g, i) =>
    countOf(faceUp(g, flips[i]), "PLANKTON"),
  );
  // The neutral hand's set-aside cards compete for the plankton too.
  const neutral = gameState.public.neutral?.discards || [];
  if (gameState.public.neutral)
    plankton.push(neutral.filter((c) => c === "PLANKTON").length);
  const planktonPoints = placings(plankton, PLANKTON_PLACES);
  return players.map((p, i) => {
    const byType = scoreGrid(grids[i], flips[i]);
    if (planktonPoints[i]) byType.PLANKTON = planktonPoints[i];
    const web = foodWeb(byType);
    return {
      email: p.email,
      byType,
      ...web,
      plankton: plankton[i],
      ...(flips[i].length ? { flipped: flips[i] } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

/** The active player is the first who still has to choose. */
function setActive(gameState: CoralReefGameState) {
  const waiting = gameState.public.players.find((p) =>
    mayAct(gameState, p.email),
  );
  if (waiting) {
    gameState.public.activePlayer = waiting.email;
    waiting.lastActionAt = Date.now();
  }
}

function applyPlay(gameState: CoralReefGameState, play: Play) {
  const player = playerByEmail(gameState, play.email) as CoralReefPlayerState;
  const hand = [...(player.hand || [])];
  const [card] = hand.splice(play.card, 1);
  if (hand.length) player.hand = hand;
  else delete player.hand;
  const grid: Grid = { ...gridOf(player) };
  const cell = cellKey(play.row, play.col);
  grid[cell] = card;
  let swapped: [string, string] | undefined;
  let moved: [string, string] | undefined;
  if (card === "OCTOPUS" && play.swap) {
    const [a, b] = play.swap;
    if (grid[a] && grid[b] && a !== b) {
      [grid[a], grid[b]] = [grid[b], grid[a]];
      swapped = [a, b];
    }
  } else if (card === "OCTOPUS" && play.move) {
    const [from, to] = play.move;
    if (canMove(grid, from, to)) {
      grid[to] = grid[from];
      delete grid[from];
      moved = [from, to];
    }
  }
  player.grid = grid;
  return {
    email: play.email,
    card,
    cell,
    ...(swapped ? { swapped } : {}),
    ...(moved ? { moved } : {}),
  };
}

/** Hands move one seat along the circle, the neutral hand included; left in round 1, right in round 2. */
function passHands(gameState: CoralReefGameState) {
  const pub = gameState.public;
  const seats: (CoralReefPlayerState | "neutral")[] = [...pub.players];
  if (pub.neutral) seats.splice(1, 0, "neutral");
  const hands = seats.map((s) =>
    s === "neutral" ? pub.neutral?.hand || [] : s.hand || [],
  );
  const shift = pub.round === 1 ? 1 : -1;
  seats.forEach((s, i) => {
    const incoming = hands[(i - shift + seats.length) % seats.length];
    if (s === "neutral") {
      if (incoming.length)
        (pub.neutral as NonNullable<typeof pub.neutral>).hand = incoming;
      else delete (pub.neutral as NonNullable<typeof pub.neutral>).hand;
    } else if (incoming.length) s.hand = incoming;
    else delete s.hand;
  });
}

/** The neutral hand sets one card aside, face up, each pick. */
function neutralDiscards(gameState: CoralReefGameState) {
  const neutral = gameState.public.neutral;
  if (!neutral?.hand?.length) return;
  const hand = [...neutral.hand];
  const [card] = hand.splice(Math.floor(neutralRandom() * hand.length), 1);
  if (hand.length) neutral.hand = hand;
  else delete neutral.hand;
  neutral.discards = [...(neutral.discards || []), card];
}

function finish(gameState: CoralReefGameState) {
  const pub = gameState.public;
  pub.status = "GAME_OVER";
  pub.results = scoreAll(gameState);
  const best = Math.max(...pub.results.map((r) => r.total));
  const winners = pub.results.filter((r) => r.total === best);
  if (winners.length === 1) pub.winner = winners[0].email;
  else pub.draw = true;
  announce(
    gameState,
    winners.length === 1
      ? `${winners[0].email} wins!`
      : `${winners.map((w) => w.email).join(" and ")} share the win.`,
    pub.results
      .map(
        (r) =>
          `${r.email} ${r.total} (producers ${r.producers}, prey ${r.prey}, predators ${r.predators}, food web +${r.foodWeb})`,
      )
      .join("; ") + ".",
  );
  publishLog(gameState);
}

function resolvePick(gameState: CoralReefGameState) {
  const pub = gameState.public;
  const plays = gameState.private.plays || [];
  pub.lastPick = plays.map((play) => applyPlay(gameState, play));
  delete gameState.private.plays;
  delete pub.chosen;
  neutralDiscards(gameState);
  pub.pick += 1;
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `Pick ${pub.pick} of round ${pub.round}: ${pub.lastPick.map((p) => `${p.email} ${label(p.card)}`).join(", ")}.`,
  });
  if (pub.pick >= HAND_SIZE) {
    if (pub.round >= ROUNDS) {
      finish(gameState);
      return;
    }
    pub.round += 1;
    pub.pick = 0;
    const deck = gameState.private.deck || [];
    for (const p of pub.players) p.hand = deck.splice(0, HAND_SIZE);
    if (pub.neutral) pub.neutral.hand = deck.splice(0, HAND_SIZE);
    gameState.private.deck = deck;
    announce(
      gameState,
      "Round 2 begins: ten new cards each, passed to the right.",
    );
  } else {
    passHands(gameState);
    pub.notification = {
      timestamp: Date.now(),
      title: `Pick ${pub.pick} placed. Hands pass ${pub.round === 1 ? "left" : "right"}.`,
    };
  }
  setActive(gameState);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Keep a card from your hand and say where it goes; it is placed when everyone has chosen. */
export function choose(
  gameState: CoralReefGameState,
  email: string,
  play: Omit<Play, "email">,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const problem = playProblem(gameState, email, play);
  if (problem) return { ok: false, reason: problem };
  const player = playerByEmail(gameState, email) as CoralReefPlayerState;
  const entry: Play = { email, card: play.card, row: play.row, col: play.col };
  if (play.swap) entry.swap = [play.swap[0], play.swap[1]];
  if (play.move) entry.move = [play.move[0], play.move[1]];
  gameState.private.plays = [...(gameState.private.plays || []), entry];
  gameState.public.chosen = [...(gameState.public.chosen || []), email];
  gameState.public.turn += 1;
  player.lastActionAt = Date.now();
  const everyone = gameState.public.players.every((p) =>
    hasChosen(gameState, p.email),
  );
  if (everyone) resolvePick(gameState);
  else setActive(gameState);
  return { ok: true };
}

export { scoreGrid, label };

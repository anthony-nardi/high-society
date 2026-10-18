import {
  Breakdown,
  CardType,
  EcosystemGameState,
  EcosystemPlayerState,
  Grid,
  Play,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  canPlace,
  CARD_TYPES,
  cellKey,
  countOf,
  DIVERSITY,
  fullDeck,
  HAND_SIZE,
  label,
  longestStream,
  placings,
  ROUNDS,
  scoreGrid,
  STREAM_PLACES,
  WOLF_PLACES,
} from "./board";

/*
 * Pure rules for Ecosystem: everything here mutates the state it is given
 * and never touches the database. Picks are simultaneous: each choice is
 * kept private until everyone has made one, then all are placed at once.
 */

export const NEUTRAL = "the neutral hand";

export function appendLog(gameState: EcosystemGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: EcosystemGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: EcosystemGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: EcosystemGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: EcosystemGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: EcosystemGameState) {
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

export function buildEcosystemGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): EcosystemGameState {
  const seats = players.slice(0, 6);
  const deck = shuffled(fullDeck(), random);
  const playersMetadata: EcosystemPlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    hand: deck.splice(0, HAND_SIZE),
    isBot: !!player.isBot,
  }));
  const state: EcosystemGameState = {
    public: {
      id: lobbyUID,
      game: "ecosystem",
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

export const hasChosen = (gameState: EcosystemGameState, email: string) =>
  (gameState.public.chosen || []).includes(email);

export function mayAct(gameState: EcosystemGameState, email: string) {
  if (isGameOver(gameState)) return false;
  const player = playerByEmail(gameState, email);
  return (
    !!player && !hasChosen(gameState, email) && (player.hand || []).length > 0
  );
}

export const gridOf = (player: EcosystemPlayerState): Grid => player.grid || {};

/** Why a play is not allowed, or nothing. */
export function playProblem(
  gameState: EcosystemGameState,
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
    return "A card must go in an empty space touching your ecosystem, within 4 rows and 5 columns.";
  if (play.swap) {
    if (hand[play.card] !== "RABBIT")
      return "Only a Rabbit lets you swap two cards.";
    const grid = gridOf(player);
    const [a, b] = play.swap;
    const placed = cellKey(play.row, play.col);
    const ok = (k: string) => k === placed || !!grid[k];
    if (!ok(a) || !ok(b) || a === b)
      return "Swap two different cards in your ecosystem.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Every player's breakdown, with the stream and wolf placings compared across the table. */
export function scoreAll(gameState: EcosystemGameState): Breakdown[] {
  const players = gameState.public.players;
  const grids = players.map((p) => gridOf(p));
  const streams = grids.map(longestStream);
  const wolves = grids.map((g) => countOf(g, "WOLF"));
  // The neutral hand's set-aside cards compete too; its streams all count as connected.
  const neutral = gameState.public.neutral?.discards || [];
  if (gameState.public.neutral) {
    streams.push(neutral.filter((c) => c === "STREAM").length);
    wolves.push(neutral.filter((c) => c === "WOLF").length);
  }
  const streamPoints = placings(streams, STREAM_PLACES);
  const wolfPoints = placings(wolves, WOLF_PLACES);
  return players.map((p, i) => {
    const byType = scoreGrid(grids[i]);
    if (streamPoints[i]) byType.STREAM = streamPoints[i];
    if (wolfPoints[i]) byType.WOLF = wolfPoints[i];
    const scoringTypes = CARD_TYPES.filter((t) => (byType[t] ?? 0) > 0).length;
    const diversity = DIVERSITY(scoringTypes);
    const total =
      CARD_TYPES.reduce((s, t) => s + (byType[t] ?? 0), 0) + diversity;
    return {
      email: p.email,
      byType,
      scoringTypes,
      diversity,
      total,
      stream: streams[i],
      wolves: wolves[i],
    };
  });
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

/** The active player is the first who still has to choose. */
function setActive(gameState: EcosystemGameState) {
  const waiting = gameState.public.players.find((p) =>
    mayAct(gameState, p.email),
  );
  if (waiting) {
    gameState.public.activePlayer = waiting.email;
    waiting.lastActionAt = Date.now();
  }
}

function applyPlay(gameState: EcosystemGameState, play: Play) {
  const player = playerByEmail(gameState, play.email) as EcosystemPlayerState;
  const hand = [...(player.hand || [])];
  const [card] = hand.splice(play.card, 1);
  if (hand.length) player.hand = hand;
  else delete player.hand;
  const grid: Grid = { ...gridOf(player) };
  const cell = cellKey(play.row, play.col);
  grid[cell] = card;
  let swapped: [string, string] | undefined;
  if (play.swap && card === "RABBIT") {
    const [a, b] = play.swap;
    if (grid[a] && grid[b] && a !== b) {
      [grid[a], grid[b]] = [grid[b], grid[a]];
      swapped = [a, b];
    }
  }
  player.grid = grid;
  return { email: play.email, card, cell, ...(swapped ? { swapped } : {}) };
}

/** Hands move one seat along the circle, the neutral hand included; left in round 1, right in round 2. */
function passHands(gameState: EcosystemGameState) {
  const pub = gameState.public;
  const seats: (EcosystemPlayerState | "neutral")[] = [...pub.players];
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
function neutralDiscards(gameState: EcosystemGameState) {
  const neutral = gameState.public.neutral;
  if (!neutral?.hand?.length) return;
  const hand = [...neutral.hand];
  const [card] = hand.splice(Math.floor(neutralRandom() * hand.length), 1);
  if (hand.length) neutral.hand = hand;
  else delete neutral.hand;
  neutral.discards = [...(neutral.discards || []), card];
}

function finish(gameState: EcosystemGameState) {
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
          `${r.email} ${r.total} (${r.scoringTypes} scoring types, diversity ${r.diversity >= 0 ? "+" : ""}${r.diversity})`,
      )
      .join("; ") + ".",
  );
  publishLog(gameState);
}

function resolvePick(gameState: EcosystemGameState) {
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
  gameState: EcosystemGameState,
  email: string,
  play: Omit<Play, "email">,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const problem = playProblem(gameState, email, play);
  if (problem) return { ok: false, reason: problem };
  const player = playerByEmail(gameState, email) as EcosystemPlayerState;
  const entry: Play = { email, card: play.card, row: play.row, col: play.col };
  if (play.swap) entry.swap = [play.swap[0], play.swap[1]];
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
export type { CardType };

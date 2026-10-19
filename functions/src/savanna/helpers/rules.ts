import {
  Breakdown,
  Grid,
  Play,
  SavannaGameState,
  SavannaPlayerState,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  bestLionFlips,
  canPlace,
  cellKey,
  fullDeck,
  lionFlipCount,
  lionOptions,
  validLionFlips,
  GAZELLE_PLACES,
  HAND_SIZE,
  label,
  PICKS,
  placings,
  ROUNDS,
  scoreGrid,
  totalOf,
} from "./board";

/*
 * Pure rules for Ecosystem: Savanna: everything here mutates the state
 * it is given and never touches the database. Picks are simultaneous:
 * each choice is kept private until everyone has made one, then all are
 * placed at once. Eleven cards are dealt and ten placed; the last is set
 * aside.
 */

export function appendLog(gameState: SavannaGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: SavannaGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: SavannaGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: SavannaGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: SavannaGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: SavannaGameState) {
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

export function buildSavannaGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): SavannaGameState {
  const seats = players.slice(0, 6);
  const deck = shuffled(fullDeck(), random);
  const playersMetadata: SavannaPlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    hand: deck.splice(0, HAND_SIZE),
    isBot: !!player.isBot,
  }));
  const state: SavannaGameState = {
    public: {
      id: lobbyUID,
      game: "savanna",
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
          title: `Game started. Eleven cards each: keep one, place it, pass the rest left; the eleventh is set aside. Round 2 passes right.${seats.length === 2 ? " A neutral third hand joins the circle." : ""}`,
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

export const hasChosen = (gameState: SavannaGameState, email: string) =>
  (gameState.public.chosen || []).includes(email);

export function mayAct(gameState: SavannaGameState, email: string) {
  if (isGameOver(gameState)) return false;
  if (gameState.public.phase === "FLIP")
    return (gameState.public.flipping || []).includes(email);
  const player = playerByEmail(gameState, email);
  return (
    !!player && !hasChosen(gameState, email) && (player.hand || []).length > 0
  );
}

export const gridOf = (player: SavannaPlayerState): Grid => player.grid || {};

/** Why a play is not allowed, or nothing. */
export function playProblem(
  gameState: SavannaGameState,
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
  return null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Every player's breakdown, with the gazelle bonus compared across the table. */
export function scoreAll(gameState: SavannaGameState): Breakdown[] {
  const players = gameState.public.players;
  const scored = players.map((p) => scoreGrid(gridOf(p), p.flips));
  const gazelles = scored.map((s) => s.gazelles);
  // The neutral hand's set-aside gazelles compete too.
  const neutral = gameState.public.neutral?.discards || [];
  if (gameState.public.neutral)
    gazelles.push(neutral.filter((c) => c === "GAZELLE").length);
  const bonus = placings(gazelles, GAZELLE_PLACES);
  return players.map((p, i) => {
    const byType = { ...scored[i].byType };
    if (bonus[i]) byType.GAZELLE = (byType.GAZELLE ?? 0) + bonus[i];
    return {
      email: p.email,
      byType,
      total: totalOf(byType),
      gazelles: scored[i].gazelles,
      ...(scored[i].flipped.length ? { flipped: scored[i].flipped } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

/** The active player is the first who still has to choose. */
function setActive(gameState: SavannaGameState) {
  if (gameState.public.phase === "FLIP") {
    const next = (gameState.public.flipping || [])[0];
    if (next) gameState.public.activePlayer = next;
    return;
  }
  const waiting = gameState.public.players.find((p) =>
    mayAct(gameState, p.email),
  );
  if (waiting) {
    gameState.public.activePlayer = waiting.email;
    waiting.lastActionAt = Date.now();
  }
}

function applyPlay(gameState: SavannaGameState, play: Play) {
  const player = playerByEmail(gameState, play.email) as SavannaPlayerState;
  const hand = [...(player.hand || [])];
  const [card] = hand.splice(play.card, 1);
  if (hand.length) player.hand = hand;
  else delete player.hand;
  const cell = cellKey(play.row, play.col);
  player.grid = { ...gridOf(player), [cell]: card };
  return { email: play.email, card, cell };
}

/** Hands move one seat along the circle, the neutral hand included; left in round 1, right in round 2. */
function passHands(gameState: SavannaGameState) {
  const pub = gameState.public;
  const seats: (SavannaPlayerState | "neutral")[] = [...pub.players];
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
function neutralDiscards(gameState: SavannaGameState) {
  const neutral = gameState.public.neutral;
  if (!neutral?.hand?.length) return;
  const hand = [...neutral.hand];
  const [card] = hand.splice(Math.floor(neutralRandom() * hand.length), 1);
  if (hand.length) neutral.hand = hand;
  else delete neutral.hand;
  neutral.discards = [...(neutral.discards || []), card];
}

/**
 * The savannas are complete. Each lion beside a grassland flips a gazelle
 * or zebra of its owner's choosing: bots choose at once, and so does
 * anyone with no real choice; the others are asked.
 */
function finish(gameState: SavannaGameState) {
  const pub = gameState.public;
  const asked: string[] = [];
  for (const p of pub.players) {
    const grid = gridOf(p);
    const { lions, prey } = lionOptions(grid);
    const k = lionFlipCount(grid);
    if (!p.isBot && k > 0 && prey.length > lions) asked.push(p.email);
    else {
      const flips = bestLionFlips(grid);
      if (flips.length) p.flips = flips;
      else delete p.flips;
    }
  }
  if (!asked.length) {
    finalise(gameState);
    return;
  }
  pub.phase = "FLIP";
  pub.flipping = asked;
  pub.activePlayer = asked[0];
  announce(
    gameState,
    `The savannas are complete. ${asked.join(", ")} choose${asked.length === 1 ? "s" : ""} which prey the lions flip.`,
  );
}

/** A player names the prey their lions flip. */
export function flipPrey(
  gameState: SavannaGameState,
  email: string,
  cells: string[],
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const pub = gameState.public;
  if (pub.phase !== "FLIP")
    return { ok: false, reason: "The lions are not hunting yet." };
  if (!(pub.flipping || []).includes(email))
    return { ok: false, reason: "Your lions have chosen." };
  const player = playerByEmail(gameState, email) as SavannaPlayerState;
  const grid = gridOf(player);
  if (!validLionFlips(grid, cells))
    return {
      ok: false,
      reason: `Choose ${lionFlipCount(grid)} different faceup gazelles or zebras.`,
    };
  player.flips = cells;
  player.lastActionAt = Date.now();
  const rest = (pub.flipping || []).filter((e) => e !== email);
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `${email}'s lions flip ${cells.map((c) => label(grid[c])).join(", ")}.`,
  });
  if (rest.length) {
    pub.flipping = rest;
    pub.activePlayer = rest[0];
    pub.notification = {
      timestamp: Date.now(),
      title: `${email}'s lions have chosen. Waiting for ${rest.join(", ")}.`,
    };
    return { ok: true };
  }
  delete pub.flipping;
  delete pub.phase;
  finalise(gameState);
  return { ok: true };
}

function finalise(gameState: SavannaGameState) {
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
    pub.results.map((r) => `${r.email} ${r.total}`).join("; ") + ".",
  );
  publishLog(gameState);
}

/** The eleventh card of every hand goes back to the box. */
function setAsideLeftovers(gameState: SavannaGameState) {
  const pub = gameState.public;
  for (const p of pub.players) delete p.hand;
  if (pub.neutral) delete pub.neutral.hand;
}

function resolvePick(gameState: SavannaGameState) {
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
  if (pub.pick >= PICKS) {
    setAsideLeftovers(gameState);
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
      "Round 2 begins: the last card of each hand is set aside and eleven new cards are dealt, passed to the right.",
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
  gameState: SavannaGameState,
  email: string,
  play: Omit<Play, "email">,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const problem = playProblem(gameState, email, play);
  if (problem) return { ok: false, reason: problem };
  const player = playerByEmail(gameState, email) as SavannaPlayerState;
  const entry: Play = { email, card: play.card, row: play.row, col: play.col };
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

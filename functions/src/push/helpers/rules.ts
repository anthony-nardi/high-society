import {
  Card,
  Colour,
  DieFace,
  PushGameState,
  PushPlayerState,
} from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import {
  cardLabel,
  colourName,
  columnLabel,
  DIE_FACES,
  fullDeck,
  isDice,
  isSwitch,
  ofColour,
  placements,
  points,
} from "./board";

/*
 * Pure rules for PUSH, after the Ravensburger rulebook. On your turn you
 * either push or protect. Pushing: turn cards over one at a time into up
 * to three columns, never two of a number or a colour in one column, and
 * stop whenever you like by taking a column into your zone. A card that
 * fits nowhere is pushing too far: you take nothing and roll the die. The
 * other players then take one column each, from your left (or your right
 * after an odd number of switch cards). A dice card in a column you take
 * makes you roll: every card of that colour in your zone is lost, unless
 * it was protected. The game ends when the deck is gone and the columns
 * are cleared; most points wins, then most cards.
 */

export function appendLog(gameState: PushGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: PushGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(gameState: PushGameState, title: string, message?: string) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

const fail = (reason: string): ActionResult => ({ ok: false, reason });
const ok: ActionResult = { ok: true };

export function playerByEmail(
  gameState: PushGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: PushGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: PushGameState) {
  return gameState.public.status === "GAME_OVER";
}

export function scoreOf(player: PushPlayerState) {
  return points(player.bench || []) + points(player.bank || []);
}

export function cardCount(player: PushPlayerState) {
  return (player.bench || []).length + (player.bank || []).length;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildPushGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): PushGameState {
  const seats = players.slice(0, 6);
  const deck = shuffled(fullDeck(seats.length), random);
  const playersMetadata: PushPlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    isBot: !!player.isBot,
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];

  return {
    public: {
      id: lobbyUID,
      game: "push",
      players: playersMetadata,
      activePlayer: starter.email,
      turnPlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      phase: "PUSH",
      switches: 0,
      drawn: 0,
      deckCount: deck.length,
      discardCount: 0,
      turn: 0,
    },
    private: {
      deck,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started with ${deck.length} cards. ${starter.email} pushes first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// The deck and the die
// ---------------------------------------------------------------------------

function discard(gameState: PushGameState, cards: Card[]) {
  if (!cards.length) return;
  gameState.private.discard = [...(gameState.private.discard || []), ...cards];
  gameState.public.discardCount = gameState.private.discard.length;
}

function drawOne(gameState: PushGameState): Card | undefined {
  const deck = gameState.private.deck || [];
  const card = deck.shift();
  if (deck.length) gameState.private.deck = deck;
  else delete gameState.private.deck;
  gameState.public.deckCount = deck.length;
  return card;
}

export function rollDie(random: () => number): DieFace {
  return DIE_FACES[Math.floor(random() * DIE_FACES.length)];
}

/** Rolls for a player and takes every unprotected card of that colour. */
function roll(
  gameState: PushGameState,
  player: PushPlayerState,
  reason: "BUST" | "DICE",
  random: () => number,
  card?: Card,
) {
  const face = rollDie(random);
  const lost =
    face === "STAR" ? [] : ofColour(player.bench || [], face as Colour);
  if (lost.length) {
    player.bench = (player.bench || []).filter((c) => !lost.includes(c));
    if (!player.bench.length) delete player.bench;
    discard(gameState, lost);
  }
  gameState.public.lastRoll = {
    email: player.email,
    face,
    reason,
    turn: gameState.public.turn,
    ...(card ? { card } : {}),
    ...(lost.length ? { lost } : {}),
  };
  return { face, lost };
}

const faceText = (face: DieFace) =>
  face === "STAR" ? "the star" : colourName(face);

// ---------------------------------------------------------------------------
// Pushing
// ---------------------------------------------------------------------------

function pushing(gameState: PushGameState): ActionResult | PushPlayerState {
  if (isGameOver(gameState)) return fail("The game is over.");
  const pub = gameState.public;
  if (pub.phase !== "PUSH") return fail("The columns are being chosen.");
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  if (player.email !== pub.turnPlayer) return fail("It is not your turn.");
  return player;
}

/** Turns the top card over; a switch card goes aside, a card that fits nowhere busts. */
export function drawCard(
  gameState: PushGameState,
  random: () => number = Math.random,
): ActionResult {
  const player = pushing(gameState);
  if ("ok" in player) return player;
  const pub = gameState.public;
  if (pub.pending) return fail("Place the card you turned over first.");
  if (!(gameState.private.deck || []).length)
    return fail("The deck is empty: take a column.");

  const card = drawOne(gameState) as Card;
  pub.drawn += 1;
  player.lastActionAt = Date.now();

  if (isSwitch(card)) {
    pub.switches += 1;
    discard(gameState, [card]);
    announce(
      gameState,
      `${player.email} turns over a Switch card: the others will choose ${pub.switches % 2 ? "from the right" : "from the left"}.`,
    );
    if (!(gameState.private.deck || []).length && !(pub.columns || []).length)
      finishTurn(gameState);
    return ok;
  }

  const columns = pub.columns || [];
  const options = placements(columns, card);
  if (!options.length) {
    bust(gameState, player, card, random);
    return ok;
  }
  if (options.length === 1) {
    place(gameState, player, card, options[0]);
    return ok;
  }
  pub.pending = card;
  announce(gameState, `${player.email} turns over ${cardLabel(card)}.`);
  return ok;
}

/** Puts the card just drawn into a column, or starts a new one. */
export function placeCard(
  gameState: PushGameState,
  column: number,
): ActionResult {
  const player = pushing(gameState);
  if ("ok" in player) return player;
  const pub = gameState.public;
  const card = pub.pending;
  if (!card) return fail("Turn a card over first.");
  if (!Number.isInteger(column)) return fail("Choose a column.");
  if (!placements(pub.columns || [], card).includes(column))
    return fail("That card cannot go there.");
  delete pub.pending;
  place(gameState, player, card, column);
  return ok;
}

function place(
  gameState: PushGameState,
  player: PushPlayerState,
  card: Card,
  column: number,
) {
  const pub = gameState.public;
  const columns = (pub.columns || []).map((c) => [...c]);
  if (column >= columns.length) columns.push([card]);
  else columns[column].push(card);
  pub.columns = columns;
  player.lastActionAt = Date.now();
  announce(
    gameState,
    `${player.email} places ${cardLabel(card)} in column ${column + 1}.`,
  );
}

function bust(
  gameState: PushGameState,
  player: PushPlayerState,
  card: Card,
  random: () => number,
) {
  discard(gameState, [card]);
  const { face, lost } = roll(gameState, player, "BUST", random, card);
  announce(
    gameState,
    `${player.email} pushes too far: ${cardLabel(card)} fits nowhere. The die shows ${faceText(face)}${lost.length ? ` and takes ${columnLabel(lost)}` : ""}.`,
  );
  startChoosing(gameState);
}

/** Stops pushing by taking a column, or takes one as a chooser. */
export function takeColumn(
  gameState: PushGameState,
  column: number,
  random: () => number = Math.random,
): ActionResult {
  if (isGameOver(gameState)) return fail("The game is over.");
  const pub = gameState.public;
  const player = getActivePlayer(gameState);
  if (!player) return fail("Active player not found.");
  const columns = pub.columns || [];
  if (pub.phase === "PUSH") {
    if (player.email !== pub.turnPlayer) return fail("It is not your turn.");
    if (pub.pending) return fail("Place the card you turned over first.");
    if (!columns.length) return fail("Turn a card over first.");
  }
  if (!Number.isInteger(column) || column < 0 || column >= columns.length)
    return fail("Choose one of the columns.");

  const cards = columns[column];
  pub.columns = columns.filter((_, i) => i !== column);
  if (!pub.columns.length) delete pub.columns;
  takeInto(gameState, player, cards, random);

  if (pub.phase === "PUSH") startChoosing(gameState);
  else nextChooser(gameState);
  return ok;
}

/** Numbered cards join the zone; a dice card then makes the player roll. */
function takeInto(
  gameState: PushGameState,
  player: PushPlayerState,
  cards: Card[],
  random: () => number,
) {
  const numbered = cards.filter((c) => !isDice(c));
  if (numbered.length) player.bench = [...(player.bench || []), ...numbered];
  player.lastActionAt = Date.now();
  gameState.public.lastTake = {
    email: player.email,
    cards,
    turn: gameState.public.turn,
  };
  let title = `${player.email} takes ${columnLabel(cards)}.`;
  if (cards.some(isDice)) {
    discard(gameState, cards.filter(isDice));
    const { face, lost } = roll(gameState, player, "DICE", random);
    title += ` The die shows ${faceText(face)}${lost.length ? ` and takes ${columnLabel(lost)}` : ""}.`;
  }
  announce(gameState, title);
}

/** Protects one colour: every card of it in the zone goes face down, safe. */
export function bankColour(
  gameState: PushGameState,
  colour: Colour,
): ActionResult {
  const player = pushing(gameState);
  if ("ok" in player) return player;
  const pub = gameState.public;
  if (pub.drawn > 0)
    return fail("You have already turned a card over this turn.");
  const cards = ofColour(player.bench || [], colour);
  if (!cards.length)
    return fail("You have no cards of that colour to protect.");
  player.bench = (player.bench || []).filter((c) => !cards.includes(c));
  if (!player.bench.length) delete player.bench;
  player.bank = [...(player.bank || []), ...cards];
  player.lastActionAt = Date.now();
  pub.lastBank = { email: player.email, colour, cards, turn: pub.turn };
  announce(
    gameState,
    `${player.email} protects ${colourName(colour)}: ${columnLabel(cards)} are safe.`,
  );
  finishTurn(gameState);
  return ok;
}

// ---------------------------------------------------------------------------
// Choosing and the turn's end
// ---------------------------------------------------------------------------

/** The others choose one column each, from the left, or the right after an odd number of switches. */
function startChoosing(gameState: PushGameState) {
  const pub = gameState.public;
  const players = pub.players;
  const start = players.findIndex((p) => p.email === pub.turnPlayer);
  const step = pub.switches % 2 ? -1 : 1;
  const order: string[] = [];
  for (let k = 1; k < players.length; k++)
    order.push(
      players[(start + step * k + players.length) % players.length].email,
    );
  pub.phase = "CHOOSE";
  pub.choosers = order;
  nextChooser(gameState);
}

function nextChooser(gameState: PushGameState) {
  const pub = gameState.public;
  const choosers = pub.choosers || [];
  if (!(pub.columns || []).length || !choosers.length) {
    finishTurn(gameState);
    return;
  }
  pub.activePlayer = choosers[0];
  const rest = choosers.slice(1);
  if (rest.length) pub.choosers = rest;
  else delete pub.choosers;
}

function finishTurn(gameState: PushGameState) {
  const pub = gameState.public;
  const leftover = pub.columns || [];
  if (leftover.length) {
    discard(
      gameState,
      leftover.flatMap((c) => c),
    );
    appendLog(gameState, {
      timestamp: Date.now(),
      title: `${leftover.length} column${leftover.length === 1 ? "" : "s"} left over, discarded.`,
    });
  }
  delete pub.columns;
  delete pub.pending;
  delete pub.choosers;
  if (!(gameState.private.deck || []).length) {
    finish(gameState);
    return;
  }
  const players = pub.players;
  const i = players.findIndex((p) => p.email === pub.turnPlayer);
  const next = players[(i + 1) % players.length];
  pub.turn += 1;
  pub.turnPlayer = next.email;
  pub.activePlayer = next.email;
  pub.phase = "PUSH";
  pub.switches = 0;
  pub.drawn = 0;
}

function finish(gameState: PushGameState) {
  const pub = gameState.public;
  pub.status = "GAME_OVER";
  pub.phase = "PUSH";
  const ranked = [...pub.players].sort(
    (a, b) => scoreOf(b) - scoreOf(a) || cardCount(b) - cardCount(a),
  );
  const best = ranked[0];
  const winners = ranked.filter(
    (p) => scoreOf(p) === scoreOf(best) && cardCount(p) === cardCount(best),
  );
  pub.winners = winners.map((w) => w.email);
  if (winners.length === 1) pub.winner = best.email;
  announce(
    gameState,
    winners.length === 1
      ? `Game over: ${best.email} wins with ${scoreOf(best)} points.`
      : `Game over: ${winners.map((w) => w.email).join(" and ")} share the win with ${scoreOf(best)} points.`,
  );
  publishLog(gameState);
}

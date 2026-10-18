import { FujiFlushGameState, FujiFlushPlayerState } from "../types";
import { LogEntry, Notification, PlayerInLobby } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import { fullDeck, handSize, outcomeOf } from "./board";

/*
 * Pure rules for Fuji Flush, after the 2F-Spiele / Stronghold Games
 * rulebook: one card a turn, higher numbers flush lower ones down the
 * drain, equal numbers join forces, and a card still in front of you when
 * your turn comes round is pushed through, taking its team with it.
 */

export function appendLog(gameState: FujiFlushGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: FujiFlushGameState) {
  gameState.public.log = gameState.private.log || [];
}

function announce(
  gameState: FujiFlushGameState,
  title: string,
  message?: string,
) {
  const notification: Notification = { timestamp: Date.now(), title };
  if (message) notification.message = message;
  gameState.public.notification = notification;
  appendLog(gameState, notification);
}

export function playerByEmail(
  gameState: FujiFlushGameState,
  email: string | undefined,
) {
  return gameState.public.players.find((p) => p.email === email);
}

export function getActivePlayer(gameState: FujiFlushGameState) {
  return playerByEmail(gameState, gameState.public.activePlayer);
}

export function isGameOver(gameState: FujiFlushGameState) {
  return gameState.public.status === "GAME_OVER";
}

/** Cards a player still has to get rid of: in hand and in front. */
export function cardsLeft(player: FujiFlushPlayerState) {
  return (player.hand || []).length + (player.played === undefined ? 0 : 1);
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const list = (names: string[]) =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export function buildFujiFlushGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  random: () => number = Math.random,
): FujiFlushGameState {
  const seats = players.slice(0, 8);
  const deck = shuffled(fullDeck(), random);
  const size = handSize(seats.length);
  const playersMetadata: FujiFlushPlayerState[] = seats.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    isBot: !!player.isBot,
    hand: deck.splice(0, size).sort((a, b) => a - b),
    pushed: 0,
    flushed: 0,
  }));
  const starter = playersMetadata[Math.floor(random() * seats.length)];

  return {
    public: {
      id: lobbyUID,
      game: "fuji-flush",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      turn: 0,
      deckCount: deck.length,
      discardCount: 0,
    },
    private: {
      deck,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started with ${size} cards each. ${starter.email} plays first.`,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// The deck
// ---------------------------------------------------------------------------

function discard(gameState: FujiFlushGameState, card: number) {
  gameState.private.discard = [...(gameState.private.discard || []), card];
  gameState.public.discardCount = gameState.private.discard.length;
}

/** Draws one card, turning the drain over when the stack runs dry. */
function draw(
  gameState: FujiFlushGameState,
  random: () => number,
): number | undefined {
  let deck = gameState.private.deck || [];
  if (deck.length === 0 && (gameState.private.discard || []).length > 0) {
    deck = shuffled(gameState.private.discard || [], random);
    delete gameState.private.discard;
    gameState.public.discardCount = 0;
    appendLog(gameState, {
      timestamp: Date.now(),
      title: "The stack ran out: the drain is shuffled into a new stack.",
    });
  }
  const card = deck.shift();
  if (deck.length) gameState.private.deck = deck;
  else delete gameState.private.deck;
  gameState.public.deckCount = deck.length;
  return card;
}

function giveCard(player: FujiFlushPlayerState, card: number) {
  player.hand = [...(player.hand || []), card].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

/** The active player lays a card in front of them. */
export function playCard(
  gameState: FujiFlushGameState,
  card: number,
  random: () => number = Math.random,
): ActionResult {
  if (isGameOver(gameState)) return { ok: false, reason: "The game is over." };
  const player = getActivePlayer(gameState);
  if (!player) return { ok: false, reason: "Active player not found." };
  if (!Number.isInteger(card) || !(player.hand || []).includes(card))
    return { ok: false, reason: "You do not hold that card." };
  if (player.played !== undefined)
    return { ok: false, reason: "You already have a card in front of you." };

  const outcome = outcomeOf(gameState.public.players, player.email, card);
  const hand = [...(player.hand || [])];
  hand.splice(hand.indexOf(card), 1);
  if (hand.length) player.hand = hand;
  else delete player.hand;
  player.played = card;
  player.playedOn = gameState.public.turn;
  player.lastActionAt = Date.now();

  for (const f of outcome.flushed) {
    const victim = playerByEmail(gameState, f.email);
    if (!victim || victim.played === undefined) continue;
    discard(gameState, victim.played);
    delete victim.played;
    delete victim.playedOn;
    victim.flushed += 1;
    const replacement = draw(gameState, random);
    if (replacement !== undefined) giveCard(victim, replacement);
  }

  gameState.public.lastPlay = {
    email: player.email,
    card,
    value: outcome.value,
    turn: gameState.public.turn,
    ...(outcome.joined.length ? { joined: outcome.joined } : {}),
    ...(outcome.flushed.length ? { flushed: outcome.flushed } : {}),
  };
  delete gameState.public.lastPush;

  let title = `${player.email} plays a ${card}`;
  if (outcome.joined.length)
    title += ` with ${list(outcome.joined)} for ${outcome.value}`;
  if (outcome.flushed.length)
    title += ` and flushes ${list(outcome.flushed.map((f) => `${f.email}'s ${f.card}`))}`;
  announce(gameState, `${title}.`);

  gameState.public.turn += 1;
  advance(gameState);
  return { ok: true };
}

/** The next player is up; a card still in front of them is pushed through first. */
function advance(gameState: FujiFlushGameState) {
  const players = gameState.public.players;
  let index = players.findIndex(
    (p) => p.email === gameState.public.activePlayer,
  );
  for (let tries = 0; tries < players.length; tries++) {
    index = (index + 1) % players.length;
    const next = players[index];
    gameState.public.activePlayer = next.email;
    if (next.played !== undefined) {
      pushThrough(gameState, next);
      if (isGameOver(gameState)) return;
    }
    if ((next.hand || []).length) return;
    // Nothing to play: only possible once both stacks are empty. Skip them.
    appendLog(gameState, {
      timestamp: Date.now(),
      title: `${next.email} has no card to play.`,
    });
  }
}

/** A card that survived the round is discarded, along with every card of the same number. */
function pushThrough(
  gameState: FujiFlushGameState,
  player: FujiFlushPlayerState,
) {
  const card = player.played as number;
  const members = [
    player,
    ...gameState.public.players.filter(
      (p) => p !== player && p.played === card,
    ),
  ];
  for (const m of members) {
    discard(gameState, card);
    delete m.played;
    delete m.playedOn;
    m.pushed += 1;
  }
  gameState.public.lastPush = {
    email: player.email,
    card,
    members: members.map((m) => m.email),
    turn: gameState.public.turn,
  };
  const others = members.slice(1).map((m) => m.email);
  appendLog(gameState, {
    timestamp: Date.now(),
    title: `${player.email} pushes a ${card} through${others.length ? ` with ${list(others)}` : ""}.`,
  });
  const winners = members.filter((m) => cardsLeft(m) === 0);
  if (winners.length) finish(gameState, winners);
}

function finish(
  gameState: FujiFlushGameState,
  winners: FujiFlushPlayerState[],
) {
  gameState.public.status = "GAME_OVER";
  gameState.public.winners = winners.map((w) => w.email);
  if (winners.length === 1) gameState.public.winner = winners[0].email;
  announce(
    gameState,
    winners.length === 1
      ? `${winners[0].email} wins!`
      : `Game over: ${list(winners.map((w) => w.email))} win together.`,
  );
  publishLog(gameState);
}

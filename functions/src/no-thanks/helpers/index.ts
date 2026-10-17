import { getDatabase } from "firebase-admin/database";
import { Notification, PlayerInLobby } from "../../shared/types";
import {
  shuffle,
  updateGameState,
  updatePlayerLastAction,
} from "../../shared/helpers";
import { LogEntry } from "../../shared/types";
import type { ActionResult } from "../../shared/game";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { NoThanksGameState, NoThanksPlayerState } from "../types";

const DEFAULT_CHIPS = 11;
const CHIPS_FOR_SIX_PLAYERS = 9;
const CHIPS_FOR_SEVEN_PLAYERS = 7;
const DECK_SIZE = 36;
const CARDS_TO_REMOVE = 9;

function getInitialChips(playerCount: number): number {
  switch (playerCount) {
    case 6:
      return CHIPS_FOR_SIX_PLAYERS;
    case 7:
      return CHIPS_FOR_SEVEN_PLAYERS;
    default:
      return DEFAULT_CHIPS;
  }
}

function createPlayerMetadata(players: PlayerInLobby[], chips: number) {
  return players.map((player) => ({
    email: player.email,
    lastActionAt: 0,
    cards: [],
    chips,
    isBot: !!player.isBot,
  }));
}

function initializeDeck(): number[] {
  const deck = Array.from(Array(DECK_SIZE).keys()).slice(3); // 3 to 35
  shuffle(deck);
  return deck.slice(0, deck.length - CARDS_TO_REMOVE);
}

async function saveGameState(lobbyUID: string, gameState: NoThanksGameState) {
  return getDatabase()
    .ref(`/games/${lobbyUID}`)
    .set(gameState)
    .then(() => {
      logger.info("New game created.");
      return { lobbyUID, message: "New game created." };
    })
    .catch((error: Error) => {
      throw new HttpsError("unknown", error.message, error);
    });
}

/** Initial state for the lobby's players; the deck is shuffled and cut. */
export function buildNoThanksGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
): NoThanksGameState {
  const chips = getInitialChips(players.length);
  const playersMetadata = createPlayerMetadata(players, chips);
  const deck = initializeDeck();

  return {
    public: {
      id: lobbyUID,
      game: "no-thanks",
      players: playersMetadata,
      activePlayer: playersMetadata[0].email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      activeCard: deck[0],
      chipsPlaced: 0,
      remainingCards: deck.length - 1,
    },
    private: {
      deck,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${deck[0]} revealed.`,
        },
      ],
    },
  };
}

/**
 * Records an event. The log stays private while the game runs (players only
 * have their memory at the table) and is published when the game ends.
 */
export function appendLog(gameState: NoThanksGameState, entry: LogEntry) {
  gameState.private.log = [...(gameState.private.log || []), entry];
}

export function publishLog(gameState: NoThanksGameState) {
  gameState.public.log = gameState.private.log || [];
}

export async function createNoThanksGameState(lobbyUID: string) {
  const playersSnapshot = await getDatabase()
    .ref(`lobbies/${lobbyUID}/players`)
    .get();
  const players = playersSnapshot.val() as PlayerInLobby[];
  return saveGameState(lobbyUID, buildNoThanksGameState(lobbyUID, players));
}

function revealNewActiveCard(gameState: NoThanksGameState) {
  gameState.private.deck.shift();
  gameState.public.activeCard = gameState.private.deck[0] || null;
  gameState.public.remainingCards = gameState.private.deck.length;
}

function giveActiveCardToPlayer(
  gameState: NoThanksGameState,
  player: NoThanksPlayerState,
) {
  player.cards = player.cards || [];
  if (gameState.public.activeCard) {
    player.cards.push(gameState.public.activeCard);
  }
  revealNewActiveCard(gameState);
}

function givePlacedChipsToPlayer(
  gameState: NoThanksGameState,
  player: NoThanksPlayerState,
) {
  player.chips += gameState.public.chipsPlaced;
  gameState.public.chipsPlaced = 0;
}

export function updatePlayersGameStateWithTakeActiveCard(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState,
) {
  const player = gameState.public.players.find(
    (p) => p.email === activePlayer.email,
  );
  if (player) {
    updatePlayerLastAction(player);
    giveActiveCardToPlayer(gameState, player);
    givePlacedChipsToPlayer(gameState, player);
  }
}

export function updatePlayersGameStateWithPlaceChip(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState,
) {
  const player = gameState.public.players.find(
    (p) => p.email === activePlayer.email,
  );
  if (player) {
    updatePlayerLastAction(player);
    player.chips--;
    gameState.public.chipsPlaced++;
  }
}

export function getNextPlayerIndex(gameState: NoThanksGameState) {
  const activePlayerIndex = gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer,
  );
  return (activePlayerIndex + 1) % gameState.public.players.length;
}

export function updateActivePlayer(gameState: NoThanksGameState) {
  const nextPlayerIndex = getNextPlayerIndex(gameState);
  gameState.public.activePlayer =
    gameState.public.players[nextPlayerIndex].email;
}

export function isGameOver(gameState: NoThanksGameState) {
  return gameState.public.remainingCards === 0;
}

export function getActivePlayer(gameState: NoThanksGameState) {
  return gameState.public.players.find(
    (player) => player.email === gameState.public.activePlayer,
  );
}

/** The active player takes the card and its chips; the next card is revealed. */
/** The active player takes the card and its chips. Pure. */
export function applyTake(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState,
): ActionResult {
  const activeCard = gameState.public.activeCard;
  const chipsPlaced = gameState.public.chipsPlaced;

  updatePlayersGameStateWithTakeActiveCard(gameState, activePlayer);

  const notification: Notification = {
    timestamp: Date.now(),
    title: `${activePlayer.email} has taken the ${activeCard} along with ${chipsPlaced} chip${
      chipsPlaced === 1 ? "" : "s"
    }.`,
  };

  if (isGameOver(gameState)) {
    gameState.public.status = "GAME_OVER";
    notification.message = "That was the last card. Game over.";
  }

  gameState.public.notification = notification;
  appendLog(gameState, notification);

  if (isGameOver(gameState)) {
    publishLog(gameState);
  } else {
    appendLog(gameState, {
      timestamp: Date.now(),
      title: `${gameState.public.activeCard} revealed.`,
    });
  }
  return { ok: true };
}

export async function updateGameStateWithTakingCardAction(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState,
) {
  applyTake(gameState, activePlayer);
  await updateGameState(
    gameState,
    gameState.public.notification?.title || "card taken",
  );
}

/** The active player pays a chip onto the card and the turn moves on. */
/** The active player pays a chip onto the card. Pure; reports legality. */
export function applyChip(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState,
): ActionResult {
  if ((activePlayer.chips || 0) < 1) {
    return { ok: false, reason: "You have no chips left; take the card." };
  }
  const activeCard = gameState.public.activeCard;

  updatePlayersGameStateWithPlaceChip(gameState, activePlayer);
  updateActivePlayer(gameState);

  const notification: Notification = {
    timestamp: Date.now(),
    title: `${activePlayer.email} has placed a chip on ${activeCard}.`,
  };

  gameState.public.notification = notification;
  appendLog(gameState, notification);
  return { ok: true };
}

export async function updateGameStateWithPlacingChipAction(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState,
) {
  const result = applyChip(gameState, activePlayer);
  if (!result.ok) throw new Error(result.reason);
  await updateGameState(
    gameState,
    gameState.public.notification?.title || "chip placed",
  );
}

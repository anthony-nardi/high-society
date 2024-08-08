import { getDatabase } from "firebase-admin/database";
import { PlayerInLobby } from "../../shared/types";
import { shuffle, updatePlayerLastAction } from "../../shared/helpers";
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

export async function createNoThanksGameState(lobbyUID: string) {
  const playersSnapshot = await getDatabase()
    .ref(`lobbies/${lobbyUID}/players`)
    .get();
  const players = playersSnapshot.val() as PlayerInLobby[];

  const chips = getInitialChips(players.length);
  const playersMetadata = createPlayerMetadata(players, chips);
  const deck = initializeDeck();

  const gameState: NoThanksGameState = {
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
    },
  };

  return saveGameState(lobbyUID, gameState);
}

function revealNewActiveCard(gameState: NoThanksGameState) {
  gameState.private.deck.shift();
  gameState.public.activeCard = gameState.private.deck[0] || null;
  gameState.public.remainingCards = gameState.private.deck.length;
}

function giveActiveCardToPlayer(
  gameState: NoThanksGameState,
  player: NoThanksPlayerState
) {
  player.cards = player.cards || [];
  if (gameState.public.activeCard) {
    player.cards.push(gameState.public.activeCard);
  }
  revealNewActiveCard(gameState);
}

function givePlacedChipsToPlayer(
  gameState: NoThanksGameState,
  player: NoThanksPlayerState
) {
  player.chips += gameState.public.chipsPlaced;
  gameState.public.chipsPlaced = 0;
}

export function updatePlayersGameStateWithTakeActiveCard(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const player = gameState.public.players.find(
    (p) => p.email === activePlayer.email
  );
  if (player) {
    updatePlayerLastAction(player);
    giveActiveCardToPlayer(gameState, player);
    givePlacedChipsToPlayer(gameState, player);
  }
}

export function updatePlayersGameStateWithPlaceChip(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const player = gameState.public.players.find(
    (p) => p.email === activePlayer.email
  );
  if (player) {
    updatePlayerLastAction(player);
    player.chips--;
    gameState.public.chipsPlaced++;
  }
}

export function getNextPlayerIndex(gameState: NoThanksGameState) {
  const activePlayerIndex = gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
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

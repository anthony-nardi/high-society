import { getDatabase } from "firebase-admin/database";
import { PlayerInLobby } from "../../shared/types";
import {
  LootCards,
  RazziaGameState,
  RazziaPlayerState,
  LOOT_CARDS,
} from "../types";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { shuffle } from "../../shared/helpers";

async function saveGameState(lobbyUID: string, gameState: RazziaGameState) {
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

function getPlayersStartingMoney(
  totalPlayers: number,
  playerIndex: number
): string[] {
  switch (totalPlayers) {
    case 2:
      return twoPlayerStartingMoney[playerIndex];
    case 3:
      return threePlayerStartingMoney[playerIndex];
    case 4:
      return fourPlayerStartingMoney[playerIndex];
    case 5:
      return fivePlayerStartingMoney[playerIndex];
    default:
      throw new Error("Invalid number of players.");
  }
}

function initializeDeck(): LootCards[] {
  let deck: LootCards[] = [];

  // 4 types of each jewels
  for (let i = 0; i < 4; i++) {
    deck.push(LOOT_CARDS.SCARAB);
    deck.push(LOOT_CARDS.CROSS);
    deck.push(LOOT_CARDS.BRACELET);
    deck.push(LOOT_CARDS.TIARA);
    deck.push(LOOT_CARDS.RING);
  }

  // 16 bodyguards
  for (let i = 0; i < 16; i++) {
    deck.push(LOOT_CARDS.BODYGUARDS);
  }

  // 3 Coins
  for (let i = 0; i < 3; i++) {
    deck.push(LOOT_CARDS.COINS);
  }

  // 21 Police Raids
  for (let i = 0; i < 21; i++) {
    deck.push(LOOT_CARDS.POLICE_RAIDS);
  }

  // 16 Cars
  for (let i = 0; i < 16; i++) {
    deck.push(LOOT_CARDS.CARS);
  }

  // 10 Drivers
  for (let i = 0; i < 10; i++) {
    deck.push(LOOT_CARDS.DRIVERS);
  }

  // 4 types of each business
  for (let i = 0; i < 4; i++) {
    deck.push(LOOT_CARDS.CASINO);
    deck.push(LOOT_CARDS.TRANSPORTATION);
    deck.push(LOOT_CARDS.MOVIE_THEATER);
    deck.push(LOOT_CARDS.RACING);
    deck.push(LOOT_CARDS.REAL_ESTATE);
    deck.push(LOOT_CARDS.NIGHTCLUB);
    deck.push(LOOT_CARDS.RESTAURANT);
  }

  // 6 Thieves
  for (let i = 0; i < 6; i++) {
    deck.push(LOOT_CARDS.THIEF);
  }

  shuffle(deck);

  return deck;
}

function createPlayerMetadata(players: PlayerInLobby[]): RazziaPlayerState[] {
  return players.map((player, index) => ({
    email: player.email,
    lastActionAt: 0,
    cards: {
      jewels: [],
      bodyguards: [],
      coins: [],
      theives: [],
      cars: [],
      drivers: [],
      businesses: [],
    },
    money: getPlayersStartingMoney(players.length, index),
    availableMoney: getPlayersStartingMoney(players.length, index),
    isBot: !!player.isBot,
    score: 0,
  }));
}

const twoPlayerStartingMoney = [
  ["2", "5", "6", "9"],
  ["3", "4", "7", "8"],
];

const threePlayerStartingMoney = [
  ["2", "5", "8", "13"],
  ["3", "6", "9", "12"],
  ["4", "7", "10", "11"],
];

const fourPlayerStartingMoney = [
  ["2", "6", "13"],
  ["3", "7", "12"],
  ["4", "8", "11"],
  ["5", "9", "10"],
];

const fivePlayerStartingMoney = [
  ["2", "7", "16"],
  ["3", "8", "15"],
  ["4", "9", "14"],
  ["5", "10", "13"],
  ["6", "11", "12"],
];

export const createRazziaGameState = async (lobbyUID: string) => {
  const playersSnapshot = await getDatabase()
    .ref(`lobbies/${lobbyUID}/players`)
    .get();
  const players = playersSnapshot.val() as PlayerInLobby[];

  const playersMetadata = createPlayerMetadata(players);
  const deck = initializeDeck();

  const gameState: RazziaGameState = {
    public: {
      id: lobbyUID,
      game: "razzia",
      players: playersMetadata,
      activePlayer: playersMetadata[0].email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      roundState: "ACTION",
      money: "1",
      revealedCards: [],
      policeRaids: 0,
      remainingCards: deck.length,
      round: 1,
    },
    private: {
      deck,
    },
  };

  return saveGameState(lobbyUID, gameState);
};

export function getNextPlayerIndex(gameState: RazziaGameState) {
  const activePlayerIndex = gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
  );

  // check if the next player has available money
  let hasFoundNextPlayer = false;
  let nextPlayerIndex =
    (activePlayerIndex + 1) % gameState.public.players.length;

  while (hasFoundNextPlayer === false) {
    if (
      (gameState.public.players[nextPlayerIndex].availableMoney || []).length >
      0
    ) {
      hasFoundNextPlayer = true;
      return nextPlayerIndex;
    } else {
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.public.players.length;
    }
  }

  return activePlayerIndex;
}

export function updateActivePlayer(gameState: RazziaGameState) {
  const nextPlayerIndex = getNextPlayerIndex(gameState);
  gameState.public.activePlayer =
    gameState.public.players[nextPlayerIndex].email;
}

export function getActivePlayer(gameState: RazziaGameState) {
  return gameState.public.players.find(
    (player) => player.email === gameState.public.activePlayer
  );
}

import { getDatabase } from "firebase-admin/database";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { PlayerInLobby } from "../../shared/types";
import { shuffle, updateGameState } from "../../shared/helpers";
import {
  LootCards,
  LOOT_CARDS,
  RazziaGameState,
  RazziaPlayerState,
} from "../types";
import { emptyCards, raidLimitFor } from "./rules";

export * from "./rules";

const STARTING_MONEY: { [players: number]: string[][] } = {
  2: [
    ["2", "5", "6", "9"],
    ["3", "4", "7", "8"],
  ],
  3: [
    ["2", "5", "8", "13"],
    ["3", "6", "9", "12"],
    ["4", "7", "10", "11"],
  ],
  4: [
    ["2", "6", "13"],
    ["3", "7", "12"],
    ["4", "8", "11"],
    ["5", "9", "10"],
  ],
  5: [
    ["2", "7", "16"],
    ["3", "8", "15"],
    ["4", "9", "14"],
    ["5", "10", "13"],
    ["6", "11", "12"],
  ],
};

export function startingMoneyFor(totalPlayers: number, playerIndex: number) {
  const sets = STARTING_MONEY[totalPlayers];
  if (!sets) throw new Error("Invalid number of players.");
  return [...sets[playerIndex]];
}

export function buildDeck(): LootCards[] {
  const deck: LootCards[] = [];
  const push = (card: LootCards, times: number) => {
    for (let i = 0; i < times; i++) deck.push(card);
  };

  for (const jewel of [
    LOOT_CARDS.SCARAB,
    LOOT_CARDS.CROSS,
    LOOT_CARDS.BRACELET,
    LOOT_CARDS.TIARA,
    LOOT_CARDS.RING,
  ]) {
    push(jewel, 4);
  }
  push(LOOT_CARDS.BODYGUARDS, 16);
  push(LOOT_CARDS.COINS, 3);
  push(LOOT_CARDS.POLICE_RAIDS, 21);
  push(LOOT_CARDS.CARS, 16);
  push(LOOT_CARDS.DRIVERS, 10);
  for (const business of [
    LOOT_CARDS.CASINO,
    LOOT_CARDS.TRANSPORTATION,
    LOOT_CARDS.MOVIE_THEATER,
    LOOT_CARDS.RACING,
    LOOT_CARDS.REAL_ESTATE,
    LOOT_CARDS.NIGHTCLUB,
    LOOT_CARDS.RESTAURANT,
  ]) {
    push(business, 4);
  }
  push(LOOT_CARDS.THIEF, 6);

  return deck;
}

export function createPlayers(players: PlayerInLobby[]): RazziaPlayerState[] {
  return players.map((player, index) => ({
    email: player.email,
    lastActionAt: 0,
    cards: emptyCards(),
    money: startingMoneyFor(players.length, index),
    availableMoney: startingMoneyFor(players.length, index),
    isBot: !!player.isBot,
    score: 0,
    bid: "0",
  }));
}

export function buildGameState(
  lobbyUID: string,
  players: PlayerInLobby[],
  deck: LootCards[]
): RazziaGameState {
  const playersMetadata = createPlayers(players);
  // The holder of the highest cheque starts (player A in every set).
  const top = (p: RazziaPlayerState) => Math.max(...(p.money || []).map(Number));
  const starter = playersMetadata.reduce((best, p) => (top(p) > top(best) ? p : best));
  return {
    public: {
      id: lobbyUID,
      game: "razzia",
      players: playersMetadata,
      activePlayer: starter.email,
      startAt: Date.now().toString(),
      status: "IN_PROGRESS",
      roundState: "ACTION",
      money: "1",
      revealedCards: [],
      policeRaids: 0,
      raidLimit: raidLimitFor(players.length),
      remainingCards: deck.length,
      round: 1,
    },
    private: {
      deck,
      log: [
        {
          timestamp: Date.now(),
          title: `Game started. ${playersMetadata[0].email} goes first.`,
        },
      ],
    },
  };
}

export const createRazziaGameState = async (lobbyUID: string) => {
  const playersSnapshot = await getDatabase()
    .ref(`lobbies/${lobbyUID}/players`)
    .get();
  const players = playersSnapshot.val() as PlayerInLobby[];

  const deck = buildDeck();
  shuffle(deck);

  return getDatabase()
    .ref(`/games/${lobbyUID}`)
    .set(buildGameState(lobbyUID, players, deck))
    .then(() => {
      logger.info("New game created.");
      return { lobbyUID, message: "New game created." };
    })
    .catch((error: Error) => {
      throw new HttpsError("unknown", error.message, error);
    });
};

/** Persists the state after a rules function changed it. */
export async function saveGameState(gameState: RazziaGameState) {
  await updateGameState(
    gameState,
    gameState.public.notification?.title || "Razzia state updated."
  );
}

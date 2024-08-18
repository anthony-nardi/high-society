import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  Notification,
} from "../../shared/types";

export type RazziaPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  cards: {
    jewels?: [];
    bodyguards?: [];
    coins?: [];
    theives?: [];
    cars?: [];
    drivers?: [];
    businesses?: [];
  };
  money?: [];
  score: number;
  isBot: boolean;
};

export type RazziaPublicGameState = {
  id: string;
  game: string;
  players: RazziaPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  roundState: "NORMAL_AUCTION" | "FORCED_AUCTION" | "SCORING" | "ACTION";
  notification?: Notification;
  revealedCards?: [];
  remainingCards: number;
  policeRaids: number;
  money: number;
};

export type RazziaPrivateGameState = {
  deck: [];
};

export type RazziaGameState = GenericGameState<RazziaPlayerState> & {
  public: RazziaPublicGameState;
  private: RazziaPrivateGameState;
};

export const LOOT_CARDS = {
  JEWLES: {
    SCARAB: "SCARAB",
    CROSS: "CROSS",
    BRACELET: "BRACELET",
    TIARA: "TIARA",
    RING: "RING",
  },
  BODYGUARDS: "BODYGUARDS",
  COINS: "COINS",
  POLICE_RAIDS: "POLICE_RAIDS",
  CARS: "CARS",
  DRIVERS: "DRIVERS",
  BUSINESSES: {
    CASINO: "CASINO",
    TRANSPORTATION: "TRANSPORTATION",
    MOVIE_THEATER: "MOVIE_THEATER",
    RACING: "RACING",
    REAL_ESTATE: "REAL_ESTATE",
    NIGHTCLUB: "NIGHTCLUB",
    RESTAURANT: "RESTAURANT",
  },
} as const;

export type LootCards = (typeof LOOT_CARDS)[keyof typeof LOOT_CARDS];

// 4 types of each jewwels
// 16 bodyguards
// 3 Coins
// 21 Police Raids
// 16 Cars
// 10 Drivers
// 4 types of each business

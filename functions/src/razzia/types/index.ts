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
    jewels?: string[];
    bodyguards?: string[];
    coins?: string[];
    theives?: string[];
    cars?: string[];
    drivers?: string[];
    businesses?: string[];
  };
  money?: string[];
  availableMoney?: string[];
  bid: string;
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
  revealedCards?: LootCards[];
  remainingCards: number;
  policeRaids: number;
  money: string;
  round: 1 | 2 | 3;
  auctionTriggeringPlayer?: string;
};

export type RazziaPrivateGameState = {
  deck: LootCards[];
};

export type RazziaGameState = GenericGameState<RazziaPlayerState> & {
  public: RazziaPublicGameState;
  private: RazziaPrivateGameState;
};

export const SCARAB = "SCARAB";
export const CROSS = "CROSS";
export const BRACELET = "BRACELET";
export const TIARA = "TIARA";
export const RING = "RING";

export const BODYGUARDS = "BODYGUARDS";
export const COINS = "COINS";
export const POLICE_RAIDS = "POLICE_RAIDS";
export const CARS = "CARS";
export const DRIVERS = "DRIVERS";
export const CASINO = "CASINO";
export const TRANSPORTATION = "TRANSPORTATION";
export const MOVIE_THEATER = "MOVIE_THEATER";
export const RACING = "RACING";
export const REAL_ESTATE = "REAL_ESTATE";
export const NIGHTCLUB = "NIGHTCLUB";
export const RESTAURANT = "RESTAURANT";
export const THIEF = "THIEF";

export const LOOT_CARDS = {
  // JEWELS
  SCARAB,
  CROSS,
  BRACELET,
  TIARA,
  RING,

  // BODYGUARDS,
  BODYGUARDS,

  // COINS,
  COINS,

  // POLICE_RAIDS,
  POLICE_RAIDS,

  // CARS & DRIVERS
  CARS,
  DRIVERS,

  // BUSINESSES
  CASINO,
  TRANSPORTATION,
  MOVIE_THEATER,
  RACING,
  REAL_ESTATE,
  NIGHTCLUB,
  RESTAURANT,

  // THIEF
  THIEF,
} as const;

export type LootCards = (typeof LOOT_CARDS)[keyof typeof LOOT_CARDS];

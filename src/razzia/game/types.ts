import { LogEntry } from "../../shared/components/GameLog";

export type GameStatus = "IN_PROGRESS" | "GAME_OVER";

export type Notification = {
  title: string;
  message?: string;
  timestamp: number;
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
  SCARAB,
  CROSS,
  BRACELET,
  TIARA,
  RING,
  BODYGUARDS,
  COINS,
  POLICE_RAIDS,
  CARS,
  DRIVERS,
  CASINO,
  TRANSPORTATION,
  MOVIE_THEATER,
  RACING,
  REAL_ESTATE,
  NIGHTCLUB,
  RESTAURANT,
  THIEF,
} as const;

export type LootCards = (typeof LOOT_CARDS)[keyof typeof LOOT_CARDS];

export type PlayerCards = {
  jewels?: LootCards[];
  bodyguards?: LootCards[];
  coins?: LootCards[];
  theives?: LootCards[];
  cars?: LootCards[];
  drivers?: LootCards[];
  businesses?: LootCards[];
};

export type CardCategory = keyof PlayerCards;

export type RazziaPlayerState = {
  email: string;
  lastActionAt: number;
  cards: PlayerCards;
  money?: string[];
  availableMoney?: string[];
  bid: string;
  score: number;
  isBot: boolean;
};

export type RoundState =
  "NORMAL_AUCTION" | "FORCED_AUCTION" | "SCORING" | "ACTION";

export type ScoreBreakdown = {
  email: string;
  round: number;
  points: { [category: string]: number };
  total: number;
};

export type RazziaGameState = {
  id: string;
  game: string;
  players: RazziaPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  roundState: RoundState;
  notification?: Notification;
  revealedCards?: LootCards[];
  remainingCards: number;
  policeRaids: number;
  raidLimit: number;
  money: string;
  round: 1 | 2 | 3;
  auctionTriggeringPlayer?: string;
  /** Automatic auction for a full table: unsold loot is discarded. */
  discardIfUnsold?: boolean;
  /** Players who passed in the current auction, in order. */
  auctionPassed?: string[];
  scoring?: ScoreBreakdown[];
  nextLobbyUID?: string;
  log?: LogEntry[];
};

import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  Notification,
} from "../../shared/types";
import { LogEntry } from "../../high-society/types";

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

export const JEWELS: LootCards[] = [SCARAB, CROSS, BRACELET, TIARA, RING];
export const BUSINESSES: LootCards[] = [
  CASINO,
  TRANSPORTATION,
  MOVIE_THEATER,
  RACING,
  REAL_ESTATE,
  NIGHTCLUB,
  RESTAURANT,
];

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

export type RazziaPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  cards: PlayerCards;
  /** All money cards held, including ones won this round. */
  money?: string[];
  /** Money cards that can still be bid this round. */
  availableMoney?: string[];
  /** Money card bid in the current auction, "0" for none. */
  bid: string;
  score: number;
  isBot: boolean;
};

export type RoundState = "NORMAL_AUCTION" | "FORCED_AUCTION" | "SCORING" | "ACTION";

/** How a round's or the game's points broke down, for the game over screen. */
export type ScoreBreakdown = {
  email: string;
  round: number;
  /** Category label to points, e.g. { bodyguards: 5, coins: 6 }. */
  points: { [category: string]: number };
  total: number;
};

export type RazziaPublicGameState = {
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
  /** police raids that end the round, by player count. */
  raidLimit: number;
  /** The money card in the centre, won by the next auction winner. */
  money: string;
  round: 1 | 2 | 3;
  /** Who called or drew the auction; they bid last. */
  auctionTriggeringPlayer?: string;
  /** Automatic auction for a full table: unsold loot is discarded. */
  discardIfUnsold?: boolean;
  /** Scoring breakdowns, appended at each round end. */
  scoring?: ScoreBreakdown[];
  /** Set when a player starts a rematch after this game ends. */
  nextLobbyUID?: string;
  /** Full event log, only present once the game is over. */
  log?: LogEntry[];
};

export type RazziaPrivateGameState = {
  deck: LootCards[];
  /** Every event of the game; published to `public.log` when it ends. */
  log?: LogEntry[];
};

export type RazziaGameState = GenericGameState<RazziaPlayerState> & {
  public: RazziaPublicGameState;
  private: RazziaPrivateGameState;
};

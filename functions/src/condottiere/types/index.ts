import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

/** "M1" to "M10" are mercenaries; the rest are the special cards. */
export type Card =
  | "M1"
  | "M2"
  | "M3"
  | "M4"
  | "M5"
  | "M6"
  | "M10"
  | "DRUMMER"
  | "HEROINE"
  | "SPRING"
  | "WINTER"
  | "SURRENDER"
  | "BISHOP"
  | "SCARECROW"
  | "COURTESAN";

export type Season = "SPRING" | "WINTER";

export type Phase =
  /** The holder of the Condottiere token picks the next battlefield. */
  | "CHOOSE"
  /** Players play a card or pass, in turn, until everyone has passed. */
  | "BATTLE";

export type CondottierePlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  /** The hand. The table shows only your own. */
  hand?: Card[];
  /** Cards played into this battle. */
  line?: Card[];
  passed?: boolean;
  /** Regions controlled, by index. */
  regions?: number[];
  isBot: boolean;
};

export type BattleResult = {
  region: number;
  winner?: string;
  totals: { email: string; strength: number }[];
};

export type CondottierePublicGameState = {
  id: string;
  game: string;
  players: CondottierePlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  phase: Phase;
  /** Who holds the Condottiere token and chooses battlefields. */
  condottiere: string;
  battlefield?: number;
  /** Where the Pope sits: no battle there. */
  pope?: number;
  /** The season in force in the current battle, from the last Spring or Winter played. */
  season?: Season;
  deckCount: number;
  /** Regions to win in all, and adjacent. */
  winTotal: number;
  winAdjacent: number;
  lastBattle?: BattleResult;
  lastMove?: {
    type: "choose" | "play" | "pass" | "redeal";
    email: string;
    card?: Card;
    region?: number;
  };
  turn: number;
  winner?: string;
  draw?: boolean;
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type CondottierePrivateGameState = {
  /** Absent once empty: the database drops empty arrays. */
  deck?: Card[];
  discard?: Card[];
  log?: LogEntry[];
};

export type CondottiereGameState = GenericGameState<CondottierePlayerState> & {
  public: CondottierePublicGameState;
  private: CondottierePrivateGameState;
};

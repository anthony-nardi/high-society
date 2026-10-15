import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  Notification,
} from "../../shared/types";

export type HighSocietyPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  moneyCards: string[];
  statusCards?: string[]; // Realtime Database return nothing if array is empty
  currentBid?: string[]; // Realtime Database return nothing if array is empty
  hasPassed: boolean;
  isBot: boolean;
};

export type PublicGameState = {
  id: string;
  game: string;
  players: HighSocietyPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  currentStatusCard: string;
  remainingCards: number;
  notification?: Notification;
  /** Set when a player starts a rematch after this game ends. */
  nextLobbyUID?: string;
  /** Full event log, only present once the game is over. */
  log?: LogEntry[];
};

export type LogEntry = {
  timestamp: number;
  title: string;
  message?: string;
};

export type PrivateGameState = {
  deck: string[];
  /** Every event of the game; published to `public.log` when it ends. */
  log?: LogEntry[];
};

export type HighSocietyGameState = GenericGameState<HighSocietyPlayerState> & {
  public: PublicGameState;
  private: PrivateGameState;
};

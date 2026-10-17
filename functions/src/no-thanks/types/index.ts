import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  Notification,
} from "../../shared/types";
import { LogEntry } from "../../shared/types";

export type NoThanksPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  cards?: number[];
  chips: number;
  isBot: boolean;
};

export type NoThanksPublicGameState = {
  id: string;
  game: string;
  players: NoThanksPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  activeCard: number | null;
  chipsPlaced: number;
  remainingCards: number;
  notification?: Notification;
  /** Set when a player starts a rematch after this game ends. */
  nextLobbyUID?: string;
  /** Full event log, only present once the game is over. */
  log?: LogEntry[];
};

export type NoThanksPrivateGameState = {
  deck: number[];
  /** Every event of the game; published to `public.log` when it ends. */
  log?: LogEntry[];
};

export type NoThanksGameState = GenericGameState<NoThanksPlayerState> & {
  public: NoThanksPublicGameState;
  private: NoThanksPrivateGameState;
};

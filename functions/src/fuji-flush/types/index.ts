import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type FujiFlushPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  isBot: boolean;
  /** Cards in hand, 2 to 20. Public, hidden by the table. Absent when empty. */
  hand?: number[];
  /** The card lying in front of the player, if any. */
  played?: number;
  /** The turn on which that card was played. */
  playedOn?: number;
  /** Cards pushed through so far. */
  pushed: number;
  /** Cards flushed down the drain so far. */
  flushed: number;
};

export type Flush = { email: string; card: number; value: number };

/** The last card played and what it did. */
export type LastPlay = {
  email: string;
  card: number;
  /** The card's value on the table: its number times the cards of that number. */
  value: number;
  turn: number;
  /** Players whose matching cards it joined. */
  joined?: string[];
  flushed?: Flush[];
};

/** The last card (or team of cards) pushed through. */
export type LastPush = {
  email: string;
  card: number;
  /** Everyone whose card went with it, the pusher first. */
  members: string[];
  turn: number;
};

export type FujiFlushPublicGameState = {
  id: string;
  game: string;
  players: FujiFlushPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Cards played so far. */
  turn: number;
  deckCount: number;
  discardCount: number;
  lastPlay?: LastPlay;
  lastPush?: LastPush;
  /** Set once the game is over. Several when a team pushed its last cards through together. */
  winners?: string[];
  winner?: string;
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type FujiFlushPrivateGameState = {
  /** Absent once empty: the database drops empty arrays. */
  deck?: number[];
  discard?: number[];
  log?: LogEntry[];
};

export type FujiFlushGameState = GenericGameState<FujiFlushPlayerState> & {
  public: FujiFlushPublicGameState;
  private: FujiFlushPrivateGameState;
};

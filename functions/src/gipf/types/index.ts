import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Side = "WHITE" | "BLACK";
export type Coord = string;

export type Phase =
  /** Push a piece in from an outer dot. */
  | "MOVE"
  /** `removing` must choose which of their intersecting rows to take. */
  | "REMOVE_ROW";

export type GipfPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  side: Side;
  /** Pieces still to bring in. Reaching zero when you must move loses. */
  reserve: number;
  /** Opponent pieces taken for good. */
  captured: number;
  isBot: boolean;
};

export type GipfPublicGameState = {
  id: string;
  game: string;
  players: GipfPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Pieces on the 37 spots. Empty spots are absent. */
  pieces?: { [coord: Coord]: Side };
  phase: Phase;
  /** Who is choosing a row right now. */
  removing?: string;
  /** Who pushed last: their rows go first, and play resumes after them. */
  mover?: string;
  /** The last push and removal, for the table to animate. */
  lastMove?: {
    /** The dot the piece came in from and the spot it landed on. */
    from?: Coord;
    to?: Coord;
    /** Spots now holding pieces that were pushed one step along the line. */
    shifted?: Coord[];
    /** Pieces taken off in the latest row removal, and their colours. */
    removed?: Coord[];
    removedColours?: Side[];
  };
  turn: number;
  winner?: string;
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type GipfPrivateGameState = {
  log?: LogEntry[];
};

export type GipfGameState = GenericGameState<GipfPlayerState> & {
  public: GipfPublicGameState;
  private: GipfPrivateGameState;
};

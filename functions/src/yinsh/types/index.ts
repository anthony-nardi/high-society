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
  /** Players alternate placing their five rings. */
  | "PLACE_RINGS"
  /** Pick one of your rings and move it. */
  | "MOVE_RING"
  /** `removing` must take a row of five of their markers off. */
  | "REMOVE_ROW"
  /** `removing` must take one of their rings off, scoring it. */
  | "REMOVE_RING";

export type YinshPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  side: Side;
  /** Rings removed from the board after rows: three wins. */
  scored: number;
  isBot: boolean;
};

export type YinshPublicGameState = {
  id: string;
  game: string;
  players: YinshPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  rings?: { [coord: Coord]: Side };
  markers?: { [coord: Coord]: Side };
  /** Markers still in the pool, from 51. */
  pool: number;
  phase: Phase;
  /** Who is resolving rows and rings right now; may differ from the mover. */
  removing?: string;
  /** Who moved last, so rows are resolved for them first and play resumes after them. */
  mover?: string;
  /** The ring picked up this turn, while choosing where it lands. */
  lastMove?: {
    from?: Coord;
    to?: Coord;
    flipped?: Coord[];
    /** Markers taken off in the latest row removal, and whose they were. */
    removed?: Coord[];
    removedBy?: Side;
    /** The ring scored after that row. */
    removedRing?: Coord;
  };
  turn: number;
  winner?: string;
  /** Set when the markers ran out with equal scores. */
  draw?: boolean;
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type YinshPrivateGameState = {
  log?: LogEntry[];
};

export type YinshGameState = GenericGameState<YinshPlayerState> & {
  public: YinshPublicGameState;
  private: YinshPrivateGameState;
};

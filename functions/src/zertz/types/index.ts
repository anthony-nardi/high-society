import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export const COLOURS = ["WHITE", "GRAY", "BLACK"] as const;
export type Colour = (typeof COLOURS)[number];

/** Marbles by colour; zero entries omitted so the database keeps the object. */
export type MarbleCounts = { [colour in Colour]?: number };

/** "x,y" on the skewed hex grid; see helpers/board.ts. */
export type Coord = string;

export type Phase =
  /** Place a marble from the pool, or capture if a capture is available. */
  | "MOVE"
  /** A marble was placed; a free ring must now be removed. */
  | "REMOVE_RING"
  /** Mid-capture: the marble at `capturingAt` must keep jumping. */
  | "CONTINUE_CAPTURE";

export type ZertzPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  captured?: MarbleCounts;
  isBot: boolean;
};

export type ZertzPublicGameState = {
  id: string;
  game: string;
  players: ZertzPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Rings still on the table. */
  rings: Coord[];
  /** Marbles on rings. */
  marbles?: { [coord: Coord]: Colour };
  pool: MarbleCounts;
  phase: Phase;
  /** During CONTINUE_CAPTURE, the marble that must jump again. */
  capturingAt?: Coord;
  /** The last move, for the table to animate. */
  lastMove?: {
    type: "place" | "remove" | "capture";
    from?: Coord;
    to?: Coord;
    colour?: Colour;
  };
  turn: number;
  winner?: string;
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type ZertzPrivateGameState = {
  log?: LogEntry[];
};

export type ZertzGameState = GenericGameState<ZertzPlayerState> & {
  public: ZertzPublicGameState;
  private: ZertzPrivateGameState;
};

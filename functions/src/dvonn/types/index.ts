import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Side = "WHITE" | "BLACK";
/** What a piece looks like from above: a player's colour or the red DVONN piece. */
export type Piece = Side | "DVONN";
export type Coord = string;

export type Phase =
  /** All 49 pieces go down one at a time, DVONN pieces first. */
  | "PLACE"
  /** Stacks move; anything cut off from the DVONN pieces is lost. */
  | "MOVE";

export type DvonnPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  side: Side;
  /** Own pieces still to place. */
  pieces: number;
  /** DVONN pieces still to place: white starts with two, black with one. */
  dvonn: number;
  isBot: boolean;
};

export type DvonnPublicGameState = {
  id: string;
  game: string;
  players: DvonnPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Stacks by space, bottom piece first. Empty spaces are absent. */
  stacks?: { [coord: Coord]: Piece[] };
  phase: Phase;
  /** The last placement or move, for the table to animate. */
  lastMove?: {
    placed?: Coord;
    from?: Coord;
    to?: Coord;
    /** Stacks lost after the move, with what was on top. */
    removed?: Coord[];
    removedTops?: Piece[];
  };
  turn: number;
  winner?: string;
  /** Set when both stacks are equally tall at the end. */
  draw?: boolean;
  /** Final heights, written at game over. */
  scores?: { WHITE: number; BLACK: number };
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type DvonnPrivateGameState = {
  log?: LogEntry[];
};

export type DvonnGameState = GenericGameState<DvonnPlayerState> & {
  public: DvonnPublicGameState;
  private: DvonnPrivateGameState;
};

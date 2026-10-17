import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Colour = "RED" | "BLUE" | "GREEN" | "BLACK" | "IVORY";
/** A colour, or one of the three white jokers that stand for any colour. */
export type Piece = Colour | "JOKER";
export type Coord = string;

export type LyngkPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  /** Up to two colours claimed so far. */
  colours?: Colour[];
  /** Stacks of five taken off the board. */
  scored: number;
  /** One claim per turn, before the move. */
  claimedThisTurn?: boolean;
  isBot: boolean;
};

/** Score with its tie-breaks: fives, then fours, threes, twos and singles controlled on the board. */
export type LyngkScore = [number, number, number, number, number];

export type LyngkPublicGameState = {
  id: string;
  game: string;
  players: LyngkPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Stacks by spot, bottom piece first. Empty spots are absent. */
  stacks?: { [coord: Coord]: Piece[] };
  /** The last turn, for the table to animate. */
  lastMove?: {
    /** The spots the moving stack went through: from, LYNGK links, landing. */
    path?: Coord[];
    /** A completed stack taken off, with its pieces. */
    removed?: Coord;
    removedPieces?: Piece[];
    claimed?: Colour;
  };
  turn: number;
  winner?: string;
  draw?: boolean;
  /** Final scores by email, written at game over. */
  scores?: { [email: string]: LyngkScore };
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type LyngkPrivateGameState = {
  log?: LogEntry[];
};

export type LyngkGameState = GenericGameState<LyngkPlayerState> & {
  public: LyngkPublicGameState;
  private: LyngkPrivateGameState;
};

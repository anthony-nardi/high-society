import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

/** Red joins the top and bottom borders, Black the left and right. */
export type Side = "RED" | "BLACK";

export type TwixtPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  side: Side;
  isBot: boolean;
};

/** A link between two pegs, each a hole index; smaller first. */
export type Link = [number, number];

export type TwixtPublicGameState = {
  id: string;
  game: string;
  players: TwixtPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Pegs by hole index. Absent while empty. */
  pegs?: { [hole: string]: Side };
  /** Links on the board. Absent while empty. */
  links?: Link[];
  /** Pegs placed so far; the swap is offered after the first. */
  moves: number;
  /** Whether the second player has already been offered the swap. */
  swapOffered: boolean;
  lastMove?: {
    type: "peg" | "swap" | "unlink";
    email: string;
    hole?: number;
    /** Links added by the peg. */
    added?: Link[];
    link?: Link;
  };
  turn: number;
  winner?: string;
  draw?: boolean;
  /** The pegs of the winning chain, border to border. */
  winningPath?: number[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type TwixtPrivateGameState = {
  log?: LogEntry[];
};

export type TwixtGameState = GenericGameState<TwixtPlayerState> & {
  public: TwixtPublicGameState;
  private: TwixtPrivateGameState;
};

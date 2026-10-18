import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";
import type { Terrain } from "../helpers/map";

export type { Terrain };

export type Colour = "RED" | "BLUE" | "YELLOW" | "GREEN" | "BLACK";

/** Huts in a territory, by colour. Absent colours hold none. */
export type Huts = { [colour in Colour]?: number };

export type ClansPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  /** The secret clan. Public state, hidden by the table until the end. */
  colour: Colour;
  /** Village chips taken: a point each at the end. */
  chips: number;
  isBot: boolean;
};

export type Village = {
  territory: number;
  terrain: Terrain;
  founder: string;
  epoch: number;
  /** Huts that scored, after any strife. */
  huts: Huts;
  /** Colours that scored, in colour order. */
  colours: Colour[];
  /** Points each scoring colour received, bonus included. */
  points: number;
  bonus: number;
  /** All five colours were present: single huts were driven out. */
  strife: boolean;
  /** Founded on the epoch's forbidden terrain: worth nothing. */
  destroyed: boolean;
};

export type ClansPublicGameState = {
  id: string;
  game: string;
  players: ClansPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Occupied territories only, by index. */
  huts?: { [territory: string]: Huts };
  /** Points per colour on the track. */
  scores: { [colour in Colour]: number };
  /** Villages founded so far, oldest first. Absent until the first. */
  villages?: Village[];
  lastMove?: {
    email: string;
    from: number;
    to: number;
    /** Territories that became villages on this move. */
    founded?: number[];
  };
  turn: number;
  winner?: string;
  draw?: boolean;
  /** Final totals, revealed at the end. */
  results?: {
    email: string;
    colour: Colour;
    track: number;
    chips: number;
    total: number;
  }[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type ClansPrivateGameState = {
  log?: LogEntry[];
};

export type ClansGameState = GenericGameState<ClansPlayerState> & {
  public: ClansPublicGameState;
  private: ClansPrivateGameState;
};

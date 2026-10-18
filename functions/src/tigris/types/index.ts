import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";
import type { Colour, Leader, Tile } from "../helpers/board";

export type { Colour, Leader, Tile };

export type Dynasty = "ARCHER" | "BULL" | "LION" | "POT";

export type Phase =
  /** The turn player chooses an action. */
  | "ACTION"
  /** Several wars at once: the turn player picks which to fight first. */
  | "WAR_CHOICE"
  /** A revolt or war: attacker then defender commit tiles from hand. */
  | "CONFLICT"
  /** A 2x2 square was completed: the turn player may build a monument. */
  | "MONUMENT"
  /** A trader's kingdom holds several treasures: its owner picks one to leave. */
  | "TREASURE";

export type Points = { [colour in Colour]: number };

export type TigrisPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  isBot: boolean;
  dynasty: Dynasty;
  /** Tiles behind the screen. Public, hidden by the table. Absent when empty. */
  hand?: Colour[];
  catastrophes: number;
  points: Points;
  treasures: number;
};

export type Conflict = {
  kind: "REVOLT" | "WAR";
  colour: Colour;
  attacker: string;
  defender: string;
  attackerCell: string;
  defenderCell: string;
  /** Strength on the board: adjacent temples in a revolt, supporters in a war. */
  attackerBase: number;
  defenderBase: number;
  attackerCommit?: number;
  defenderCommit?: number;
  /** Whose commitment is awaited. */
  stage: "ATTACKER" | "DEFENDER";
};

export type ConflictResult = Conflict & {
  winner: string;
  loser: string;
  /** Supporters removed from the board (war only). */
  removed: number;
  /** Victory points the winner took. */
  gained: number;
  turn: number;
};

export type Monument = { cell: string; colours: [Colour, Colour] };

export type LastAction = {
  email: string;
  type:
    | "TILE"
    | "LEADER"
    | "WITHDRAW"
    | "CATASTROPHE"
    | "REPLACE"
    | "MONUMENT"
    | "TREASURE"
    | "END";
  cell?: string;
  colour?: Colour;
  /** Points the action earned its player, if any. */
  points?: number;
  turn: number;
};

export type Result = {
  email: string;
  /** Spheres lowest first, treasures already spent. */
  spheres: number[];
  treasures: number;
};

export type TigrisPublicGameState = {
  id: string;
  game: string;
  players: TigrisPlayerState[];
  /** Who the table waits on: the turn player, or a defender or trader mid-action. */
  activePlayer: string;
  turnPlayer: string;
  startAt: string;
  status: GameStatus;
  phase: Phase;
  actionsLeft: number;
  turn: number;
  tiles?: { [cell: string]: Tile };
  leaders?: { [cell: string]: Leader };
  blocked?: string[];
  monuments?: Monument[];
  /** Monument colour pairs still in the box. */
  monumentsLeft?: [Colour, Colour][];
  bagCount: number;
  /** The uniting tile while its wars are fought. */
  unification?: string;
  warChoices?: Colour[];
  conflict?: Conflict;
  monumentOffer?: { squares: string[]; colour: Colour };
  treasureOffer?: { cells: string[]; owner: string };
  /** The tile placed by the current action, awaiting its monument check. */
  pending?: { cell?: string; monumentChecked?: boolean };
  lastConflict?: ConflictResult;
  lastAction?: LastAction;
  winner?: string;
  winners?: string[];
  results?: Result[];
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type TigrisPrivateGameState = {
  bag?: Colour[];
  log?: LogEntry[];
};

export type TigrisGameState = GenericGameState<TigrisPlayerState> & {
  public: TigrisPublicGameState;
  private: TigrisPrivateGameState;
};

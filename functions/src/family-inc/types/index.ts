import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export const CHIP_VALUES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

export type ChipValue = (typeof CHIP_VALUES)[number];

/** Chips by value. Zero entries are omitted so the database keeps the object. */
export type ChipCounts = { [value in ChipValue]?: number };

export type FamilyIncPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  score: number;
  diamonds: number;
  /** Chips in front of the player: drawn this turn, or stolen and not yet banked. */
  held?: ChipCounts;
  isBot: boolean;
};

export type TurnOutcome = "bust" | "diamond" | "fifty" | "stop";

export type FamilyIncPublicGameState = {
  id: string;
  game: string;
  players: FamilyIncPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  /** Face-down pile by value. Everyone can count what has left it. */
  pile: ChipCounts;
  /** Chips the active player has drawn this turn, in order. */
  drawnThisTurn?: ChipValue[];
  lastDraw?: ChipValue;
  /** How the previous turn ended, for the table to react to. */
  lastOutcome?: TurnOutcome;
  turn: number;
  winner?: string;
  notification?: Notification;
  /** Set when a player starts a rematch after this game ends. */
  nextLobbyUID?: string;
  /** Full event log, only present once the game is over. */
  log?: LogEntry[];
};

export type FamilyIncPrivateGameState = {
  log?: LogEntry[];
};

export type FamilyIncGameState = GenericGameState<FamilyIncPlayerState> & {
  public: FamilyIncPublicGameState;
  private: FamilyIncPrivateGameState;
};

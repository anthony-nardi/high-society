import {
  GameStatus,
  GenericGameState,
  GenericPlayerState,
  LogEntry,
  Notification,
} from "../../shared/types";

export type Master =
  | "RAINMAKER"
  | "PRIEST"
  | "YETI_WHISPERER"
  | "ASTROLOGER"
  | "DRAGONBREEDER"
  | "HEALER"
  | "FIREKEEPER";

export type Colour = "RED" | "BLUE" | "YELLOW" | "VIOLET";

export type Phase =
  /** Everyone places one master of each discipline, one at a time. */
  | "SETUP"
  /** Place, recruit or journey. */
  | "PLAY";

/** A village space: the master's owner, and whether a student sits on top. */
export type Space = { owner: string; student?: boolean };

export type Village = {
  /** Always present, so an empty village still survives a save: the database drops empty objects. */
  id: number;
  spaces?: { [type in Master]?: Space };
  /** A Stone of the Wise Men: no bridges left, nothing changes here again. */
  stone?: boolean;
};

export type ShangriLaPlayerState = GenericPlayerState & {
  email: string;
  lastActionAt: number;
  colour: Colour;
  /** Tiles left per discipline, from six each. */
  supply: { [type in Master]: number };
  /** Disciplines already placed in the setup. */
  placed?: Master[];
  isBot: boolean;
};

export type Arrival = {
  type: Master;
  owner: string;
  outcome: "master" | "student" | "returned" | "displaced";
};

export type ShangriLaPublicGameState = {
  id: string;
  game: string;
  players: ShangriLaPlayerState[];
  activePlayer: string;
  startAt: string;
  status: GameStatus;
  phase: Phase;
  villages: Village[];
  /** Unbroken bridges as village index pairs. */
  bridges?: [number, number][];
  turn: number;
  /** Players passed in a row because they had no action. */
  passes: number;
  lastMove?: {
    type: "setup" | "place" | "recruit" | "journey" | "pass";
    email: string;
    village?: number;
    to?: number;
    types?: Master[];
    arrivals?: Arrival[];
    /** Villages that received a stone. */
    stones?: number[];
  };
  winner?: string;
  draw?: boolean;
  scores?: { [email: string]: { masters: number; villages: number } };
  notification?: Notification;
  nextLobbyUID?: string;
  log?: LogEntry[];
};

export type ShangriLaPrivateGameState = {
  log?: LogEntry[];
};

export type ShangriLaGameState = GenericGameState<ShangriLaPlayerState> & {
  public: ShangriLaPublicGameState;
  private: ShangriLaPrivateGameState;
};
